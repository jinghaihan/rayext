const BOOLEAN_FLAGS = new Set<string>([])

const BOOLEAN_SHORT_FLAGS = new Set<string>([])

export function parseArgs(args: string[]): { options: Record<string, unknown>, data: string[] } {
  const options: Record<string, unknown> = {}
  const data: string[] = []
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === '--') {
      data.push(...args.slice(i + 1))
      break
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2)

      if (key.startsWith('no-')) {
        options[key.slice(3)] = false
        i++
      }
      else if (BOOLEAN_FLAGS.has(key)) {
        options[key] = true
        i++
      }
      else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[i + 1]
        i += 2
      }
      else {
        options[key] = true
        i++
      }
    }
    else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1)

      if (BOOLEAN_SHORT_FLAGS.has(key)) {
        options[key] = true
        i++
      }
      else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[i + 1]
        i += 2
      }
      else {
        options[key] = true
        i++
      }
    }
    else {
      data.push(arg)
      i++
    }
  }

  return { options, data }
}

export function parseTag(spec: string): { name: string, tag?: string } {
  let name: string | undefined
  let tag: string | undefined
  const parts = spec.split(/@/g)
  if (parts[0] === '') { // @scope/name
    name = parts.slice(0, 2).join('@')
    tag = parts[2]
  }
  else {
    name = parts[0]
    tag = parts[1]
  }
  return { name, tag }
}
