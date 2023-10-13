import { useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'

import { ViewerVar } from '@/processes/auth'
import { LOGOUT } from '@/shared/graphql/schema'

export const Signout = () => {
  useQuery(LOGOUT, { fetchPolicy: 'no-cache' })
  ViewerVar({
    id: 0,
    login: '',
    avatar: '',
    email: '',
  })
  return <Navigate to='/signin' replace />
}
