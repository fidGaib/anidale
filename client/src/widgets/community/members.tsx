import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { BAN_COMMUNITY_MEMBER, COMMUNITY_MEMBERS, SET_COMMUNITY_ROLE } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Hint } from '@/shared/ui/notice'

import cl from './dialogs.module.css'
import { ROLE_LABELS, assignableRoles, canBanMember, roleBadge } from './roles'
import side from './ui.module.css'

/** Права просматривающего в сообществе. */
export interface Viewer {
  role: string
  isOwner: boolean
  isAdmin: boolean
  canModerate: boolean
}

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
  viewer,
  canView,
  open,
  onOpen,
  onClose,
  onInvite,
}: {
  id: number
  count: number
  viewer: Viewer
  canView: boolean
  /** Окно со всеми участниками открыто. */
  open: boolean
  onOpen: () => void
  onClose: () => void
  onInvite?: () => void
}) => {
  const { data } = useQuery(COMMUNITY_MEMBERS, {
    variables: { id, limit: PREVIEW, offset: 0 },
    skip: !canView,
    fetchPolicy: 'cache-and-network',
  })
  const members = (data?.getCommunityMembers ?? []) as Member[]
  const manages = viewer.isAdmin || viewer.canModerate

  return (
    <div className={`playground ${side.sideCard}`}>
      <button type='button' className={side.cardTitle} disabled={!canView} onClick={onOpen}>
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
      {canView && manages && (
        <Btn block onClick={onOpen}>
          {viewer.isAdmin ? 'Участники и роли' : 'Управление участниками'}
        </Btn>
      )}
      {onInvite && (
        <button type='button' className={side.inviteButton} onClick={onInvite}>
          Пригласить друзей
        </button>
      )}
      {open && <MembersDialog id={id} viewer={viewer} onClose={onClose} />}
    </div>
  )
}

/** Полный список участников: администраторы сверху; создатель назначает и снимает администраторов. */
const MembersDialog = ({ id, viewer, onClose }: { id: number; viewer: Viewer; onClose: () => void }) => {
  const { data, loading, fetchMore, refetch } = useQuery(COMMUNITY_MEMBERS, {
    variables: { id, limit: PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [setRole] = useMutation(SET_COMMUNITY_ROLE)
  const [ban] = useMutation(BAN_COMMUNITY_MEMBER)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const members = (data?.getCommunityMembers ?? []) as Member[]

  const more = async () => {
    const res = await fetchMore({ variables: { offset: members.length } })
    if ((res.data?.getCommunityMembers?.length ?? 0) < PAGE) setDone(true)
  }

  const changeRole = async (m: Member, role: string) => {
    setBusy(m.user.id ?? 0)
    try {
      await setRole({ variables: { id, userId: m.user.id ?? 0, role } })
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
    <Dialog title={viewer.isAdmin ? 'Участники и роли' : 'Участники'} width={480} onClose={onClose}>
      {viewer.isAdmin && (
        <Hint>
          Роль выбирается в списке справа от участника. Модератор следит за порядком, редактор ведёт содержимое,
          администратор управляет всем. Роль администратора выдаёт только создатель.
        </Hint>
      )}
      <div className={cl.members}>
        {loading && members.length === 0 && <Hint>Загрузка…</Hint>}
        {members.map((m) => (
          <div key={m.user.id} className={cl.member}>
            <Link to={`/profile/${m.user.id}`} onClick={onClose}>
              <Avatar avatar={m.user.avatar} />
              <span>
                {m.user.login}
                {roleBadge(m.role, m.isOwner) && <span className={cl.badge}> · {roleBadge(m.role, m.isOwner)}</span>}
              </span>
            </Link>
            {assignableRoles(viewer, m).length > 0 && (
              <select
                className={cl.select}
                value={m.role}
                disabled={busy === m.user.id}
                onChange={(e) => void changeRole(m, e.target.value)}
              >
                {assignableRoles(viewer, m).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            )}
            {canBanMember(viewer, m) && (
              <Btn variant='danger' disabled={busy === m.user.id} onClick={() => void banMember(m)}>
                Заблокировать
              </Btn>
            )}
          </div>
        ))}
        {members.length >= PAGE && !done && (
          <Btn variant='secondary' onClick={() => void more()}>
            Показать ещё
          </Btn>
        )}
      </div>
    </Dialog>
  )
}
