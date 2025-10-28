import type { Agent } from 'package-manager-detector'
import type { ManifestManager } from './manifest'
import type { CommandOptions, ExtensionConfig, ExtensionPreference, GithubBranch, GithubTag } from './types'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { toArray } from '@antfu/utils'
import * as p from '@clack/prompts'
import Zip from 'adm-zip'
import c from 'ansis'
import { ofetch } from 'ofetch'
import { detect, resolveCommand } from 'package-manager-detector'
import { join } from 'pathe'
import { rimraf } from 'rimraf'
import { x } from 'tinyexec'
import { glob } from 'tinyglobby'
import { DEFAULT_EXTENSIONS_PATH, DEV_SUCCESS_MESSAGE } from './constants'
import { getRepoBranches, getRepoDefaultBranch, getRepoTags } from './utils/git'

interface ExtensionOptions extends CommandOptions {
  name: string
  tag?: string
  branch?: string
}

export class Extension {
  private manifest: ManifestManager
  private options: ExtensionOptions

  private name: string
  private tag?: string
  private branch?: string

  private tagList: GithubTag[] = []
  private branchList: GithubBranch[] = []
  private defaultBranch?: string

  constructor(manifest: ManifestManager, options: ExtensionOptions) {
    this.manifest = manifest
    this.options = options
    this.name = options.name
  }

  getKey(path?: string) {
    return path ? `${this.name}${path}` : this.name
  }

  private getPackages() {
    return this.options.package ? toArray(this.options.package) : []
  }

  async install(url?: string) {
    const packages = this.getPackages()

    await this.download(url)

    await this.cleanup()

    const extpath = this.getExtpath()
    if (packages.length) {
      for (const path of packages)
        await this.updateConfig(join(extpath, path))
    }
    else {
      await this.updateConfig()
    }

    await this.runInstall()

    if (packages.length) {
      for (const path of packages)
        await this.runDev(join(extpath, path))
    }
    else {
      await this.runDev()
    }
  }

