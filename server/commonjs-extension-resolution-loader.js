import { isBuiltin } from 'node:module'
import { dirname } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Resolve from 'resolve'

const baseURL = pathToFileURL(cwd() + '/').href

export function resolve(specifier, context, next) {
  const { parentURL = baseURL } = context

  if (isBuiltin(specifier)) {
    return next(specifier, context)
  }

  // `resolveAsync` works with paths, not URLs
  if (specifier.startsWith('file://')) {
    specifier = fileURLToPath(specifier)
  }
  const parentPath = fileURLToPath(parentURL)

  // typescript for alias
  const iSTsAlias = specifier.startsWith('@/')

  const specifierToResolve = iSTsAlias ? `./${specifier.slice(2)}` : specifier
  const basedir = iSTsAlias ? `${fileURLToPath(baseURL)}src` : dirname(parentPath)

  let url
  try {
    const resolution = Resolve.sync(specifierToResolve, {
      basedir,
      // For whatever reason, --experimental-specifier-resolution=node doesn't search for .mjs extensions
      // but it does search for index.mjs files within directories
      extensions: ['.js', '.ts', '.json', '.node', '.mjs'],
    })
    url = pathToFileURL(resolution).href
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      // Match Node's error code
      error.code = 'ERR_MODULE_NOT_FOUND'
    }
    throw error
  }

  return next(url, context)
}
