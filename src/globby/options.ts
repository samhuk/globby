import * as fs from 'fs'
import { GITIGNORE_FILES_PATTERN } from './ignore'

import { IsGitIgnoredOptions, NormalizedIsGitIgnoredOptions, NormalizedOptions, Options } from './types'
import { normalizePatterns, toPath } from './utilities'

const checkCwdOption = (cwd: string | null | undefined) => {
  if (!cwd)
    return

  let stat
  try {
    stat = fs.statSync(cwd)
  }
  catch {
    return
  }

  if (!stat.isDirectory())
    throw new Error('The `cwd` option must be a path to a directory')
}

export const normalizeOptions = (
  options?: Options,
): NormalizedOptions => {
  const _options: NormalizedOptions = {
    ...options,
    cwd: toPath(options?.cwd) || process.cwd(),
    ignore: normalizePatterns(options?.ignore ?? []),
    expandDirectories: options?.expandDirectories ?? true,
    gitignore: options?.gitignore ?? false,
    objectMode: options?.objectMode ?? false,
  }

  checkCwdOption(_options.cwd)

  if (_options.gitignore)
    _options.ignore.push(GITIGNORE_FILES_PATTERN)

  return _options
}

export const normalizeIsGitIgnoredOptions = (
  options?: IsGitIgnoredOptions,
): NormalizedIsGitIgnoredOptions => ({
  cwd: toPath(options?.cwd) ?? process.cwd(),
})
