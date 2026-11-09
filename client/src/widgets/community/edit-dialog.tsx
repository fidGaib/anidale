import { useMutation } from '@apollo/client'
import { useRef, useState } from 'react'

import { CommunityAvatar, communityImageUrl } from '@/entities/community'
import { SET_COMMUNITY_LINKS, UPDATE_COMMUNITY } from '@/shared/graphql/schema'
import { Dialog } from '@/shared/ui/dialog'

import cl from './dialogs.module.css'
import { useFilePreview } from './use-file-preview'

export interface EditableCommunity {
  id: number
  name: string
  description: string
  status: string
  website: string
  avatar: string
  cover: string
  isClosed: boolean
  links: { title: string; url: string }[]
}

/** Окно «Управление сообществом»: название, статус, описание, сайт, аватарка и обложка. */
export const EditCommunityDialog = ({ community, onClose }: { community: EditableCommunity; onClose: () => void }) => {
  const [update, { loading, error }] = useMutation(UPDATE_COMMUNITY)
  const [saveLinks, linksState] = useMutation(SET_COMMUNITY_LINKS)
  const [isClosed, setIsClosed] = useState(community.isClosed)
  const [links, setLinks] = useState(community.links.map(({ title, url }) => ({ title, url })))
  const [name, setName] = useState(community.name)
  const [status, setStatus] = useState(community.status)
  const [description, setDescription] = useState(community.description)
  const [website, setWebsite] = useState(community.website)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const avatarPreview = useFilePreview(avatar)
  const coverPreview = useFilePreview(cover)
  const avatarInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  const shownCover = removeCover ? '' : coverPreview || communityImageUrl(community.cover)

  const save = async () => {
    if (!name.trim() || loading) return
    try {
      await update({
        variables: { id: community.id, name, status, description, website, isClosed, avatar, cover, removeCover },
      })
      await saveLinks({ variables: { id: community.id, links } })
      onClose()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Dialog
      title='Управление сообществом'
      width={520}
      busy={loading || linksState.loading}
      onClose={onClose}
      footer={
        <>
          <button type='button' className={cl.secondary} disabled={loading} onClick={onClose}>
            Отмена
          </button>
          <button type='button' className={cl.primary} disabled={!name.trim() || loading} onClick={() => void save()}>
            {loading ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className={cl.avatarRow}>
        {avatarPreview ? (
          <img className={cl.avatarPreview} src={avatarPreview} alt='' />
        ) : (
          <CommunityAvatar name={name} avatar={community.avatar} size={64} />
        )}
        <button type='button' className={cl.secondary} onClick={() => avatarInput.current?.click()}>
          Сменить аватарку
        </button>
        <input
          ref={avatarInput}
          type='file'
          accept='image/*'
          hidden
          onChange={(e) => {
            setAvatar(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>

      {shownCover && <img className={cl.coverPreview} src={shownCover} alt='' />}
      <div className={cl.row}>
        <button type='button' className={cl.secondary} onClick={() => coverInput.current?.click()}>
          {shownCover ? 'Сменить обложку' : 'Добавить обложку'}
        </button>
        {shownCover && (
          <button
            type='button'
            className={cl.danger}
            onClick={() => {
              setCover(null)
              setRemoveCover(true)
            }}
          >
            Убрать обложку
          </button>
        )}
        <input
          ref={coverInput}
          type='file'
          accept='image/*'
          hidden
          onChange={(e) => {
            setCover(e.target.files?.[0] ?? null)
            setRemoveCover(false)
            e.target.value = ''
          }}
        />
      </div>

      <label className={cl.field}>
        Название
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={cl.field}>
        Статус
        <input
          value={status}
          maxLength={140}
          placeholder='Короткая подпись под названием'
          onChange={(e) => setStatus(e.target.value)}
        />
      </label>
      <label className={cl.field}>
        Описание
        <textarea value={description} maxLength={2000} rows={5} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className={cl.field}>
        Сайт
        <input value={website} maxLength={200} placeholder='https://' onChange={(e) => setWebsite(e.target.value)} />
      </label>
      <label className={cl.check}>
        <input type='checkbox' checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />
        <span>
          Закрытое сообщество
          <small>
            Стену и участников видят только участники. Если сделать сообщество открытым, все заявки будут приняты
          </small>
        </span>
      </label>

      <p className={cl.sectionTitle}>Ссылки</p>
      {links.map((link, index) => (
        <div key={index} className={cl.linkRow}>
          <input
            value={link.title}
            maxLength={60}
            placeholder='Название'
            onChange={(e) => setLinks(links.map((l, i) => (i === index ? { ...l, title: e.target.value } : l)))}
          />
          <input
            value={link.url}
            maxLength={200}
            placeholder='https://'
            onChange={(e) => setLinks(links.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)))}
          />
          <button
            type='button'
            className={cl.danger}
            title='Убрать'
            onClick={() => setLinks(links.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {links.length < 10 && (
        <button type='button' className={cl.secondary} onClick={() => setLinks([...links, { title: '', url: '' }])}>
          ＋ Добавить ссылку
        </button>
      )}
      {(error || linksState.error) && <p className={cl.error}>{(error || linksState.error)?.message}</p>}
    </Dialog>
  )
}
