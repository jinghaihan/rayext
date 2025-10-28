import type { CommandOptions, GithubBranch, GithubTag } from '../types'
import process from 'node:process'
import { ofetch } from 'ofetch'
import pRetry from 'p-retry'
import { DEFAULT_RETRIES } from '../constants'

function getRequestHeaders(options: CommandOptions) {
  const headers: Record<string, string> = {
    'user-agent': `rayext@npm node/${process.version}`,
  }
  if (options.token)
    headers.Authorization = `token ${options.token}`
  return headers
}

export async function getRepoTags(repo: string, options: CommandOptions): Promise<GithubTag[]> {
  return await pRetry(
    async () => {
      return await ofetch<GithubTag[]>(
        `https://api.github.com/repos/${repo}/tags`,
        {
          headers: getRequestHeaders(options),
        },
      )
    },
    { retries: options.retries ?? DEFAULT_RETRIES },
  )
}

export async function getRepoBranches(repo: string, options: CommandOptions): Promise<GithubBranch[]> {
  return await pRetry(
    async () => {
      return await ofetch<GithubBranch[]>(
        `https://api.github.com/repos/${repo}/branches`,
        {
          headers: getRequestHeaders(options),
        },
      )
    },
    { retries: options.retries ?? DEFAULT_RETRIES },
  )
}

export async function getRepoDefaultBranch(repo: string, options: CommandOptions): Promise<string> {
  return await pRetry(
    async () => {
      const { default_branch } = await ofetch(
        `https://api.github.com/repos/${repo}`,
        {
          headers: getRequestHeaders(options),
        },
      )
      return default_branch
    },
    { retries: options.retries ?? DEFAULT_RETRIES },
  )
}
