import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'schema/**/*.graphql',
  generates: {
    './schema/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        scalars: {
          Date: 'string',
        },
      },
    },
  },
}
export default config
