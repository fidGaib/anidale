import { User } from '../graphql/gql/graphql'

export interface UserStore {
  user: User
  setUser: (user: any) => void
  removeUser: () => void
  validate: () => void
}
