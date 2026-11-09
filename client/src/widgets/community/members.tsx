import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { BAN_COMMUNITY_MEMBER, COMMUNITY_MEMBERS, SET_COMMUNITY_ADMIN } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { Dialog } from '@/shared/ui/dialog'

import cl from './dialogs.module.css'
import side from './ui.module.css'

const PREVIEW = 6
const PAGE = 30

interface Member {
  role: string
  isOwner: boolean
  user: { id?: number | null; login?: string | null; avatar?: string | null }
}

const Avatar = ({ avatar }: { avatar?: string | null }) => <img src={useSrcAvatar(avatar || '')} alt='' />

/** Карточка «Участники» справа: несколько человек и ссылка на полный список. */
export const MembersCard = ({
  id,
  count,
  isOwner,
  isAdmin,
  canView,
  onInvite,
}: {
  id: number
  count: number
  isOwner: boolean
  isAdmin: boolean
  canView: boolean
  onInvite?: () => void
}) => {
  const { data } = useQuery(COMMUNITY_MEMBERS, {
    variables: { id, limit: PREVIEW, offset: 0 },
    skip: !canView,
    fetchPolicy: 'cache-and-network',
  })
  const [open, setOpen] = useState(false)
  const members = (data?.getCommunityMembers ?? []) as Member[]

  return (
    <div className={`playground ${side.sideCard}`}>
      <button type='button' className={side.cardTitle} disabled={!canView} onClick={() => setOpen(true)}>
        Участники <span className={side.count}>{count}</span>
      </button>
      <div className={side.people}>
        {members.map((m) => (
          <Link key={m.user.id} to={`/profile/${m.user.id}`} className={side.person} title={m.user.login ?? ''}>
            <Avatar avatar={m.user.avatar} />
            <span>{m.user.login}</span>
          </Link>
        ))}
      </div>
      {!canView && <p className={side.muted}>Участников видят только участники сообщества</p>}
      {onInvite && (
        <button type='button' className={side.inviteButton} onClick={onInvite}>
          Пригласить друзей
        </button>
      )}
      {open && <MembersDialog id={id} isOwner={isOwner} isAdmin={isAdmin} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** Полный список участников: администраторы сверху; создатель назначает и снимает администраторов. */
const MembersDialog = ({
  id,
  isOwner,
  isAdmin,
  onClose,
}: {
  id: number
  isOwner: boolean
  isAdmin: boolean
  onClose: () => void
}) => {
  const { data, loading, fetchMore, refetch } = useQuery(COMMUNITY_MEMBERS, {
    variables: { id, limit: PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [setAdmin] = useMutation(SET_COMMUNITY_ADMIN)
  const [ban] = useMutation(BAN_COMMUNITY_MEMBER)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const members = (data?.getCommunityMembers ?? []) as Member[]

  const more = async () => {
    const res = await fetchMore({ variables: { offset: members.length } })
    if ((res.data?.getCommunityMembers?.length ?? 0) < PAGE) setDone(true)
  }

  const toggle = async (m: Member) => {
    setBusy(m.user.id ?? 0)
    try {
      await setAdmin({ variables: { id, userId: m.user.id ?? 0, admin: m.role !== 'admin' } })
      await refetch()
    } finally {
      setBusy(null)
    }
  }

  const banMember = async (m: Member) => {
    if (!window.confirm(`Заблокировать ${m.user.login}? Человек будет исключён из сообщества.`)) return
    setBusy(m.user.id ?? 0)
    try {
      await ban({ variables: { id, userId: m.user.id ?? 0 } })
      await refetch()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog title='Участники' width={440} onClose={onClose}>
      <div className={cl.members}>
        {loading && members.length === 0 && <p className={cl.hint}>Загрузка…</p>}
        {members.map((m) => (
          <div key={m.user.id} className={cl.member}>
            <Link to={`/profile/${m.user.id}`} onClick={onClose}>
              <Avatar avatar={m.user.avatar} />
              <span>
                {m.user.login}
                {m.isOwner ? (
                  <span className={cl.badge}> · создатель</span>
                ) : (
                  m.role === 'admin' && <span className={cl.badge}> · администратор</span>
                )}
              </span>
            </Link>
            {isAdmin && !m.isOwner && (m.role !== 'admin' || isOwner) && (
              <button
                type='button'
                className={cl.danger}
                disabled={busy === m.user.id}
                onClick={() => void banMember(m)}
              >
                Заблокировать
              </button>
            )}
            {isOwner && !m.isOwner && (
              <button
                type='button'
                className={cl.secondary}
                disabled={busy === m.user.id}
                onClick={() => void toggle(m)}
              >
                {m.role === 'admin' ? 'Снять права' : 'Сделать администратором'}
              </button>
            )}
          </div>
        ))}
        {members.length >= PAGE && !done && (
          <button type='button' className={cl.secondary} onClick={() => void more()}>
            Показать ещё
          </button>
        )}
      </div>
    </Dialog>
  )
}
