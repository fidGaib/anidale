import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'http://localhost:5000/graphql',
  documents: ['src/shared/graphql/schema.ts'],
  // verbose: true,
  // debug: true,
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/shared/graphql/gql/': {
      preset: 'client',
    },
  },
  hooks: {
    afterOneFileWrite: console.log,
  },
}

export default config
