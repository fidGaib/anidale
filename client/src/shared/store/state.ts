import { makeVar } from '@apollo/client'

export const isAuthVar = makeVar(false)
export const Me = makeVar<UserType>({})

interface UserType {
  id?: number
  login?: string
  avatar?: string
}
