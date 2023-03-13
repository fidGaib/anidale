export const UserSchema = /* GraphQL */ `
  extend type Query {
    getUser(id: ID!): User
    getUsers: [User!]!
  }
  extend type Mutation {
    registration(user: Registration!): User
    login(user: Login!): User
    update(id: ID, user: UpdateUser): User
  }
  scalar Date
  type User {
    id: ID
    email: String
    pass: String
    login: String
    avatar: String
    activationLink: String
    isActivated: Boolean
    createdAt: Date
  }
  input UpdateUser {
    email: String
    pass: String
    login: String
    avatar: String
    activationLink: String
    isActivated: Boolean
  }
  input Registration {
    email: String!
    pass: String!
    pass2: String!
  }
  input Login {
    email: String!
    pass: String!
  }
`
