import merge2 from 'merge2'
import fastGlob, { Entry } from 'fast-glob'
import dirGlob from 'dir-glob'
import path from 'path'
import {
  isIgnoredByIgnoreFiles,
  isIgnoredByIgnoreFilesSync,
} from './ignore'
import { FilterStream, isNegativePattern, normalizePatterns } from './utilities'
import { normalizeOptions } from './options'
import { ExpandDirectoriesOption, NormalizedOptions, Options } from './types'

const createFilterFunction = (isIgnored?: (_path: string) => boolean) => {
  const seen = new Set()

  return (fastGlobResult: any) => {
    const _path = fastGlobResult.path || fastGlobResult
    const pathKey = path.normalize(_path)
    const seenOrIgnored = seen.has(pathKey) || isIgnored?.(_path)
    seen.add(pathKey)
    return !seenOrIgnored
  }
}

const getFilter = async (options: NormalizedOptions) => createFilterFunction(
  options.ignore.length > 0 ? await isIgnoredByIgnoreFiles(options.ignore, { cwd: options.cwd }) : null,
)

const getFilterSync = (options: NormalizedOptions) => createFilterFunction(
  options.ignore.length > 0 ? isIgnoredByIgnoreFilesSync(options.ignore, { cwd: options.cwd }) : null,
)

const unionFastGlobResults = (
  results: any[],
  filter: Function,
) => results.flat().filter(fastGlobResult => filter(fastGlobResult))

const unionFastGlobStreams = (
  streams: any,
  filter: Function,
) => merge2(streams).pipe(new FilterStream((fastGlobResult: any) => filter(fastGlobResult)))

const convertNegativePatterns = (patterns: string[], options: NormalizedOptions) => {
  const tasks = []

  while (patterns.length > 0) {
    const index = patterns.findIndex(pattern => isNegativePattern(pattern))

    if (index === -1) {
      tasks.push({ patterns, options })
      break
    }

    const ignorePattern = patterns[index].slice(1)

    tasks.forEach(task => task.options.ignore.push(ignorePattern))

    if (index !== 0) {
      tasks.push({
        patterns: patterns.slice(0, index),
        options: {
          ...options,
          ignore: [
            ...options.ignore,
            ignorePattern,
          ],
        },
      })
    }

    patterns = patterns.slice(index + 1)
  }

  return tasks
}

const normalizeExpandDirectories = (
  expandDirectories: ExpandDirectoriesOption,
): { files?: string[], extensions?: string[] } => {
  if (Array.isArray(expandDirectories))
    return { files: expandDirectories }

  if (typeof expandDirectories === 'object') {
    return {
      files: expandDirectories.files,
      extensions: expandDirectories.extensions,
    }
  }

  return null
}

const getDirGlobOptions = (
  expandDirectories: ExpandDirectoriesOption,
  cwd: string,
): dirGlob.Options => ({
  cwd,
  ...normalizeExpandDirectories(expandDirectories),
})

const generateTasks = async (patterns: string[], options: NormalizedOptions) => {
  const globTasks = convertNegativePatterns(patterns, options)

  const { cwd, expandDirectories } = options

  if (!expandDirectories)
    return globTasks

  const patternExpandOptions = getDirGlobOptions(expandDirectories, cwd)
  const ignoreExpandOptions = cwd ? { cwd } : undefined

  return Promise.all(
    globTasks.map(async task => {
      const results = await Promise.all([
        dirGlob(task.patterns, patternExpandOptions),
        dirGlob(options.ignore, ignoreExpandOptions),
      ])
      options.ignore = results[1]

      return { patterns: results[0], options }
    }),
  )
}

const generateTasksSync = (patterns: string[], options: NormalizedOptions) => {
  const globTasks = convertNegativePatterns(patterns, options)

  const { cwd, expandDirectories } = options

  if (!expandDirectories)
    return globTasks

  const patternExpandOptions = getDirGlobOptions(expandDirectories, cwd)
  const ignoreExpandOptions = cwd ? { cwd } : undefined

  return globTasks.map(task => {
    const _patterns = dirGlob.sync(task.patterns, patternExpandOptions)
    options.ignore = dirGlob.sync(options.ignore, ignoreExpandOptions)
    return { patterns: _patterns, options }
  })
}

export const globby = async <
  TOptions extends Options
>(
  patterns: string | string[],
  options?: TOptions,
): Promise<TOptions extends { objectMode: true } ? Entry[] : string[]> => {
  const _patterns = normalizePatterns(patterns)
  const _options = normalizeOptions(options)
  const [
    tasks,
    filter,
  ] = await Promise.all([
    generateTasks(_patterns, _options),
    getFilter(_options),
  ])
  const results = await Promise.all(tasks.map(task => fastGlob(task.patterns, task.options)))

  return unionFastGlobResults(results, filter)
}

export const globbySync = <
  TOptions extends Options
>(
    patterns: string | string[],
    options?: TOptions,
  ): (TOptions extends { objectMode: true } ? Entry[] : string[]) => {
  const _patterns = normalizePatterns(patterns)
  const _options = normalizeOptions(options)
  const tasks = generateTasksSync(_patterns, _options)
  const filter = getFilterSync(_options)
  const results = tasks.map(task => fastGlob.sync(task.patterns, task.options))

  return unionFastGlobResults(results, filter)
}

export const globbyStream = (patterns: string | string[], options?: Options) => {
  const _patterns = normalizePatterns(patterns)
  const _options = normalizeOptions(options)
  const tasks = generateTasksSync(_patterns, _options)
  const filter = getFilterSync(_options)
  const streams = tasks.map(task => fastGlob.stream(task.patterns, task.options))

  return unionFastGlobStreams(streams, filter)
}

export const isDynamicPattern = (patterns: string | string[], options?: Options) => {
  const _patterns = normalizePatterns(patterns)
  const _options = normalizeOptions(options)
  return _patterns.some(pattern => fastGlob.isDynamicPattern(pattern, _options))
}

export const generateGlobTasks = (patterns: string | string[], options?: Options) => (
  generateTasks(normalizePatterns(patterns), normalizeOptions(options))
)

export const generateGlobTasksSync = (patterns: string | string[], options?: Options) => (
  generateTasksSync(normalizePatterns(patterns), normalizeOptions(options))
)
