import type { CommandOptions } from '../types'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { Extension } from '../extension'
import { ManifestManager } from '../manifest'
import { parseArgs, parseTag } from '../utils/parse'

export async function updateCommand(options: CommandOptions) {
  const args = process.argv.slice(3)

  const manifest = new ManifestManager(options)

  if (args.length) {
    const { data } = parseArgs(args)
    await Promise.all(data.map(async (i) => {
      const { name } = parseTag(i)
      const config = await manifest.readExtension(name)
      if (!config) {
        p.outro(c.red('no extension name found, aborting'))
        process.exit(1)
      }

      const extension = new Extension(manifest, {
        ...options,
        name,
        tag: config.tag,
        branch: config.branch,
      })
      await extension.update()
    }))
  }
  else {
    const data = await manifest.readManifest()
    if (!data) {
      p.outro(c.red('no extensions found, aborting'))
      process.exit(1)
    }

    for (const [name, config] of Object.entries(data)) {
      const extension = new Extension(manifest, {
        ...options,
        name,
        tag: config.tag,
        branch: config.branch,
      })
      await extension.update()
    }
  }

  p.outro(c.green(`update completed`))
}
