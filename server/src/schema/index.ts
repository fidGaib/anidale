import { loadFiles, loadFilesSync } from '@graphql-tools/load-files'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

async function loadResolvers(glob: string) {
  const resolversArray = await loadFiles(glob, {
    ignoreIndex: true,
    requireMethod: async (path: string) => {
      return await import(path)
    },
  })

  return resolversArray
}

const executableSchema = makeExecutableSchema({
  typeDefs: loadFilesSync('**/*.graphql'),
  resolvers: await loadResolvers('./**/*resolvers.ts'),
})

export const yoga = createYoga({
  schema: executableSchema,
})
