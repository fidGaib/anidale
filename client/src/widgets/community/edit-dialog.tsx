import { useMutation, useQuery } from '@apollo/client'
import { useRef, useState } from 'react'

import { CommunityAvatar, communityImageUrl } from '@/entities/community'
import {
  COMMUNITY_MEMBERS,
  SET_COMMUNITY_CONTACTS,
  SET_COMMUNITY_LINKS,
  UPDATE_COMMUNITY,
} from '@/shared/graphql/schema'
import { Btn } from '@/shared/ui/btn'
import { DeleteIcon } from '@/shared/ui/delete-icon'
import { Dialog } from '@/shared/ui/dialog'
import { CheckField, Field } from '@/shared/ui/field'
import { FormError } from '@/shared/ui/notice'

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
  contacts: { position: string; user: { id?: number | null } }[]
}

/** Окно «Управление сообществом»: название, статус, описание, сайт, аватарка и обложка. */
export const EditCommunityDialog = ({ community, onClose }: { community: EditableCommunity; onClose: () => void }) => {
  const [update, { loading, error }] = useMutation(UPDATE_COMMUNITY)
  const [saveLinks, linksState] = useMutation(SET_COMMUNITY_LINKS)
  const [isClosed, setIsClosed] = useState(community.isClosed)
  const [saveContacts, contactsState] = useMutation(SET_COMMUNITY_CONTACTS)
  const members = useQuery(COMMUNITY_MEMBERS, { variables: { id: community.id, limit: 100, offset: 0 } })
  const [contacts, setContacts] = useState(
    community.contacts.map((c) => ({ userId: c.user.id ?? 0, position: c.position })),
  )
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
      await saveContacts({ variables: { id: community.id, contacts } })
      onClose()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Dialog
      title='Управление сообществом'
      width={520}
      busy={loading || linksState.loading || contactsState.loading}
      onClose={onClose}
      footer={
        <>
          <Btn variant='secondary' disabled={loading} onClick={onClose}>
            Отмена
          </Btn>
          <Btn variant='primary' disabled={!name.trim() || loading} onClick={() => void save()}>
            {loading ? 'Сохранение…' : 'Сохранить'}
          </Btn>
        </>
      }
    >
      <div className={cl.avatarRow}>
        {avatarPreview ? (
          <img className={cl.avatarPreview} src={avatarPreview} alt='' />
        ) : (
          <CommunityAvatar name={name} avatar={community.avatar} size={64} />
        )}
        <Btn variant='secondary' onClick={() => avatarInput.current?.click()}>
          Сменить аватарку
        </Btn>
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
        <Btn variant='secondary' onClick={() => coverInput.current?.click()}>
          {shownCover ? 'Сменить обложку' : 'Добавить обложку'}
        </Btn>
        {shownCover && (
          <Btn
            variant='danger'
            onClick={() => {
              setCover(null)
              setRemoveCover(true)
            }}
          >
            Убрать обложку
          </Btn>
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

      <Field label='Название' value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      <Field
        label='Статус'
        value={status}
        maxLength={140}
        placeholder='Короткая подпись под названием'
        onChange={(e) => setStatus(e.target.value)}
      />
      <Field.Area
        label='Описание'
        value={description}
        maxLength={2000}
        rows={5}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Field
        label='Сайт'
        value={website}
        maxLength={200}
        placeholder='https://'
        onChange={(e) => setWebsite(e.target.value)}
      />
      <CheckField
        checked={isClosed}
        onChange={(e) => setIsClosed(e.target.checked)}
        hint='Стену и участников видят только участники. Если сделать сообщество открытым, все заявки будут приняты'
      >
        Закрытое сообщество
      </CheckField>

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
          <Btn variant='danger' title='Убрать' onClick={() => setLinks(links.filter((_, i) => i !== index))}>
            <DeleteIcon />
          </Btn>
        </div>
      ))}
      {links.length < 10 && (
        <Btn variant='secondary' onClick={() => setLinks([...links, { title: '', url: '' }])}>
          ＋ Добавить ссылку
        </Btn>
      )}
      <p className={cl.sectionTitle}>Контакты</p>
      {contacts.map((contact, index) => (
        <div key={index} className={cl.linkRow}>
          <select
            className={cl.select}
            value={contact.userId}
            onChange={(e) =>
              setContacts(contacts.map((c, i) => (i === index ? { ...c, userId: Number(e.target.value) } : c)))
            }
          >
            {(members.data?.getCommunityMembers ?? []).map((m) => (
              <option key={m.user.id} value={m.user.id ?? 0}>
                {m.user.login}
              </option>
            ))}
          </select>
          <input
            value={contact.position}
            maxLength={60}
            placeholder='Должность'
            onChange={(e) =>
              setContacts(contacts.map((c, i) => (i === index ? { ...c, position: e.target.value } : c)))
            }
          />
          <Btn variant='danger' title='Убрать' onClick={() => setContacts(contacts.filter((_, i) => i !== index))}>
            <DeleteIcon />
          </Btn>
        </div>
      ))}
      {contacts.length < 10 && (members.data?.getCommunityMembers.length ?? 0) > 0 && (
        <Btn
          onClick={() =>
            setContacts([...contacts, { userId: members.data?.getCommunityMembers[0].user.id ?? 0, position: '' }])
          }
        >
          ＋ Добавить контакт
        </Btn>
      )}
      <FormError>{(error || linksState.error || contactsState.error)?.message}</FormError>
    </Dialog>
  )
}
