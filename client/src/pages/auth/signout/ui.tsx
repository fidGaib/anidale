import { useQuery } from '@apollo/client'

import { ViewerVar } from '@/processes/auth'
import { SIGNOUT } from '@/shared/graphql/schema'
import { useEffect } from 'react'

export const Signout = () => {
  const {data, loading} = useQuery(SIGNOUT, { fetchPolicy: 'no-cache' })
  useEffect(() => {
    if (data?.logout) {
      ViewerVar({
        id: 0,
        login: '',
        avatar: '',
        email: '',
      })
      window.location.href = '/';
    }
  }, [data?.logout, loading])
  return <></>
}