  async uninstall() {
    const manifest = await this.manifest.readManifest()
    if (!manifest) {
      p.log.error(c.red('no manifest found, aborting'))
      process.exit(1)
    }

    const extensions: ExtensionConfig[] = []
    for (const key of Object.keys(manifest)) {
      const config = manifest[key]
      if (config.repository === this.name)
        extensions.push(config)
    }

    if (extensions.length > 1) {
      const result = p.confirm({
        message: `${extensions.map(i => i.title).join(', ')} will be uninstalled, continue?`,
        initialValue: false,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
    }

    const extpath = this.getExtpath(false)
    await rimraf(extpath)
    await this.removeConfig()
  }

  async update() {
    const reinstall = async (message: string) => {
      const result = await p.confirm({
        message,
        initialValue: true,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
      return await this.install()
    }

    // last installed version is a branch
    if (this.options.branch && !this.options.tag) {
      const config = await this.manifest.readExtension(this.name)
      if (!config)
        return await reinstall('can\'t find the extension in the manifest, do you want to reinstall it?')

      await this.detectBranches()
      const branchCommit = this.branchList.find(i => i.name === this.options.branch)?.commit
      if (!branchCommit)
        return await reinstall('can\'t find the branch at the remote, do you want to reinstall it?')

      // the commit of the last installed version is not the same as the commit of the branch
      if (config.commit?.sha !== branchCommit.sha) {
        return await this.install(`https://api.github.com/repos/${this.name}/zipball/${this.options.branch}`)
      }
      else {
        p.log.info(`${c.green('✓')} already on the latest branch`)
        return
      }
    }

    // last installed version is a tag
    await this.detectTags()
    const index = this.tagList.findIndex(t => t.name === this.options.tag)

    // not the latest tag
    if (index !== 0 && this.tagList.length) {
      this.tag = this.tagList[0].name
      p.log.info(`updating to: ${c.yellow(this.tag)}`)
      await this.install()
      p.log.success(`${c.green('✓')} updated to: ${c.yellow(this.tag)}`)
    }
    else {
      p.log.info(`${c.green('✓')} already on the latest tag`)
    }
  }

  async readConfig(): Promise<ExtensionConfig | undefined> {
    const config = await this.manifest.readExtension(this.name)
    if (!config)
      return
    return config
  }

  private async cleanup() {
    const spinner = p.spinner()
    spinner.start(`cleaning up`)

    const ignore = [
      this.tag ? `**/${this.tag}/**` : undefined,
      this.branch ? `**/${this.branch}/**` : undefined,
    ].filter(Boolean) as string[]

    const dirs = await glob('*/', {
      cwd: this.getExtpath(false),
      dot: true,
      onlyDirectories: true,
      absolute: true,
      ignore,
    })

    for (const dir of dirs)
      await rimraf(dir)

    spinner.stop(`${c.green('✓')} cleaned up`)
  }

  private async updateConfig(cwd: string = this.getExtpath()) {
    const filepath = join(cwd, 'package.json')
    const data = JSON.parse(await readFile(filepath, 'utf-8'))
    const path = cwd.replace(this.getExtpath(), '')

    await this.manifest.updateExtension(this.getKey(path), {
      repository: this.name,
      package: path,
      title: data.title || data.name || this.name,
      url: `https://github.com/${this.name}`,
      description: data.description,
      license: data.license,
      author: data.author,
      categories: data.categories,
      contributors: data.contributors,
      commands: data.commands,
      preferences: data.preferences?.map((i: ExtensionPreference) => {
        return {
          name: i.name,
          type: i.type,
          default: i.default,
          required: i.required ?? false,
          title: i.title,
          label: i.label,
          description: i.description,
        }
      }),
      dependencies: data.dependencies,
      tag: this.tag,
      branch: this.branch,
      commit: this.tagList.find(t => t.name === this.tag)?.commit ?? this.branchList.find(b => b.name === this.branch)?.commit,
    })
  }

  private async removeConfig() {
    await this.manifest.removeExtension(this.name)
  }

  private getExtpath(version: boolean = true) {
    const extpath = DEFAULT_EXTENSIONS_PATH
    if (version)
      return join(extpath, this.name, this.tag ? `${this.tag}` : `${this.branch}`)
    return join(extpath, this.name)
  }

  private async getURL() {
    await this.detectTags()
    const matched = this.tagList.find(t => t.name === this.tag)
    if (matched)
      return matched.zipball_url

    await this.detectBranches()
    return `https://api.github.com/repos/${this.name}/zipball/${this.branch}`
  }

  private async detectTags() {
    if (this.tagList.length || this.tag)
      return

    const spinner = p.spinner()
    spinner.start(`fetching tags`)
    this.tagList = await getRepoTags(this.name, this.options)
    spinner.stop(`${c.green('✓')} tags fetched`)

    if ((this.tag && !this.tagList.find(i => i.name === this.tag)) || (!this.tag && this.tagList.length > 0)) {
      const message = this.tag
        ? `${c.yellow(this.name)}@${c.dim(this.tag)} not found, please select a tag`
        : `select a tag for ${c.yellow(this.name)}`

      const result = await p.select({
        message,
        options: this.tagList.map(t => ({
          label: t.name,
          value: t.name,
        })),
        initialValue: this.tagList[0]?.name,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
      this.tag = result
    }
  }

  private async detectBranches() {
    if (this.branchList.length || this.branch || this.defaultBranch)
      return

    const spinner = p.spinner()
    spinner.start(`fetching branches`)
    this.branchList = await getRepoBranches(this.name, this.options)

    spinner.message(`fetching default branch`)
    this.defaultBranch = await getRepoDefaultBranch(this.name, this.options)
    spinner.stop(`${c.green('✓')} branches fetched`)

    if (this.branchList.find(b => b.name === this.options.branch))
      this.branch = this.options.branch
    else
      this.branch = this.defaultBranch

    if (this.branchList.length > 1) {
      const result = await p.select({
        message: `select a branch for ${c.yellow(this.name)}`,
        options: this.branchList.map(b => ({
          label: b.name,
          value: b.name,
        })),
        initialValue: this.branch,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
      this.branch = result
    }
  }

  private async download(url?: string) {
    url = url || await this.getURL()
    const extpath = this.getExtpath()

    if (!this.options.yes && existsSync(extpath)) {
      const result = await p.confirm({
        message: `extension already exists, overwrite it?`,
        initialValue: false,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
      await rimraf(extpath)
    }

    const spinner = p.spinner()
    spinner.start(`downloading`)
    const blob = await ofetch(url)

    spinner.message(`extracting`)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const zip = new Zip(buffer)

    for (const entry of zip.getEntries()) {
      const entryName = entry.entryName.split('/').slice(1).join('/')
      const destPath = join(extpath, entryName)
      if (entry.isDirectory)
        await mkdir(destPath, { recursive: true })
      else
        await writeFile(destPath, entry.getData())
    }

    spinner.stop(`${c.green('✓')} downloaded`)
  }

  private async ensurePackageManager(cwd: string, agent: string) {
    try {
      await x(agent, ['-v'], {
        nodeOptions: {
          stdio: 'inherit',
          cwd,
          shell: true,
        },
      })
    }
    catch {
      const result = await p.confirm({
        message: `${agent} not found, install it?`,
        initialValue: true,
      })
      if (!result || p.isCancel(result)) {
        p.log.info(c.red('aborting'))
        process.exit(1)
      }
      await x('npm', ['install', agent], {
        nodeOptions: {
          stdio: 'inherit',
          cwd,
          shell: true,
        },
      })
    }
  }

  private async detectPackageManager(): Promise<Agent | undefined> {
    const extpath = this.getExtpath()
    const { agent } = await detect({ cwd: extpath }) || {}
    if (!agent) {
      console.warn('[rayext] Unknown packageManager:')
      return
    }
    return agent
  }

  private async runInstall() {
    const agent = await this.detectPackageManager()
    if (!agent)
      return

    const extpath = this.getExtpath()
    const { command, args } = resolveCommand(agent, 'install', []) || {}
    if (!command) {
      console.warn('[rayext] Unknown packageManager command:')
      return
    }
    await this.ensurePackageManager(extpath, command)

    await x(command, args, {
      nodeOptions: {
        stdio: 'inherit',
        cwd: extpath,
        shell: true,
      },
    })
  }

  private async runDev(cwd: string = this.getExtpath()) {
    const agent = await this.detectPackageManager()
    if (!agent)
      return

    const { command } = resolveCommand(agent, 'install', []) || {}
    if (!command) {
      console.warn('[rayext] Unknown packageManager command:')
      return
    }

    const proc = x(command, ['ray', 'develop'], {
      nodeOptions: {
        stdio: 'pipe',
        cwd,
        shell: true,
        detached: true,
      },
    })

    for await (const line of proc) {
      // eslint-disable-next-line no-console
      console.log(line)
      if (line.includes(DEV_SUCCESS_MESSAGE))
        process.kill(-proc.pid!, 'SIGTERM')
    }
  }
}
