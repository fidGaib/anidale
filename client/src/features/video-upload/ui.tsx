import { useMutation } from '@apollo/client'
import { DragEvent, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { CREATE_COMMUNITY_VIDEO } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { formatFileSize } from '@/shared/lib/time'
import { validateUpload } from '@/shared/lib/upload-limits'
import { Dialog } from '@/shared/ui/dialog'
import { UploadProgress } from '@/shared/ui/progress'

import { MAX_TITLE, titleFromName } from './title'
import cl from './ui.module.css'

interface Props {
  /** Загрузить в альбом сообщества (нужны права администратора). */
  communityId?: number
  onClose: () => void
  /** Сколько роликов загрузилось: вызывается, когда очередь закончилась (и при частичном успехе). */
  onUploaded: (count: number) => void
}

interface Entry {
  file: File
  title: string
}

/**
 * Окно «Новое видео»: выбор файлов кнопкой или перетаскиванием, название каждого ролика, загрузка по одному
 * (каждое видео отдельным запросом, поэтому лимит на запрос не мешает набору).
 */
export const VideoUploadDialog = ({ onClose, onUploaded, communityId }: Props) => {
  const me = useRefreshStore((state) => state.refreshData)
  const avatar = useSrcAvatar(me.avatar || '')
  const [createVideo] = useMutation(CREATE_COMMUNITY_VIDEO)
  const input = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<{ index: number; total: number; percent: number; name: string } | null>(null)

  const uploading = progress !== null

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter((file) => file.type.startsWith('video/'))
    if (!files.length) return setError('Выберите видеофайл')
    const problems: string[] = []
    const accepted: Entry[] = []
    for (const file of files) {
      const problem = validateUpload([file])
      if (problem) problems.push(problem)
      else accepted.push({ file, title: titleFromName(file.name) })
    }
    setError(problems.join('\n'))
    setEntries((all) => [...all, ...accepted])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!uploading) addFiles(e.dataTransfer.files)
  }

  const upload = async () => {
    if (!entries.length || uploading) return
    setError('')
    const failed: string[] = []
    const left: Entry[] = []
    let uploaded = 0
    for (const [index, entry] of entries.entries()) {
      const report = (percent: number) =>
        setProgress({ index: index + 1, total: entries.length, percent, name: entry.file.name })
      report(0)
      try {
        await createVideo({
          variables: { file: entry.file, title: entry.title.trim() || null, communityId },
          context: {
            fetchOptions: { onProgress: (event: UploadProgressEvent) => report(toPercent(event)) },
          },
        })
        uploaded += 1
      } catch (e) {
        failed.push(`«${entry.file.name}»: ${e instanceof Error ? e.message : 'не удалось загрузить'}`)
        left.push(entry)
      }
    }
    setProgress(null)
    if (uploaded) onUploaded(uploaded)
    if (failed.length) {
      // Неудавшиеся остаются в списке, чтобы можно было повторить
      setEntries(left)
      setError(failed.join('\n'))
      return
    }
    onClose()
  }

  return (
    <Dialog
      title='Новое видео'
      width={480}
      busy={uploading}
      onClose={onClose}
      footer={
        <>
          <span className={cl.total}>{entries.length ? `Выбрано: ${entries.length}` : 'Файлы не выбраны'}</span>
          <button
            type='button'
            className={cl.primary}
            disabled={!entries.length || uploading}
            onClick={() => void upload()}
          >
            {uploading ? 'Загрузка…' : 'Загрузить'}
          </button>
        </>
      }
    >
      <input
        ref={input}
        type='file'
        accept='video/*'
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <p className={cl.lead}>Выберите файл на компьютере или перетащите его в это окно</p>

      <div className={cl.author}>
        <span className={cl.label}>Автор видео</span>
        <div className={cl.authorBox}>
          <img className={cl.authorAvatar} src={avatar} alt='' />
          <span>{me.login}</span>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className={cl.list}>
          {entries.map((entry, index) => (
            <li key={`${entry.file.name}-${index}`} className={cl.item}>
              <div className={cl.itemHead}>
                <span className={cl.fileName}>{entry.file.name}</span>
                <span className={cl.fileSize}>{formatFileSize(entry.file.size)}</span>
                <button
                  type='button'
                  className={cl.remove}
                  title='Убрать'
                  disabled={uploading}
                  onClick={() => setEntries((all) => all.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
              <input
                className={cl.titleInput}
                value={entry.title}
                maxLength={MAX_TITLE}
                placeholder='Название'
                disabled={uploading}
                onChange={(e) =>
                  setEntries((all) => all.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div
        className={`${cl.drop} ${dragging ? cl.dropActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <button type='button' className={cl.pick} disabled={uploading} onClick={() => input.current?.click()}>
          {entries.length ? 'Добавить ещё' : 'Выбрать файл'}
        </button>
      </div>

      {progress && (
        <UploadProgress
          percent={progress.percent}
          label={`Загрузка ${progress.index} из ${progress.total}: ${progress.name}`}
        />
      )}
      {error && <p className={cl.error}>{error}</p>}
    </Dialog>
  )
}
