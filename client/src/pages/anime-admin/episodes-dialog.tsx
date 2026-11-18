import { useMutation, useQuery } from '@apollo/client'
import { FormEvent, useRef, useState } from 'react'

import {
  ADMIN_ANIME_EPISODES,
  DELETE_ANIME_EPISODE,
  SAVE_ANIME_EPISODE,
} from '@/shared/graphql/schema'
import { Admin_Anime_EpisodesQuery } from '@/shared/graphql/gql/graphql'
import { storageUrl } from '@/shared/config'
import { toPercent, UploadProgressEvent } from '@/shared/lib/progress-fetch'
import { formatDateTime, formatFileSize, toTimestamp } from '@/shared/lib/time'
import { validateUpload } from '@/shared/lib/upload-limits'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Empty, FormError, Hint } from '@/shared/ui/notice'
import { UploadProgress } from '@/shared/ui/progress'

import cl from './ui.module.css'

type Episode = NonNullable<Admin_Anime_EpisodesQuery['adminAnimeEpisodes']>[number]

interface Props {
  releaseId: number
  releaseTitle: string
  onClose: () => void
  /** После изменений обновить карточку релиза в списке. */
  onChanged: () => void
  /** Сразу открыть загрузку видео: так окно открывается после создания релиза. */
  startWithUpload?: boolean
}

/** Локальное время для input[type=datetime-local]: YYYY-MM-DDTHH:mm. */
const toInputValue = (timestamp: number) => {
  const date = new Date(timestamp || Date.now())
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Серии релиза: список, загрузка видео и кадра, изменение и удаление. */
export const EpisodesDialog = ({ releaseId, releaseTitle, onClose, onChanged, startWithUpload }: Props) => {
  const { data, loading, error, refetch } = useQuery(ADMIN_ANIME_EPISODES, { variables: { releaseId } })
  const [remove] = useMutation(DELETE_ANIME_EPISODE)
  const [editing, setEditing] = useState<Episode | 'new' | null>(null)
  const [uploading, setUploading] = useState(!!startWithUpload)
  const episodes = data?.adminAnimeEpisodes ?? []
  const nextNumber = episodes.reduce((max, item) => Math.max(max, item.number), 0) + 1

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
        nextNumber={nextNumber}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    )
  }

  if (uploading) {
    return (
      <EpisodeUploadForm
        releaseId={releaseId}
        releaseTitle={releaseTitle}
        nextNumber={nextNumber}
        onClose={onClose}
        onBack={() => setUploading(false)}
        onSaved={refresh}
      />
    )
  }

  return (
    <Dialog
      title={`Серии и видео: ${releaseTitle}`}
      width={720}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error?.message}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onClose}>Закрыть</Btn>
            <Btn onClick={() => setEditing('new')}>Добавить одну серию</Btn>
            <Btn variant='primary' onClick={() => setUploading(true)}>
              Загрузить видео
            </Btn>
          </div>
        </div>
      }
    >
      <Hint>
        Видео серий загружается здесь: один файл — одна серия. Выберите сразу несколько файлов, и номера серий
        проставятся по порядку.
      </Hint>
      {loading && <Empty>Загружаем серии…</Empty>}
      {!loading && episodes.length === 0 && <Empty>Серий пока нет. Нажмите «Загрузить видео».</Empty>}
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

interface UploadProps {
  releaseId: number
  releaseTitle: string
  nextNumber: number
  onClose: () => void
  onBack: () => void
  onSaved: () => Promise<void>
}

interface UploadEntry {
  file: File
  status: 'pending' | 'done' | 'failed'
  error?: string
}

/**
 * Загрузка нескольких видео сразу: каждый файл уходит отдельной мутацией, потому что
 * nginx ограничивает размер запроса. Номера серий идут подряд, начиная с указанного.
 */
