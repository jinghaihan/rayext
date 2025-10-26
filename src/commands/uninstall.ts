import type { CommandOptions } from '../types'
import * as p from '@clack/prompts'
import c from 'ansis'
import { x } from 'tinyexec'
import { Extension } from '../extension'
import { ManifestManager } from '../manifest'
import { parseArgs, parseTag } from '../utils/parse'
import { commandInterceptor } from '../utils/process'

export async function uninstallCommand(options: CommandOptions) {
  const args = commandInterceptor()

  const manifest = new ManifestManager(options)
  const { data } = parseArgs(args)

  await Promise.all(data.map(async (i) => {
    const { name, tag } = parseTag(i)

    const extension = new Extension(manifest, {
      ...options,
      name,
      tag,
    })

    const config = await extension.readConfig()
    const title = config?.title || name

    const spinner = p.spinner()
    spinner.start(`uninstalling ${c.yellow(title)}`)
    await extension.uninstall()
    spinner.stop(`${c.green('✓')} uninstalled ${c.yellow(title)}`)
  }))

  p.log.success(c.green('uninstall completed'))
  p.outro(`now you can uninstall the extension from ${c.yellow('raycast')}`)

  x('open', ['raycast://'])
}
