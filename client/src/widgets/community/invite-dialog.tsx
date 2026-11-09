import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { GET_FRIENDS, INVITE_TO_COMMUNITY } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { FormError, Hint } from '@/shared/ui/notice'

import cl from './dialogs.module.css'

const Friend = ({
  user,
  state,
  onInvite,
}: {
  user: { id: number; login: string; avatar: string }
  state: 'idle' | 'sent'
  onInvite: () => void
}) => (
  <div className={cl.member}>
    <img src={useSrcAvatar(user.avatar)} alt='' />
    <span style={{ flex: 1 }}>{user.login}</span>
    <Btn variant='secondary' disabled={state === 'sent'} onClick={onInvite}>
      {state === 'sent' ? 'Приглашён' : 'Пригласить'}
    </Btn>
  </div>
)

/** Окно «Пригласить друзей»: каждому приходит уведомление со ссылкой на сообщество. */
export const InviteDialog = ({ id, onClose }: { id: number; onClose: () => void }) => {
  const me = useRefreshStore((s) => s.refreshData.id) ?? 0
  const { data, loading } = useQuery(GET_FRIENDS, { variables: { id: me, limit: 100, offset: 0 }, skip: !me })
  const [invite, { error }] = useMutation(INVITE_TO_COMMUNITY)
  const [sent, setSent] = useState<number[]>([])
  const [failed, setFailed] = useState('')
  const friends = data?.getFriends ?? []

  return (
    <Dialog title='Пригласить друзей' width={440} onClose={onClose}>
      <div className={cl.members}>
        {loading && <Hint>Загрузка…</Hint>}
        {!loading && friends.length === 0 && <Hint>У вас пока нет друзей, которых можно пригласить</Hint>}
        {friends.map((friend) => (
          <Friend
            key={friend.id}
            user={{ id: friend.id ?? 0, login: friend.login ?? '', avatar: friend.avatar ?? '' }}
            state={sent.includes(friend.id ?? 0) ? 'sent' : 'idle'}
            onInvite={async () => {
              setFailed('')
              try {
                await invite({ variables: { id, userId: friend.id ?? 0 } })
                setSent((all) => [...all, friend.id ?? 0])
              } catch (e) {
                setFailed(e instanceof Error ? e.message : 'Не удалось пригласить')
              }
            }}
          />
        ))}
        {(failed || error) && <FormError>{failed || error?.message}</FormError>}
      </div>
    </Dialog>
  )
}
