export const TokenSchema = /* GraphQL */ `
  extend type Query {
    getToken(refreshToken: String!): Token
  }
  # extend type Mutation {}
  type Token {
    id: ID
    user: TokenUser
    userId: ID
    refreshToken: String
  }
  type TokenUser {
    id: ID
    avatar: String
    email: String
    login: String
    isActivated: String
  }
`
