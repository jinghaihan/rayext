import type { MODE_CHOICES } from './constants'

export type RangeMode = typeof MODE_CHOICES[number]

export interface CommandOptions {
  cwd?: string
  mode?: RangeMode
  /**
   * For monorepo support, specify the packages to install
   */
  package?: string | string[]
  /**
   * The number of retries when resolving extensions
   * @default `5`
   */
  retries?: number
  /**
   * The token to use for the GitHub API
   * @default `process.env.GITHUB_TOKEN`
   */
  token?: string
  /**
   * Skip prompt confirmation
   * @default `false`
   */
  yes?: boolean
}

export type Manifest = Record<string, ExtensionConfig>

export interface ExtensionConfig {
  github: string
  package?: string
  title: string
  description?: string
  repository?: string
  license?: string
  author?: string | {
    name: string
    email?: string
    url?: string
  }
  categories?: string[]
  contributors?: string[]
  commands?: ExtensionCommand[]
  preferences?: ExtensionPreference[]
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  tag?: string
  branch?: string
  commit?: GithubCommit
}

export interface ExtensionCommand {
  [key: string]: unknown
  name: string
  title: string
  description: string
}

export interface ExtensionPreference {
  [key: string]: unknown
  name: string
  type: string
  default?: unknown
  required: boolean
  title?: string
  label?: string
  description: string
}

export interface GithubCommit {
  sha: string
  url: string
}

export interface GithubTag {
  name: string
  zipball_url: string
  tarball_url: string
  commit: GithubCommit
  node_id: string
}

export interface GithubBranch {
  name: string
  commit: GithubCommit
  protected: boolean
}
