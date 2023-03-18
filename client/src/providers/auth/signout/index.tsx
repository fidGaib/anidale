import { useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'

import { LOGOUT } from '@/shared/graphql/schema'
import { isAuthVar } from '@/shared/store/state'

const Signout = () => {
  useQuery(LOGOUT, { fetchPolicy: 'network-only' })
  isAuthVar(false)
  return <Navigate to='/signin' replace={false} />
}

export default Signout
