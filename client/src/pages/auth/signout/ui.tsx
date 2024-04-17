import { useQuery, useReactiveVar } from '@apollo/client'

import { SIGNOUT } from '@/shared/graphql/schema'
import { useEffect } from 'react'
import { VarAuthData } from '@/app/providers/routes/AppRouter'

export const Signout = () => {
  const {data, loading} = useQuery(SIGNOUT, { fetchPolicy: 'no-cache' })
  useEffect(() => {
    if (data?.logout) {
      VarAuthData({
        id: 0,
        avatar: '',
        login: ''
      })
      window.location.href = '/';
    }
  }, [data?.logout, loading])
  return <></>
}
