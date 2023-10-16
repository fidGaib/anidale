import { makeVar, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { useAuth } from '@/entities/viewer'
import { REFRESH } from '@/shared/graphql/schema'

export interface UserType {
  id: number
  login: string
  avatar: string
  email: string
}
export const ViewerVar = makeVar<UserType>({
  id: 0,
  login: '',
  avatar: '',
  email: '',
})
const useAuthentication = () => {
  const { data, loading } = useQuery(REFRESH, { fetchPolicy: 'cache-and-network' })
  const isAuth = useAuth()
  const [isAuthenticating, setAuthenticating] = useState(true)

  useEffect(() => {
    if (loading) return
    const user = data?.refresh?.user
    if (user) ViewerVar(user)
    setAuthenticating(false)
  }, [data, loading])

  return { isAuthenticating, isAuth, loading }
}

export { useAuthentication }
