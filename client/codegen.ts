import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: process.env.API_URL || 'http://localhost:5000/graphql',
  documents: ['src/shared/graphql/documents/*.ts'],
  // verbose: true,
  // debug: true,
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/shared/graphql/gql/': {
      preset: 'client',
      // Без маски фрагментов: данные фрагмента сразу видны в результате запроса,
      // не нужно вызывать getFragmentData на каждом объекте
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
  hooks: {
    afterOneFileWrite: console.log,
  },
}

export default config
