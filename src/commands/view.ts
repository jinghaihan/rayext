import type { CommandOptions } from '../types'
import * as p from '@clack/prompts'
import c from 'ansis'
import { ManifestManager } from '../manifest'
import { parseArgs, parseTag } from '../utils/parse'
import { commandInterceptor } from '../utils/process'

export async function viewCommand(options: CommandOptions) {
  const args = commandInterceptor()

  const manifest = new ManifestManager(options)
  const { data } = parseArgs(args)
  const [ext] = data
  const { name } = parseTag(ext)

  const config = await manifest.readExtension(name)
  const title = config?.title ?? name
  const version = config?.tag ?? config?.branch

  const deps = Object.keys(config?.dependencies ?? {})

  const headers: string[] = [
    `${c.bold(title)}@${c.cyan(version)}`,
    config?.license ? c.green(config.license.toUpperCase()) : undefined,
    deps.length > 0 ? `${c.bold('deps')}: ${c.yellow(deps.length)}` : undefined,
    config?.commands ? `${c.bold('cmds')}: ${c.yellow(config.commands.length)}` : undefined,
    config?.preferences ? `${c.bold('preferences')}: ${c.yellow(config.preferences.length)}` : undefined,
  ].filter(Boolean) as string[]

  const content: string[] = []

  if (config?.url || config?.repository) {
    const url = config.url || `https://github.com/${config.repository}`
    content.push(c.reset(`[>] ${c.bold('github')}: ${c.reset(c.cyan(url))}`))
  }

  if (config?.description) {
    content.push(c.reset(`[i] ${c.bold('description')}: ${c.reset(c.cyan(config.description))}`))
    content.push('')
  }

  if (config?.author) {
    if (typeof config.author === 'string') {
      content.push(c.reset(`[@] ${c.bold('author')}: ${c.reset(c.cyan(config.author))}`))
    }
    else {
      const { name, email, url } = config.author
      if (name)
        content.push(c.reset(`[@] ${c.bold('author')}: ${c.reset(c.cyan(name))}`))
      if (email)
        content.push(c.reset(`[*] ${c.bold('email')}: ${c.reset(c.cyan(email))}`))
      if (url)
        content.push(c.reset(`[>] ${c.bold('url')}: ${c.reset(c.cyan(url))}`))
    }

    if (config.contributors && config.contributors.length > 0)
      content.push(c.reset(`[+] ${c.bold('contributor')}: ${config.contributors.map(i => c.reset(c.cyan(i))).join(', ')}`))

    if (config.categories && config.categories.length > 0)
      content.push(c.reset(`[#] ${c.bold('categories')}: ${config.categories.map(i => c.reset(c.cyan(i))).join(', ')}`))

    content.push('')

    if (config.commands && config.commands.length) {
      content.push(c.reset(`[!] ${c.bold('commands')}:`))
      config.commands.forEach((cmd) => {
        content.push(c.reset(` · ${cmd.title ?? cmd.name}: ${c.cyan(cmd.description)}`))
      })
      content.push('')
    }

    if (config.preferences && config.preferences.length) {
      content.push(c.reset(`[~] ${c.bold('preferences')}:`))
      config.preferences.forEach((pref) => {
        content.push(c.reset(` · ${pref.label ?? pref.title ?? pref.name}: ${c.cyan(pref.description)}`))
      })
      content.push('')
    }

    if (deps.length > 0) {
      content.push(c.reset(`[^] ${c.bold('dependencies')}:`))
      deps.forEach((dep) => {
        content.push(c.reset(` · ${dep}: ${c.cyan(config.dependencies?.[dep] ?? 'unknown')}`))
      })
      content.push('')
    }
  }

  p.note(content.join('\n'), c.reset(headers.join(' | ')))
}
