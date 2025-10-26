import type { CommandOptions, RangeMode } from './types'
import { homedir } from 'node:os'
import { join } from 'pathe'
import pkg from '../package.json'

export const NAME = pkg.name

export const VERSION = pkg.version

export const MODE_CHOICES = ['list', 'view', 'install', 'uninstall', 'update'] as const

export const MODE_ALIAS: Record<RangeMode, string[]> = {
  list: ['ls'],
  view: ['v', 'info', 'show'],
  install: ['i', 'add'],
  uninstall: ['un', 'u', 'remove', 'rm'],
  update: ['upgrade', 'up'],
}

export const DEFAULT_EXTENSIONS_PATH = join(homedir(), '.rayext')
export const DEFAULT_RETRIES = 5

export const DEFAULT_OPTIONS: Partial<CommandOptions> = {
  mode: 'list',
  retries: DEFAULT_RETRIES,
  yes: false,
}

export const DEV_SUCCESS_MESSAGE = 'built extension successfully'
