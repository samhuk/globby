import fastGlob from 'fast-glob'
import * as fs from 'fs'
import gitIgnore from 'ignore'
import path from 'path'

import { normalizeIsGitIgnoredOptions, normalizeOptions } from './options'
import { IsGitIgnoredOptions, NormalizedIsGitIgnoredOptions } from './types'
import { isNegativePattern, toPath } from './utilities'

const slash = (p: string): string => (/^\\\\\?\\/.test(p) ? p : p.replace(/\\/g, '/'))

type _File = {
  path: string
  content: string
}

const IGNORE_FILES_GLOB_OPTIONS = {
  ignore: [
    '**/node_modules',
    '**/flow-typed',
    '**/coverage',
    '**/.git',
  ],
  absolute: true,
  dot: true,
}

export const GITIGNORE_FILES_PATTERN = '**/.gitignore'

const applyBaseToPattern = (pattern: string, base: string) => (isNegativePattern(pattern)
  ? `!${path.posix.join(base, pattern.slice(1))}`
  : path.posix.join(base, pattern))

const parseIgnoreFile = (file: _File, cwd: string) => {
  const base = slash(path.relative(cwd, path.dirname(file.path)))

  return file.content
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#'))
    .map(pattern => applyBaseToPattern(pattern, base))
}

const toRelativePath = (fileOrDirectory: string, cwd: string) => {
  const _cwd = slash(cwd)
  if (path.isAbsolute(fileOrDirectory)) {
    if (slash(fileOrDirectory).startsWith(_cwd))
      return path.relative(_cwd, fileOrDirectory)

    throw new Error(`Path ${fileOrDirectory} is not in cwd ${_cwd}`)
  }

  return fileOrDirectory
}

const getIsIgnoredPredicate = (files: _File[], cwd: string) => {
  const patterns = files.flatMap(file => parseIgnoreFile(file, cwd))
  const ignores = gitIgnore().add(patterns)

  return (fileOrDirectory: string) => (
    ignores.ignores(slash(toRelativePath(toPath(fileOrDirectory), cwd)))
  )
}

export const isIgnoredByIgnoreFiles = async (
  patterns: string | string[],
  options: NormalizedIsGitIgnoredOptions,
) => {
  const _options = normalizeOptions(options)

  const paths = await fastGlob(patterns, { cwd: _options.cwd, ...IGNORE_FILES_GLOB_OPTIONS })

  const files = await Promise.all(
    paths.map(async _path => ({
      path: _path,
      content: await fs.promises.readFile(_path, 'utf8'),
    })),
  )

  return getIsIgnoredPredicate(files, _options.cwd)
}

export const isIgnoredByIgnoreFilesSync = (
  patterns: string | string[],
  options: NormalizedIsGitIgnoredOptions,
) => {
  const _options = normalizeOptions(options)

  const paths = fastGlob.sync(patterns, { cwd: _options.cwd, ...IGNORE_FILES_GLOB_OPTIONS })

  const files = paths.map(_path => ({
    path: _path,
    content: fs.readFileSync(_path, 'utf8'),
  }))

  return getIsIgnoredPredicate(files, _options.cwd)
}

export const isGitIgnored = (
  options: IsGitIgnoredOptions,
) => isIgnoredByIgnoreFiles(GITIGNORE_FILES_PATTERN, normalizeIsGitIgnoredOptions(options))

export const isGitIgnoredSync = (
  options: IsGitIgnoredOptions,
) => isIgnoredByIgnoreFilesSync(GITIGNORE_FILES_PATTERN, normalizeIsGitIgnoredOptions(options))
