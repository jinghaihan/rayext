import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { DEFAULT_EXTENSIONS_PATH } from '../constants'

export async function ensureExtensionsDir(path: string = DEFAULT_EXTENSIONS_PATH) {
  if (existsSync(path))
    return
  await mkdir(path, { recursive: true })
}
