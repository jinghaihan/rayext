import type { CommandOptions, ExtensionConfig, Manifest } from './types'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { join } from 'pathe'
import { DEFAULT_EXTENSIONS_PATH } from './constants'

export class ManifestManager {
  private options: CommandOptions

  private manifest: Manifest | undefined

  constructor(options: CommandOptions) {
    this.options = options
  }

  async readManifest(): Promise<Manifest | undefined> {
    if (this.manifest)
      return this.manifest

    const extpath = DEFAULT_EXTENSIONS_PATH
    const filepath = join(extpath, 'manifest.json')
    if (!existsSync(filepath))
      return

    try {
      const manifest = JSON.parse(await readFile(filepath, 'utf-8'))
      this.manifest = manifest
      return manifest
    }
    catch (error) {
      console.error(error)
    }
  }

  async updateManifest(manifest: Manifest) {
    this.manifest = manifest
    const extpath = DEFAULT_EXTENSIONS_PATH
    const filepath = join(extpath, 'manifest.json')
    await writeFile(filepath, JSON.stringify(manifest), 'utf-8')
  }

  async readExtension(name: string): Promise<ExtensionConfig | undefined> {
    const manifest = await this.readManifest()
    if (!manifest)
      return

    const keys: string[] = []
    for (const key of Object.keys(manifest)) {
      const config = manifest[key]
      if (key === name || config.repository === name)
        keys.push(key)
    }

    if (keys.length > 1) {
      const result = await p.select({
        message: `multiple extensions found, please select one`,
        options: keys.map(key => ({
          label: key,
          value: key,
        })),
        initialValue: name,
      })
      if (!result || p.isCancel(result)) {
        p.outro(c.red('aborting'))
        process.exit(1)
      }
      name = result
    }

    const config = manifest[name]
    if (!config)
      return
    return config
  }

  async removeExtension(name: string) {
    const manifest = await this.readManifest() ?? {}
    const keys: string[] = []
    for (const key of Object.keys(manifest)) {
      const config = manifest[key]
      if (config.repository === name)
        keys.push(key)
    }
    for (const key of keys)
      delete manifest[key]
    await this.updateManifest(manifest)
  }

  async updateExtension(name: string, config: ExtensionConfig) {
    const manifest = await this.readManifest() ?? {}
    manifest[name] = config
    await this.updateManifest(manifest)
  }
}
