import { fileURLToPath } from 'url'
import { Transform } from 'stream'

export const toPath = (urlOrPath: string | URL) => (urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath)

export class FilterStream extends Transform {
  constructor(filter: any) {
    super({
      objectMode: true,
      transform(data, encoding, callback) {
        callback(undefined, filter(data) ? data : undefined)
      },
    })
  }
}

export const isNegativePattern = (pattern: string) => pattern.charAt(0) === '!'

const validateNormalizedPatterns = (patterns: string[]) => {
  if (patterns.some(pattern => typeof pattern !== 'string'))
    throw new TypeError('Patterns must be a string or an array of strings')
}

export const normalizePatterns = (patterns: string | string[]): string[] => {
  const normalizedPatterns = typeof patterns === 'string' ? [patterns] : Array.from(new Set(patterns))
  validateNormalizedPatterns(normalizedPatterns)
  return normalizedPatterns
}
