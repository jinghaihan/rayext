import type { CAC } from 'cac'
import type { CommandOptions, RangeMode } from './types'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { cac } from 'cac'
import { installCommand, listCommand, uninstallCommand, updateCommand, viewCommand } from './commands'
import { resolveConfig } from './config'
import { DEFAULT_RETRIES, MODE_ALIAS, MODE_CHOICES, NAME, VERSION } from './constants'
import { ensureExtensionsDir } from './utils/io'

try {
  const cli: CAC = cac(NAME)

  cli
    .command('[mode]', 'A decentralized extension manager for Raycast')
    .option('--retries', 'The number of retries when resolving extensions', { default: DEFAULT_RETRIES })
    .option('--token', 'The token to use for the GitHub API')
    .option('--yes', 'Skip prompt confirmation')
    .allowUnknownOptions()
    .action(async (mode: RangeMode, options: Partial<CommandOptions>) => {
      if (mode) {
        Object.entries(MODE_ALIAS).forEach(([command, value]) => {
          if (value.includes(mode))
            mode = command as RangeMode
        })

        if (!MODE_CHOICES.includes(mode)) {
          console.error(`Invalid mode: ${mode}. Please use one of the following: ${MODE_CHOICES.join(', ')}`)
          process.exit(1)
        }
        options.mode = mode
      }

      p.intro(`${c.yellow`${NAME} `}${c.dim`v${VERSION}`}`)

      const config = await resolveConfig(options)
      await ensureExtensionsDir(config.path)

      switch (config.mode) {
        case 'list':
          listCommand(config)
          break
        case 'view':
          viewCommand(config)
          break
        case 'install':
          installCommand(config)
          break
        case 'uninstall':
          uninstallCommand(config)
          break
        case 'update':
          updateCommand(config)
          break
      }
    })

  cli.help()
  cli.version(VERSION)
  cli.parse()
}
catch (error) {
  console.error(error)
  process.exit(1)
}
