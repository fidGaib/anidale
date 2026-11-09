import { useMutation } from '@apollo/client'
import { DragEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { MusicPicker } from '@/features/music'
import { VideoPicker } from '@/features/video-upload'
import { CREATE_POST } from '@/shared/graphql/schema'
import { Btn } from '@/shared/ui/btn'
import { DeleteIcon } from '@/shared/ui/delete-icon'
import { Dialog } from '@/shared/ui/dialog'
import { EmojiPanel } from '@/shared/ui/emoji-panel'
import { FormError } from '@/shared/ui/notice'
import { UploadProgress } from '@/shared/ui/progress'

import { MAX_POST_TRACKS, usePostStore } from './module'
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
  const music = usePostStore((s) => s.music)
  const pickedMusic = usePostStore((s) => s.pickedMusic)
  const pickedVideos = usePostStore((s) => s.pickedVideos)
  const pickVideos = usePostStore((s) => s.pickVideos)
  const unpickVideo = usePostStore((s) => s.unpickVideo)
  const [pickingVideo, setPickingVideo] = useState(false)
  const setMusicFiles = usePostStore((s) => s.setMusicFiles)
  const removeMusic = usePostStore((s) => s.removeMusic)
  const pickMusic = usePostStore((s) => s.pickMusic)
  const unpickMusic = usePostStore((s) => s.unpickMusic)
  const audioInput = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [dragging, setDragging] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const hasMedia = images.length + videos.length > 0
  const hasMusic = music.length + pickedMusic.length > 0
  const hasPicked = pickedVideos.length > 0
  const canSend =
    (description.trim().length > 0 || hasMedia || hasMusic || hasPicked) && !loading && uploadProgress === null

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
          <Btn variant='primary' disabled={!canSend} onClick={() => void publish()}>
            {loading ? 'Публикация…' : 'Опубликовать'}
          </Btn>
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
                <DeleteIcon />
              </button>
            </div>
          ))}
          {videos.map((video, index) => (
            <div key={`${video.name}-${index}`} className={cl.tile}>
              <video src={videoUrls[index]} className={cl.tileMedia} muted preload='metadata' />
              <span className={cl.tileBadge}>▶ {video.name}</span>
              <button type='button' className={cl.tileRemove} title='Убрать' onClick={() => removeVideo(video)}>
                <DeleteIcon />
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
          <Btn variant='primary' onClick={() => input.current?.click()}>
            Загрузить с устройства
          </Btn>
          <span className={cl.hint}>или перетащите файлы сюда</span>
        </div>
      )}

      {(hasMusic || hasPicked) && (
        <div className={cl.tracks}>
          {pickedVideos.map((video) => (
            <div key={`video-${video.id}`} className={cl.track}>
              <span className={cl.trackName}>🎬 {video.title}</span>
              <button type='button' className={cl.trackRemove} title='Убрать' onClick={() => unpickVideo(video.id)}>
                <DeleteIcon />
              </button>
            </div>
          ))}
          {pickedMusic.map((track) => (
            <div key={`picked-${track.id}`} className={cl.track}>
              <span className={cl.trackName}>
                🎵 {track.title} <small>{track.artist}</small>
              </span>
              <button type='button' className={cl.trackRemove} title='Убрать' onClick={() => unpickMusic(track.id)}>
                <DeleteIcon />
              </button>
            </div>
          ))}
          {music.map((file, index) => (
            <div key={`${file.name}-${index}`} className={cl.track}>
              <span className={cl.trackName}>🎵 {file.name}</span>
              <button type='button' className={cl.trackRemove} title='Убрать' onClick={() => removeMusic(file)}>
                <DeleteIcon />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={cl.attach}>
        <input
          ref={audioInput}
          type='file'
          multiple
          hidden
          accept='audio/*'
          onChange={(e) => {
            if (e.target.files) setMusicFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Btn variant='ghost' onClick={() => audioInput.current?.click()}>
          🎵 Загрузить музыку
        </Btn>
        <Btn variant='ghost' onClick={() => setPicking(true)}>
          🎧 Из моей музыки
        </Btn>
        <Btn variant='ghost' onClick={() => setPickingVideo(true)}>
          🎬 Из моих видео
        </Btn>
      </div>

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

      {message && <FormError>{message}</FormError>}
      {uploadProgress !== null && <UploadProgress percent={uploadProgress} label='Публикация поста' />}
      {pickingVideo && (
        <VideoPicker
          selected={pickedVideos}
          onClose={() => setPickingVideo(false)}
          onDone={(videos) => {
            pickVideos(videos)
            setPickingVideo(false)
          }}
        />
      )}
      {picking && (
        <MusicPicker
          selected={pickedMusic}
          limit={MAX_POST_TRACKS - music.length}
          onClose={() => setPicking(false)}
          onDone={(tracks) => {
            pickMusic(tracks)
            setPicking(false)
          }}
        />
      )}
    </Dialog>
  )
}
