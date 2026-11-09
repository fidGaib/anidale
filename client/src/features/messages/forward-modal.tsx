import { useQuery } from '@apollo/client'
import { useEffect, useMemo, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { GET_USERS } from '@/shared/graphql/schema'
import { Modal } from '@/shared/hooks/Modal'
import ButtonUI from '@/shared/ui/button'

import { Avatar } from './avatar'
import { useMessagesStore } from './module'
import cl from './ui.module.css'

/** Сколько получателей можно выбрать при пересылке (как на сервере). */
const MAX_FORWARD = 10

/** Окно пересылки: выбор получателей (до 10) с поиском. Уже знакомые собеседники идут первыми. */
export const ForwardModal = ({ messageIds, onClose }: { messageIds: number[]; onClose: () => void }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const conversations = useMessagesStore((s) => s.conversations)
  const forwardMessages = useMessagesStore((s) => s.forwardMessages)
  const [search, setSearch] = useState('')
  const [serverSearch, setServerSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setServerSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  const { data, loading } = useQuery(GET_USERS, {
    variables: { limit: 100, offset: 0, search: serverSearch || undefined },
  })
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const users = useMemo(() => {
    const known = new Set(conversations.map((c) => c.user.id))
    const needle = search.trim().toLowerCase()
    return (data?.getUsers ?? [])
      .filter((u) => u.id !== myId && (!needle || u.login.toLowerCase().includes(needle)))
      .sort((a, b) => Number(known.has(b.id)) - Number(known.has(a.id)))
  }, [data, conversations, myId, search])

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_FORWARD ? [...prev, id] : prev,
    )

  const submit = async () => {
    if (!selected.length || busy) return
    setBusy(true)
    const ok = await forwardMessages(messageIds, selected)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal active setActive={(open) => !open && !busy && onClose()}>
      <div className={cl.forwardBox}>
        <p className={cl.deleteTitle}>Переслать сообщение</p>
        <input
          className={cl.forwardSearch}
          placeholder='Найти человека…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={cl.forwardList}>
          {loading && <p className={cl.hint}>Загрузка…</p>}
          {!loading && users.length === 0 && <p className={cl.hint}>Никого не найдено</p>}
          {users.map((u) => (
            <label key={u.id} className={cl.forwardUser}>
              <input type='checkbox' checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <Avatar src={u.avatar} />
              <span className={cl.login}>{u.login}</span>
            </label>
          ))}
        </div>
        <p className={cl.deleteHint}>
          Выбрано: {selected.length} из {MAX_FORWARD}
        </p>
        <ButtonUI disabled={!selected.length || busy} onClick={() => void submit()}>
          {busy ? 'Пересылка…' : 'Переслать'}
        </ButtonUI>
      </div>
    </Modal>
  )
}
