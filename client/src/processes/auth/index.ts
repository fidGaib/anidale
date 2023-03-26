import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { ViewerVar, useAuth } from '@/entities/viewer'
import { REFRESH } from '@/shared/graphql/schema'

const useAuthentication = () => {
  const { data, loading } = useQuery(REFRESH)
  const isAuth = useAuth()
  const [isAuthenticating, setAuthenticating] = useState(true)

  useEffect(() => {
    if(loading) return
    const user = data?.refresh?.user
    ViewerVar(user ?? null)

    setAuthenticating(false)
  }, [data, loading])

  return { isAuthenticating, isAuth, loading }
}

export { useAuthentication }
