import { FormEvent, useState } from 'react'

import { Track } from '@/features/music/module'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Empty, FormError, Hint } from '@/shared/ui/notice'

import { HeartIcon, NoteIcon, PlusIcon, TrashIcon } from './icons'
import { coverGradient, sameTrack, tracksLabel, useMusicPageStore } from './model'
import cl from './ui.module.css'

interface CreateProps {
  onClose: () => void
  /** Если задан — открыть созданный плейлист. */
  onCreated?: (id: number) => void
}

/** Окно создания плейлиста: только название, остальное добавится из списка треков. */
export const CreatePlaylistDialog = ({ onClose, onCreated }: CreateProps) => {
  const createPlaylist = useMusicPageStore((s) => s.createPlaylist)
  const error = useMusicPageStore((s) => s.error)
  const clearError = useMusicPageStore((s) => s.clearError)
  const [title, setTitle] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    clearError()
    const id = createPlaylist(title)
    if (id === null) return
    onCreated?.(id)
    onClose()
  }

  return (
    <Dialog
      title='Новый плейлист'
      width={440}
      onClose={onClose}
      footer={
        <>
          <Hint>Плейлисты пока хранятся в этом браузере</Hint>
          <Btn variant='primary' type='submit' form='playlist-create' disabled={!title.trim()}>
            Создать
          </Btn>
        </>
      }
    >
      <form id='playlist-create' className={cl.dialogForm} onSubmit={submit}>
        <Field
          label='Название'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Например, «Дорога домой»'
          maxLength={80}
          autoFocus
          required
        />
        <FormError>{error}</FormError>
      </form>
    </Dialog>
  )
}

interface RenameProps {
  playlistId: number
  current: string
  onClose: () => void
}

/** Переименование плейлиста. */
export const RenamePlaylistDialog = ({ playlistId, current, onClose }: RenameProps) => {
  const renamePlaylist = useMusicPageStore((s) => s.renamePlaylist)
  const error = useMusicPageStore((s) => s.error)
  const clearError = useMusicPageStore((s) => s.clearError)
  const [title, setTitle] = useState(current)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    clearError()
    renamePlaylist(playlistId, title)
    if (!title.trim()) return
    onClose()
  }

  return (
    <Dialog
      title='Название плейлиста'
      width={440}
      onClose={onClose}
      footer={
        <Btn variant='primary' type='submit' form='playlist-rename' disabled={!title.trim()}>
          Сохранить
        </Btn>
      }
    >
      <form id='playlist-rename' className={cl.dialogForm} onSubmit={submit}>
        <Field
          label='Название'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          autoFocus
          required
        />
        <FormError>{error}</FormError>
      </form>
    </Dialog>
  )
}

interface AddProps {
  track: Track
  onClose: () => void
}

/** Куда положить трек: список плейлистов и быстрое создание нового. */
export const AddToPlaylistDialog = ({ track, onClose }: AddProps) => {
  const playlists = useMusicPageStore((s) => s.playlists)
  const addToPlaylist = useMusicPageStore((s) => s.addToPlaylist)
  const createPlaylist = useMusicPageStore((s) => s.createPlaylist)
  const [title, setTitle] = useState('')

  const createAndAdd = (event: FormEvent) => {
    event.preventDefault()
    const id = createPlaylist(title)
    if (id === null) return
    addToPlaylist(id, track)
    setTitle('')
    onClose()
  }

  return (
    <Dialog
      title='Добавить в плейлист'
      width={460}
      onClose={onClose}
      footer={
        <>
          <Hint>{track.title}</Hint>
          <Btn onClick={onClose}>Готово</Btn>
        </>
      }
    >
      <div className={cl.pickTrack}>
        <span className={cl.pickCover} style={{ background: coverGradient(track) }}>
          <NoteIcon />
        </span>
        <span className={cl.pickText}>
          <b>{track.title}</b>
          <small>{track.artist}</small>
        </span>
      </div>

      {playlists.length === 0 ? (
        <Empty>Плейлистов пока нет — создайте первый ниже</Empty>
      ) : (
        <div className={cl.pickList}>
          {playlists.map((playlist) => {
            const added = playlist.tracks.some((item) => sameTrack(item, track))
            return (
              <button
                key={playlist.id}
                type='button'
                className={cl.pickRow}
                disabled={added}
                onClick={() => {
                  addToPlaylist(playlist.id, track)
                  onClose()
                }}
              >
                <span className={cl.pickCover} style={{ background: coverGradient(playlist.tracks[0] ?? track) }}>
                  {playlist.tracks.length ? <NoteIcon /> : <HeartIcon />}
                </span>
                <span className={cl.pickText}>
                  <b>{playlist.title}</b>
                  <small>{tracksLabel(playlist.tracks.length)}</small>
                </span>
                {added ? <span className={cl.pickAdded}>уже есть</span> : <PlusIcon className={cl.pickPlus} />}
              </button>
            )
          })}
        </div>
      )}

      <form className={cl.pickCreate} onSubmit={createAndAdd}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Новый плейлист'
          maxLength={80}
          aria-label='Название нового плейлиста'
        />
        <Btn variant='primary' type='submit' disabled={!title.trim()}>
          <PlusIcon width={16} height={16} /> Создать
        </Btn>
      </form>
    </Dialog>
  )
}

interface DeleteProps {
  playlistId: number
  title: string
  onClose: () => void
}

/** Подтверждение удаления плейлиста: треки с сервера не удаляются. */
export const DeletePlaylistDialog = ({ playlistId, title, onClose }: DeleteProps) => {
  const deletePlaylist = useMusicPageStore((s) => s.deletePlaylist)
  const flash = useMusicPageStore((s) => s.flash)

  return (
    <Dialog
      title='Удалить плейлист?'
      width={420}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant='danger'
            onClick={() => {
              deletePlaylist(playlistId)
              flash('Плейлист удалён')
              onClose()
            }}
          >
            <TrashIcon width={16} height={16} /> Удалить
          </Btn>
        </>
      }
    >
      <p className={cl.dialogText}>
        «{title}» исчезнет из списка. Сами треки останутся в музыке — удаляется только подборка.
      </p>
    </Dialog>
  )
}
