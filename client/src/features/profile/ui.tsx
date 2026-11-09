import { useMutation } from '@apollo/client'
import { DragEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { CREATE_POST } from '@/shared/graphql/schema'
import { Dialog } from '@/shared/ui/dialog'
import { EmojiPanel } from '@/shared/ui/emoji-panel'
import { UploadProgress } from '@/shared/ui/progress'

import { usePostStore } from './module'
import cl from './ui.module.css'

const MAX_LENGTH = 255

/** Превью выбранных файлов: адреса освобождаются, когда файлы убирают или окно закрывается. */
const usePreviews = (files: File[]) => {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls])
  return urls
}

/**
 * Окно «Новый пост»: область для фото и видео (кнопка или перетаскивание), текст со смайликами и публикация.
 * Черновик (текст и файлы) хранится в сторе, поэтому окно можно закрыть и вернуться.
 */
export const PostDialog = ({
  onClose,
  communityId,
  onPublished,
}: {
  onClose: () => void
  communityId?: number
  /** Запись отправлена на сервер (в сообществе участника она уйдёт на проверку). */
  onPublished?: () => void
}) => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const description = usePostStore((s) => s.description)
  const images = usePostStore((s) => s.images)
  const videos = usePostStore((s) => s.videos)
  const errorCreate = usePostStore((s) => s.error_create)
  const uploadProgress = usePostStore((s) => s.uploadProgress)
  const changeText = usePostStore((s) => s.changeText)
  const setFiles = usePostStore((s) => s.setFiles)
  const setVideoFiles = usePostStore((s) => s.setVideoFiles)
  const removeImage = usePostStore((s) => s.removeImage)
  const removeVideo = usePostStore((s) => s.removeVideo)
  const send = usePostStore((s) => s.send)
  const [createPost, { error, loading }] = useMutation(CREATE_POST)

  const imageUrls = usePreviews(images)
  const videoUrls = usePreviews(videos)
  const input = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [dragging, setDragging] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const hasMedia = images.length + videos.length > 0
  const canSend = (description.trim().length > 0 || hasMedia) && !loading && uploadProgress === null

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list)
    const photos = files.filter((f) => f.type.startsWith('image/'))
    const clips = files.filter((f) => f.type.startsWith('video/'))
    if (photos.length) void setFiles(photos)
    if (clips.length) setVideoFiles(clips)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const insertEmoji = (emoji: string) => {
    const el = textarea.current
    const start = el?.selectionStart ?? description.length
    const end = el?.selectionEnd ?? description.length
    changeText(description.slice(0, start) + emoji + description.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  const publish = async () => {
    if (!canSend) return
    await send(createPost, refreshData.id ?? 0, communityId)
    // Если отправка удалась, стор очистил черновик
    const state = usePostStore.getState()
    if (!state.description && !state.images.length && !state.videos.length) {
      onPublished?.()
      onClose()
    }
  }

  const message = errorCreate || error?.message

  return (
    <Dialog
      title={communityId ? 'Новая запись в сообществе' : 'Новый пост'}
      width={520}
      onClose={onClose}
      busy={loading}
      footer={
        <>
          <span className={cl.counter}>
            {description.length}/{MAX_LENGTH}
          </span>
          <button type='button' className={cl.publish} disabled={!canSend} onClick={() => void publish()}>
            {loading ? 'Публикация…' : 'Опубликовать'}
          </button>
        </>
      }
    >
      <input
        ref={input}
        type='file'
        multiple
        hidden
        accept='image/*,video/*'
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {hasMedia ? (
        <div className={cl.grid} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {images.map((image, index) => (
            <div key={`${image.name}-${index}`} className={cl.tile}>
              <img src={imageUrls[index]} alt='' className={cl.tileMedia} />
              <button type='button' className={cl.tileRemove} title='Убрать' onClick={() => removeImage(image)}>
                ×
              </button>
            </div>
          ))}
          {videos.map((video, index) => (
            <div key={`${video.name}-${index}`} className={cl.tile}>
              <video src={videoUrls[index]} className={cl.tileMedia} muted preload='metadata' />
              <span className={cl.tileBadge}>▶ {video.name}</span>
              <button type='button' className={cl.tileRemove} title='Убрать' onClick={() => removeVideo(video)}>
                ×
              </button>
            </div>
          ))}
          <button type='button' className={`${cl.tile} ${cl.tileAdd}`} onClick={() => input.current?.click()}>
            ＋
          </button>
        </div>
      ) : (
        <div
          className={`${cl.drop} ${dragging ? cl.dropActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className={cl.dropIcon}>⭡</span>
          <b>Добавьте фото или видео</b>
          <button type='button' className={cl.pick} onClick={() => input.current?.click()}>
            Загрузить с устройства
          </button>
          <span className={cl.hint}>или перетащите файлы сюда</span>
        </div>
      )}

      <div className={cl.textWrap}>
        <textarea
          ref={textarea}
          className={cl.textarea}
          placeholder='Напишите что-нибудь…'
          value={description}
          maxLength={MAX_LENGTH}
          autoFocus
          onChange={(e) => changeText(e.target.value)}
        />
        <span className={cl.emojiWrap}>
          <button type='button' className={cl.emojiButton} title='Смайлики' onClick={() => setEmojiOpen((v) => !v)}>
            🙂
          </button>
          {emojiOpen && <EmojiPanel onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
        </span>
      </div>

      {message && <p className={cl.error}>{message}</p>}
      {uploadProgress !== null && <UploadProgress percent={uploadProgress} label='Публикация поста' />}
    </Dialog>
  )
}
