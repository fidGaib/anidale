import { useMutation, useQuery } from '@apollo/client'
import { FormEvent, useState } from 'react'

import {
  ADMIN_ANIME_EPISODES,
  DELETE_ANIME_EPISODE,
  SAVE_ANIME_EPISODE,
} from '@/shared/graphql/schema'
import { Admin_Anime_EpisodesQuery } from '@/shared/graphql/gql/graphql'
import { storageUrl } from '@/shared/config'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Empty, FormError, Hint } from '@/shared/ui/notice'

import cl from './ui.module.css'

type Episode = NonNullable<Admin_Anime_EpisodesQuery['adminAnimeEpisodes']>[number]

interface Props {
  releaseId: number
  releaseTitle: string
  onClose: () => void
  /** После изменений обновить карточку релиза в списке. */
  onChanged: () => void
}

/** Локальное время для input[type=datetime-local]: YYYY-MM-DDTHH:mm. */
const toInputValue = (timestamp: number) => {
  const date = new Date(timestamp || Date.now())
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Серии релиза: список, загрузка видео и кадра, изменение и удаление. */
export const EpisodesDialog = ({ releaseId, releaseTitle, onClose, onChanged }: Props) => {
  const { data, loading, error, refetch } = useQuery(ADMIN_ANIME_EPISODES, { variables: { releaseId } })
  const [remove] = useMutation(DELETE_ANIME_EPISODE)
  const [editing, setEditing] = useState<Episode | 'new' | null>(null)
  const episodes = data?.adminAnimeEpisodes ?? []

  const refresh = async () => {
    await refetch()
    onChanged()
  }

  const removeEpisode = async (episode: Episode) => {
    if (!window.confirm(`Удалить серию ${episode.number}? Видео и кадр тоже удалятся.`)) return
    await remove({ variables: { id: episode.id } })
    await refresh()
  }

  if (editing) {
    return (
      <EpisodeForm
        releaseId={releaseId}
        releaseTitle={releaseTitle}
        episode={editing === 'new' ? null : editing}
        nextNumber={episodes.reduce((max, item) => Math.max(max, item.number), 0) + 1}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    )
  }

  return (
    <Dialog
      title={`Серии: ${releaseTitle}`}
      width={720}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error?.message}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onClose}>Закрыть</Btn>
            <Btn variant='primary' onClick={() => setEditing('new')}>
              Добавить серию
            </Btn>
          </div>
        </div>
      }
    >
      {loading && <Empty>Загружаем серии…</Empty>}
      {!loading && episodes.length === 0 && <Empty>Серий пока нет</Empty>}
      <div className={cl.episodeList}>
        {episodes.map((episode) => (
          <div className={cl.episodeRow} key={episode.id}>
            <span className={cl.episodeNumber}>{episode.number}</span>
            <span className={cl.episodeMain}>
              <b>{episode.title || `Эпизод ${episode.number}`}</b>
              <small>
                {formatDateTime(toTimestamp(episode.publishedAt))}
                {episode.duration ? ` • ${episode.duration}` : ''}
                {episode.video ? '' : ' • без видео'}
              </small>
            </span>
            {episode.video && (
              <a className={cl.fileLink} href={storageUrl(episode.video)} target='_blank' rel='noreferrer'>
                Видео
              </a>
            )}
            <Btn onClick={() => setEditing(episode)}>Изменить</Btn>
            <Btn variant='danger' onClick={() => removeEpisode(episode)}>
              Удалить
            </Btn>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

interface FormProps {
  releaseId: number
  releaseTitle: string
  episode: Episode | null
  nextNumber: number
  onClose: () => void
  onSaved: () => void
}

const EpisodeForm = ({ releaseId, releaseTitle, episode, nextNumber, onClose, onSaved }: FormProps) => {
  const [number, setNumber] = useState(String(episode?.number ?? nextNumber))
  const [title, setTitle] = useState(episode?.title ?? '')
  const [description, setDescription] = useState(episode?.description ?? '')
  const [duration, setDuration] = useState(episode?.duration ?? '')
  const [publishedAt, setPublishedAt] = useState(toInputValue(toTimestamp(episode?.publishedAt)))
  const [video, setVideo] = useState<File | null>(null)
  const [preview, setPreview] = useState<File | null>(null)

  const [save, { loading, error }] = useMutation(SAVE_ANIME_EPISODE, {
    onCompleted: () => {
      onSaved()
      onClose()
    },
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await save({
      variables: {
        input: {
          ...(episode ? { id: episode.id } : {}),
          releaseId,
          number: Number(number),
          title: title.trim(),
          description: description.trim(),
          duration: duration.trim(),
          publishedAt: new Date(publishedAt).getTime(),
          ...(video ? { video } : {}),
          ...(preview ? { preview } : {}),
        },
      },
    })
  }

  return (
    <Dialog
      title={`${episode ? 'Изменить серию' : 'Новая серия'}: ${releaseTitle}`}
      width={620}
      busy={loading}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error?.message}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onClose} disabled={loading}>
              Отмена
            </Btn>
            <Btn variant='primary' type='submit' form='anime-episode-form' disabled={loading}>
              {loading ? 'Сохраняем…' : 'Сохранить'}
            </Btn>
          </div>
        </div>
      }
    >
      <form id='anime-episode-form' className={cl.form} onSubmit={submit}>
        <div className={cl.formRow}>
          <Field
            label='Номер серии'
            type='number'
            min={1}
            max={9999}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
          />
          <Field label='Длительность' value={duration} onChange={(e) => setDuration(e.target.value)} placeholder='24:00' />
          <label className={cl.select}>
            Дата выхода
            <input
              type='datetime-local'
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              required
            />
          </label>
        </div>
        <Field label='Название серии' value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <Field.Area
          label='Описание серии'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
        <div className={cl.formRow}>
          <label className={cl.file}>
            {episode ? 'Заменить видео' : 'Видео серии'}
            <input type='file' accept='video/mp4,video/webm,video/ogg' onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
            <small>
              {video ? video.name : episode?.video ? 'Оставьте пустым, чтобы не менять' : 'mp4, webm или ogv до 100 МБ'}
            </small>
          </label>
          <label className={cl.file}>
            Кадр серии
            <input type='file' accept='image/*' onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
            <small>{preview ? preview.name : 'Необязательно: превью для карточек'}</small>
          </label>
        </div>
        <Hint>После сохранения серия убирается из расписания как вышедшая.</Hint>
      </form>
    </Dialog>
  )
}
