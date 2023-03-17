import { useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'

import { isAuth } from '@/app/providers/AppRouter'
import { LOGOUT } from '@/shared/graphql/schema'

const Signout = () => {
  const { data, error, loading } = useQuery(LOGOUT)
  isAuth(false)
  return <Navigate to='/signin' replace={false} />
}

export default Signout
