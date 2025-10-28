import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'

export function commandInterceptor(): string[] {
  const args = process.argv.slice(3)
  if (args.length === 0) {
    p.outro(c.yellow('no repository provided, aborting'))
    process.exit(1)
  }
  return args
}
