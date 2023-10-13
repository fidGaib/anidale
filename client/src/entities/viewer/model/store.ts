import { useReactiveVar } from '@apollo/client'

import { ViewerVar } from '@/processes/auth'

export const useViewer = () => useReactiveVar(ViewerVar)

export const useAuth = () => {
  const viewer = useViewer()
  if (viewer.id === 0) {
    return false
  }
  if (viewer.id !== 0) return true
}
