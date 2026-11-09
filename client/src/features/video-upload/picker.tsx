import { useQuery } from '@apollo/client'
import { useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { GET_VIDEOS } from '@/shared/graphql/schema'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Empty, FormError, Hint } from '@/shared/ui/notice'

import cl from './picker.module.css'

export interface PickableVideo {
  id: number
  title: string
}

interface Props {
  /** Уже выбранные видео: они отмечены сразу. */
  selected: PickableVideo[]
  onDone: (videos: PickableVideo[]) => void
  onClose: () => void
}

/** Окно «Мои видео»: выбор роликов из своей коллекции (без роликов, которые уже лежат в записях). */
export const VideoPicker = ({ selected, onDone, onClose }: Props) => {
  const me = useRefreshStore((s) => s.refreshData.id) ?? 0
  const { data, loading, error } = useQuery(GET_VIDEOS, {
    variables: { id: me, limit: 50, offset: 0 },
    skip: !me,
    fetchPolicy: 'network-only',
  })
  const [picked, setPicked] = useState<PickableVideo[]>(selected)
  const videos = (data?.getVideos ?? []).filter((v) => v.postId === null).map((v) => ({ id: v.id, title: v.title }))

  const toggle = (video: PickableVideo) =>
    setPicked((all) => (all.some((v) => v.id === video.id) ? all.filter((v) => v.id !== video.id) : [...all, video]))

  return (
    <Dialog
      title='Мои видео'
      width={460}
      onClose={onClose}
      footer={
        <>
          <Hint>Выбрано: {picked.length}</Hint>
          <Btn variant='primary' onClick={() => onDone(picked)}>
            Готово
          </Btn>
        </>
      }
    >
      <FormError>{error?.message}</FormError>
      {loading && <Empty>Загрузка…</Empty>}
      {!loading && videos.length === 0 && <Empty>В вашей коллекции видео пока нет</Empty>}
      <div className={cl.list}>
        {videos.map((video) => (
          <label key={video.id} className={cl.row}>
            <input type='checkbox' checked={picked.some((v) => v.id === video.id)} onChange={() => toggle(video)} />
            <span className={cl.title}>🎬 {video.title || 'Без названия'}</span>
          </label>
        ))}
      </div>
    </Dialog>
  )
}
