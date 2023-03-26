import { useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'

import { ViewerVar } from '@/entities/viewer'
import { LOGOUT } from '@/shared/graphql/schema'

export const Signout = () => {
  document.title = 'AniDale - Выход'
  useQuery(LOGOUT, { fetchPolicy: 'network-only' })
  ViewerVar(null)
  return <Navigate to='/signin' replace={false} />
}
