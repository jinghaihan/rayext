import type { CommandOptions } from '../types'
import * as p from '@clack/prompts'
import c from 'ansis'
import { Extension } from '../extension'
import { ManifestManager } from '../manifest'
import { parseArgs, parseTag } from '../utils/parse'
import { commandInterceptor } from '../utils/process'

export async function installCommand(options: CommandOptions) {
  const args = commandInterceptor()

  const manifest = new ManifestManager(options)
  const { data } = parseArgs(args)

  for (const i of data) {
    const { name, tag } = parseTag(i)
    const extension = new Extension(manifest, {
      ...options,
      name,
      tag,
    })
    await extension.install()
  }

  p.outro(c.green(`install completed`))
}
