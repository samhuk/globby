import { Options as FastGlobOptions } from 'fast-glob'

export type ExpandDirectoriesOption = boolean | string[] | { files?: string[], extensions?: string[] }

type OurOptions = {
  cwd?: string
  ignore?: string | string[]
  expandDirectories?: ExpandDirectoriesOption
  gitignore?: boolean
}

export type Options = Omit<FastGlobOptions, 'cwd'> & OurOptions

export type NormalizedOptions = Required<
  OurOptions
> & Omit<FastGlobOptions, 'cwd'> & {
  ignore: string[]
}

export type IsGitIgnoredOptions = {
  cwd?: string
}

export type NormalizedIsGitIgnoredOptions = Required<
  IsGitIgnoredOptions
>
