import { useQuery } from '@apollo/client'
import { useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { MUSIC_BY_USER } from '@/shared/graphql/schema'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Empty, FormError, Hint } from '@/shared/ui/notice'

import cl from './picker.module.css'

export interface PickableTrack {
  id: number
  title: string
  artist: string
}

interface Props {
  /** Уже выбранные треки: они отмечены сразу. */
  selected: PickableTrack[]
  /** Сколько треков можно выбрать. */
  limit: number
  onDone: (tracks: PickableTrack[]) => void
  onClose: () => void
}

/** Окно «Моя музыка»: выбор треков из своего профиля, например, для прикрепления к записи. */
export const MusicPicker = ({ selected, limit, onDone, onClose }: Props) => {
  const me = useRefreshStore((s) => s.refreshData.id) ?? 0
  const { data, loading, error } = useQuery(MUSIC_BY_USER, {
    variables: { id: me, limit: 50, page: 0 },
    skip: !me,
    fetchPolicy: 'network-only',
  })
  const [picked, setPicked] = useState<PickableTrack[]>(selected)
  const tracks = (data?.getMusic ?? []).flatMap((t) =>
    t?.id ? [{ id: t.id, title: t.title ?? '', artist: t.artist ?? '' }] : [],
  )

  const toggle = (track: PickableTrack) =>
    setPicked((all) =>
      all.some((t) => t.id === track.id)
        ? all.filter((t) => t.id !== track.id)
        : all.length < limit
        ? [...all, track]
        : all,
    )

  return (
    <Dialog
      title='Моя музыка'
      width={460}
      onClose={onClose}
      footer={
        <>
          <Hint>
            Выбрано: {picked.length} из {limit}
          </Hint>
          <Btn variant='primary' onClick={() => onDone(picked)}>
            Готово
          </Btn>
        </>
      }
    >
      <FormError>{error?.message}</FormError>
      {loading && <Empty>Загрузка…</Empty>}
      {!loading && tracks.length === 0 && <Empty>В вашей музыке пока ничего нет</Empty>}
      <div className={cl.list}>
        {tracks.map((track) => (
          <label key={track.id} className={cl.row}>
            <input type='checkbox' checked={picked.some((t) => t.id === track.id)} onChange={() => toggle(track)} />
            <span className={cl.text}>
              <span className={cl.title}>{track.title}</span>
              <span className={cl.artist}>{track.artist}</span>
            </span>
          </label>
        ))}
      </div>
    </Dialog>
  )
}
