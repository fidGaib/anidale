import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'src/schema/**/*.graphql',
  generates: {
    './src/schema/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        scalars: {
          Date: 'Date',
          FILE: 'File',
        },
        inputMaybeValue: 'T',
      },
    },
  },
}
export default config