const EpisodeUploadForm = ({ releaseId, releaseTitle, nextNumber, onClose, onBack, onSaved }: UploadProps) => {
  const input = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [startNumber, setStartNumber] = useState(String(nextNumber))
  const [publishedAt, setPublishedAt] = useState(toInputValue(Date.now()))
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<{ index: number; total: number; percent: number; name: string } | null>(null)
  const [save] = useMutation(SAVE_ANIME_EPISODE)
  const uploading = progress !== null

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter((file) => file.type.startsWith('video/'))
    if (!files.length) return setError('Выберите видеофайл: mp4, webm или ogv')
    const problems: string[] = []
    const accepted: UploadEntry[] = []
    for (const file of files) {
      const problem = validateUpload([file])
      if (problem) problems.push(problem)
      else accepted.push({ file, status: 'pending' })
    }
    setError(problems.join('\n'))
    setEntries((all) => [...all, ...accepted])
  }

  const mark = (index: number, patch: Partial<UploadEntry>) =>
    setEntries((all) => all.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))

  const upload = async () => {
    const pending = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.status !== 'done')
    if (!pending.length || uploading) return
    setError('')
    const base = Math.max(Number(startNumber) || nextNumber, 1)
    const failed: string[] = []
    let uploaded = 0

    for (const [position, { entry, index }] of pending.entries()) {
      const report = (percent: number) =>
        setProgress({ index: position + 1, total: pending.length, percent, name: entry.file.name })
      report(0)
      try {
        await save({
          variables: {
            input: {
              releaseId,
              number: base + position,
              title: '',
              publishedAt: new Date(publishedAt).getTime(),
              video: entry.file,
            },
          },
          context: {
            fetchOptions: { onProgress: (event: UploadProgressEvent) => report(toPercent(event)) },
          },
        })
        mark(index, { status: 'done', error: undefined })
        uploaded += 1
      } catch (e) {
        const message = e instanceof Error ? e.message : 'не удалось загрузить'
        failed.push(`«${entry.file.name}»: ${message}`)
        mark(index, { status: 'failed', error: message })
      }
    }

    setProgress(null)
    if (uploaded) await onSaved()
    if (failed.length) {
      // Успешные серии уже в базе, оставляем в списке только проблемные файлы
      setEntries((all) => all.filter((entry) => entry.status !== 'done'))
      setError(failed.join('\n'))
      return
    }
    onBack()
  }

  return (
    <Dialog
      title={`Загрузка серий: ${releaseTitle}`}
      width={620}
      busy={uploading}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onBack} disabled={uploading}>
              ← К списку серий
            </Btn>
            <Btn variant='primary' disabled={!entries.length || uploading} onClick={() => void upload()}>
              {uploading
                ? `Загружаем ${progress.index} из ${progress.total}…`
                : entries.length
                  ? `Загрузить ${entries.length} ${entries.length === 1 ? 'серию' : 'серий'}`
                  : 'Загрузить'}
            </Btn>
          </div>
        </div>
      }
    >
      <input
        ref={input}
        type='file'
        accept='video/mp4,video/webm,video/ogg'
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <Hint>
        Выберите сразу несколько видео — каждое станет отдельной серией. Номер первой серии можно изменить, дальше
        номера идут подряд.
      </Hint>
      <div className={cl.formRow}>
        <Field
          label='Номер первой серии'
          type='number'
          min={1}
          max={9999}
          value={startNumber}
          onChange={(e) => setStartNumber(e.target.value)}
          disabled={uploading}
        />
        <label className={cl.select}>
          Дата выхода серий
          <input
            type='datetime-local'
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            disabled={uploading}
          />
        </label>
      </div>

      <div className={cl.uploadBox}>
        <div className={cl.uploadHead}>
          <span className={cl.uploadCount}>
            {entries.length ? `Выбрано файлов: ${entries.length}` : 'Файлы не выбраны'}
          </span>
          <Btn variant='primary' disabled={uploading} onClick={() => input.current?.click()}>
            {entries.length ? 'Добавить ещё' : 'Выбрать видео'}
          </Btn>
        </div>

        {entries.length > 0 && (
          <ul className={cl.uploadList}>
            {entries.map((entry, index) => (
              <li className={cl.uploadItem} key={`${entry.file.name}-${index}`}>
                <span className={cl.episodeNumber}>{Number(startNumber) + index || nextNumber + index}</span>
                <span className={cl.uploadMain}>
                  <b className={cl.uploadName}>{entry.file.name}</b>
                  <small>
                    {formatFileSize(entry.file.size)}
                    {entry.status === 'done' ? ' • загружено' : ''}
                    {entry.status === 'failed' ? ` • ошибка: ${entry.error ?? 'не удалось'}` : ''}
                  </small>
                </span>
                {entry.status === 'done' ? (
                  <span className={cl.uploadStatusDone}>✓</span>
                ) : (
                  <Btn
                    variant='danger'
                    disabled={uploading}
                    onClick={() => setEntries((all) => all.filter((_, i) => i !== index))}
                  >
                    Убрать
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {progress && (
        <UploadProgress
          percent={progress.percent}
          label={`Загрузка ${progress.index} из ${progress.total}: ${progress.name}`}
        />
      )}
    </Dialog>
  )
}
