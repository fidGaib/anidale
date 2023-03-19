import { useReactiveVar } from '@apollo/client'

import { ViewerVar, newPostsVar } from './selectors'

export const useViewer = () => useReactiveVar(ViewerVar)

export const useAuth = () => {
  const viewer = useViewer()
  return !!viewer
}

export const useNewPosts = () => useReactiveVar(newPostsVar)
