/**
 * This file defines the public API of the package. Everything here will be available from
 * the top-level package name when importing as an npm package.
 *
 * E.g. `import { globby } from 'globby`
 */
import { globby } from './globby'

export { globby } from './globby'
export { isGitIgnored, isGitIgnoredSync } from './globby/ignore'

// -- Types
export * from './types'

export default globby
