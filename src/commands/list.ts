import type { CommandOptions } from '../types'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import tildify from 'tildify'
import { DEFAULT_EXTENSIONS_PATH } from '../constants'
import { ManifestManager } from '../manifest'

export async function listCommand(options: CommandOptions) {
  const manifest = new ManifestManager(options)
  const config = await manifest.readManifest()
  if (!config) {
    p.outro(c.red('no extensions found, aborting'))
    process.exit(1)
  }

  const path = options.path ?? DEFAULT_EXTENSIONS_PATH
  const lines: string[] = []
  Object.entries(config).forEach(([name, item]) => {
    const version = item.tag ?? item.branch ?? ''
    lines.push(c.reset(`${c.yellow(item.title)} ${c.dim('→')} ${c.reset(name)}${c.dim('@')}${c.reset(c.cyan(version))}`))
  })

  p.note(lines.join('\n'), `extensions installed in ${tildify(path)}`)
  p.outro(c.green('list completed'))
}
