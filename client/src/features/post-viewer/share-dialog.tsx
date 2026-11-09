import { useEffect, useState } from 'react'

import { client } from '@/app/providers/apollo-client'
import { RefreshStore } from '@/app/providers/routes/model'
import { useNotificationsStore } from '@/features/notifications/module'
import { GET_USERS, REPOST_POST, SEND_MESSAGE } from '@/shared/graphql/schema'
import { copyText } from '@/shared/lib/clipboard'
import ButtonUI from '@/shared/ui/button'

import { postLink } from './post-link'
import { Dialog } from './post-menu'
import { useShareStore } from './share-store'
import { usePostSync } from './sync'
import cl from './ui.module.css'

const MAX_RECIPIENTS = 10

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Что-то пошло не так')

const Wall = ({ id, repostsCount, onDone }: { id: number; repostsCount: number; onDone: () => void }) => {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const publish = async () => {
    setBusy(true)
    try {
      await client.mutate({ mutation: REPOST_POST, variables: { id, comment: comment.trim() || null } })
      usePostSync.getState().publish({ id, repostsCount: repostsCount + 1 })
      useNotificationsStore.getState().pushToast({
        title: 'Репост',
        text: 'Запись добавлена на вашу страницу',
        link: `/profile/${RefreshStore.getState().refreshData.id ?? 0}`,
        avatar: '',
      })
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <textarea
        autoFocus
        className={cl.dialogText}
        placeholder='Добавьте комментарий…'
        value={comment}
        maxLength={2000}
        rows={4}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className={cl.dialogError}>{error}</p>}
      <div className={cl.dialogButtons}>
        <ButtonUI disabled={busy} onClick={() => void publish()}>
          Опубликовать
        </ButtonUI>
      </div>
    </>
  )
}

interface FoundUser {
  id: number
  login: string
}

const Message = ({ id, onDone }: { id: number; onDone: () => void }) => {
  const myId = RefreshStore.getState().refreshData.id ?? 0
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<FoundUser[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Поиск людей на сервере с задержкой, как в окне пересылки сообщений
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await client.query({
          query: GET_USERS,
          variables: { limit: 30, offset: 0, search: search.trim() || undefined },
          fetchPolicy: 'network-only',
        })
        setUsers((data.getUsers ?? []).filter((u) => u.id !== myId).map((u) => ({ id: u.id, login: u.login })))
      } catch (e) {
        setError(errorText(e))
      }
    }, 250)
    return () => clearTimeout(t)
  }, [search, myId])

  const toggle = (userId: number) =>
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : prev.length < MAX_RECIPIENTS
        ? [...prev, userId]
        : prev,
    )

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      for (const to of selected) {
        await client.mutate({
          mutation: SEND_MESSAGE,
          variables: { to, text: postLink(id), files: null, replyTo: null },
        })
      }
      useNotificationsStore.getState().pushToast({
        title: 'Отправлено',
        text: selected.length > 1 ? `Ссылка отправлена: ${selected.length} получателям` : 'Ссылка на пост отправлена',
        link: '/messages',
        avatar: '',
      })
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        autoFocus
        className={cl.dialogText}
        placeholder='Найти человека…'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={cl.shareList}>
        {users.map((u) => (
          <label key={u.id} className={cl.reason}>
            <input type='checkbox' checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            {u.login}
          </label>
        ))}
        {users.length === 0 && <p className={cl.dialogHint}>Никого не найдено</p>}
      </div>
      {error && <p className={cl.dialogError}>{error}</p>}
      <div className={cl.dialogButtons}>
        <ButtonUI disabled={busy || selected.length === 0} onClick={() => void send()}>
          Отправить{selected.length ? ` (${selected.length})` : ''}
        </ButtonUI>
      </div>
    </>
  )
}

/** Окно «Поделиться»: на свою страницу, сообщением или ссылкой. Монтируется один раз в корне приложения. */
export const ShareDialogHost = () => {
  const target = useShareStore((s) => s.target)
  const close = useShareStore((s) => s.close)
  const [mode, setMode] = useState<'menu' | 'wall' | 'message'>('menu')
  const [copied, setCopied] = useState(false)
  const loggedIn = (RefreshStore.getState().refreshData.id ?? 0) > 0

  useEffect(() => {
    setMode('menu')
    setCopied(false)
  }, [target?.id])

  if (!target) return null
  return (
    <Dialog title='Поделиться постом' onClose={close}>
      {mode === 'menu' && (
        <div className={cl.shareMenu}>
          {loggedIn && <ButtonUI onClick={() => setMode('wall')}>На своей странице</ButtonUI>}
          {loggedIn && <ButtonUI onClick={() => setMode('message')}>В личном сообщении</ButtonUI>}
          <ButtonUI
            onClick={async () => {
              setCopied(await copyText(postLink(target.id)))
            }}
          >
            {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </ButtonUI>
          <ButtonUI onClick={close}>Закрыть</ButtonUI>
        </div>
      )}
      {mode === 'wall' && <Wall id={target.id} repostsCount={target.repostsCount} onDone={close} />}
      {mode === 'message' && <Message id={target.id} onDone={close} />}
    </Dialog>
  )
}
