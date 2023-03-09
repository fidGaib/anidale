export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUser(id: ID!): User
    getUsers: [User!]!
  }
  type User {
    id: ID!
    name: String!
    posts: [Post!]!
  }
`
const users = [
  {
    id: 1,
    name: 'Elizabeth Bennet',
    posts: [
      {
        id: 1,
        description: 'Привет мир',
        avtor: 1,
      },
    ],
  },
  {
    id: 2,
    name: 'Genry Garry',
    posts: [
      {
        id: 2,
        description: 'Прикольный текст',
        avtor: 2,
      },
    ],
  },
]
type UserType = {
  id: number
  name: string
  posts: any
}
export const resolvers = {
  Query: {
    getUser(parent: any, args: UserType, contextValue: any, info: any) {
      console.log(args)
      return users.find((user) => user.id == args.id)
    },
    getUsers() {
      return users
    },
  },
}
