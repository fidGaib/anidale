import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

import { RefreshStore } from '@/app/providers/routes/model'

import { trackView } from './track-view'

/** Скрытая метка внутри карточки: просмотр засчитывается, когда карточка попала на экран. */
export const ViewMark = ({ postId, views }: { postId: number; views: number }) => {
  const [ref, inView] = useInView({ threshold: 0.5, triggerOnce: true })
  useEffect(() => {
    if (inView && RefreshStore.getState().refreshData.id) trackView(postId, views)
  }, [inView, postId])
  return <div ref={ref} style={{ height: 1 }} />
}
