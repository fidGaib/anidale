export const typeDefs = /* GraphQL */ `
  extend type Query {
    getPost(id: ID!): Post
    getPosts: [Post!]!
  }
  type Post {
    id: ID!
    description: String
    avtor: Int!
  }
`
export const posts = [
  {
    id: 1,
    description: 'Привет мир',
    avtor: 1,
  },
  {
    id: 2,
    description: 'Прикольный текст',
    avtor: 2,
  },
]
type PostType = {
  id: number
  description: string
  avtor: number
}
export const resolvers = {
  Query: {
    getPost(parent: any, args: PostType, contextValue: any, info: any) {
      return posts.find((post) => post.id == args.id)
    },
    getPosts() {
      return posts
    },
  },
}
