import { gql, useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'

import { LOGOUT } from '@/shared/graphql/schema'

const Signout = () => {
  const { data, error, loading } = useQuery(LOGOUT)
  if (loading) return <></>
  else if (data.logout) {
    return <Navigate to={'/signin'} replace={true} />
  } else return <></>
}

export default Signout
