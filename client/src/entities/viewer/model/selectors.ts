import { makeVar } from '@apollo/client'

export const ViewerVar = makeVar<UserType | null>(null)

interface UserType {
  id: number
  login: string
  avatar: string
}
