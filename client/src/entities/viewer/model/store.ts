import { useReactiveVar } from '@apollo/client'

import { ViewerVar } from './selectors'

export const useViewer = () => useReactiveVar(ViewerVar)

export const useAuth = () => {
  const viewer = useViewer()
  return !!viewer
}
