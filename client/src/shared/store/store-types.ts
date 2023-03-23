import { User } from '../graphql/gql/graphql'

export interface UserStore {
  user: User
  setUser: (user: User) => void
  removeUser: () => void
  validate: () => void
}
