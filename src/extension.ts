import type { ManifestManager } from './manifest'
import type { CommandOptions, ExtensionConfig, ExtensionPreference, GithubBranch, GithubTag } from './types'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
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
  private defaultBranch: string = ''

  constructor(manifest: ManifestManager, options: ExtensionOptions) {
    this.manifest = manifest
    this.options = options
    this.name = options.name
  }

  async install() {
    await this.download()
    await this.updateConfig()
    await this.runDevelop()
  }

  async uninstall() {
    const extpath = this.getPath(false)
    await rimraf(extpath)
    await this.removeConfig()
  }

  async update() {
    if (this.options.branch && !this.options.tag) {
      const result = await p.confirm({
        message: `the last installed version is a branch, do you want to reinstall it?`,
        initialValue: true,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('skipping'))
        return
      }
      return await this.install()
    }

    await this.detectTags()
    const index = this.tagList.findIndex(t => t.name === this.options.tag)
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

  private async updateConfig() {
    const ignore = [
      this.tag ? `**/${this.tag}/**` : undefined,
      this.branch ? `**/${this.branch}/**` : undefined,
    ].filter(Boolean) as string[]

    const dirs = await glob('*/', {
      cwd: this.getPath(false),
      dot: true,
      onlyDirectories: true,
      absolute: true,
      ignore,
    })

    for (const dir of dirs)
      await rimraf(dir)

    const filepath = join(this.getPath(), 'package.json')
    const data = JSON.parse(await readFile(filepath, 'utf-8'))

    await this.manifest.updateExtension(this.name, {
      title: data.title || data.name || this.name,
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
      devDependencies: data.devDependencies,
      optionalDependencies: data.optionalDependencies,
      peerDependencies: data.peerDependencies,
      tag: this.tag,
      branch: this.branch,
      commit: this.tagList.find(t => t.name === this.tag)?.commit ?? this.branchList.find(b => b.name === this.branch)?.commit,
    })
  }

  private async removeConfig() {
    await this.manifest.removeExtension(this.name)
  }

  private getPath(version: boolean = true) {
    const extpath = this.options.path ?? DEFAULT_EXTENSIONS_PATH
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
        p.outro(c.red('skipping'))
        return
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

    if (this.branch && this.branchList.find(b => b.name === this.branch))
      return

    this.branch = this.defaultBranch
    if (this.branchList.length > 1) {
      const result = await p.select({
        message: `select a branch for ${c.yellow(this.name)}`,
        options: this.branchList.map(b => ({
          label: b.name,
          value: b.name,
        })),
        initialValue: this.defaultBranch,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('skipping'))
        return
      }
      this.branch = result
    }
  }

  private async download() {
    const url = await this.getURL()

    const extpath = this.getPath()

    if (!this.options.yes && existsSync(extpath)) {
      const result = await p.confirm({
        message: `extension already exists, overwrite it?`,
        initialValue: false,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('skipping'))
        return
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

  private async runDevelop() {
    const extpath = this.getPath()
    const { agent } = await detect({ cwd: extpath }) || {}
    if (!agent) {
      console.warn('[rayext] Unknown packageManager:')
      return
    }

    const { command, args } = resolveCommand(agent, 'install', []) || {}
    if (!command) {
      console.warn('[rayext] Unknown packageManager command:')
      return
    }

    await x(command, args, {
      nodeOptions: {
        stdio: 'inherit',
        cwd: extpath,
        shell: true,
      },
    })

    const proc = x(command, ['ray', 'develop'], {
      nodeOptions: {
        stdio: 'pipe',
        cwd: extpath,
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
