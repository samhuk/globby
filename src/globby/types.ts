export type Options = {
  cwd?: string
  ignore?: string | string[]
  expandDirectories?: ExpandDirectoriesOption
  gitignore?: boolean
}

export type NormalizedOptions = Required<
  Options
> & {
  ignore: string[]
}

export type IsGitIgnoredOptions = {
  cwd?: string
}

export type NormalizedIsGitIgnoredOptions = Required<
  IsGitIgnoredOptions
>

export type ExpandDirectoriesOption = boolean | string[] | { files: string[], extensions: string[] }
