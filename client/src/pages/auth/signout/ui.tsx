import { useQuery } from '@apollo/client'

import { useRefreshStore } from '@/app/providers/routes/model'
import { SIGNOUT } from '@/shared/graphql/schema'

export const Signout = () => {
  const { data, loading } = useQuery(SIGNOUT, { fetchPolicy: 'network-only' })
  const [refreshData, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])

  if (data?.logout) {
    setRefreshData({
      id: 0,
      avatar: '',
      login: '',
    })
    window.location.href = `/signin`
  }
  return <></>
}
