import type { CommandOptions, ExtensionConfig, Manifest } from './types'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
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

    const extpath = this.options.path ?? DEFAULT_EXTENSIONS_PATH
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
    const extpath = this.options.path ?? DEFAULT_EXTENSIONS_PATH
    const filepath = join(extpath, 'manifest.json')
    await writeFile(filepath, JSON.stringify(manifest, null, 2), 'utf-8')
  }

  async readExtension(name: string): Promise<ExtensionConfig | undefined> {
    const manifest = await this.readManifest()
    if (!manifest)
      return

    const title: Record<string, string> = {}
    Object.entries(manifest).forEach(([name, config]) => {
      title[name] = config.title
    })

    const config = manifest[name] ?? manifest[title[name]]
    if (!config)
      return
    return config
  }

  async updateExtension(name: string, config: Partial<ExtensionConfig>) {
    const manifest = await this.readManifest() ?? {}
    manifest[name] = { ...manifest[name], ...config }
    await this.updateManifest(manifest)
  }

  async removeExtension(name: string) {
    const manifest = await this.readManifest() ?? {}
    delete manifest[name]
    await this.updateManifest(manifest)
  }
}
