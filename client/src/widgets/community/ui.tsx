import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { CommunityAvatar, communityImageUrl, membersLabel } from '@/entities/community'
import { ProfileMusicList } from '@/features/music'
import { PostDialog } from '@/features/profile'
import { VideoUploadDialog } from '@/features/video-upload'
import { COMMUNITY, JOIN_COMMUNITY, LEAVE_COMMUNITY, REMOVE_COMMUNITY } from '@/shared/graphql/schema'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'
import { RichText } from '@/shared/ui/rich-text'
import { TabItem, Tabs } from '@/shared/ui/tabs'

import Posts from '../post'
import { BansPanel, RequestsPanel, SuggestedPanel } from './admin-panels'
import { Discussions } from './discussions'
import { EditCommunityDialog } from './edit-dialog'
import { InviteDialog } from './invite-dialog'
import { CommunityPhotos, CommunityVideos } from './media'
import { MembersCard } from './members'
import { membershipButton } from './membership'
import { CommunityStories } from './stories'
import cl from './ui.module.css'

type Tab = 'wall' | 'discussions' | 'photos' | 'music' | 'videos' | 'suggested' | 'requests' | 'bans'

/** Страница сообщества: обложка, подписка, описание, вкладки (стена, фото, видео, управление) и участники. */
export const CommunityPage = () => {
  const id = parseInt(useParams().id || '')
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery(COMMUNITY, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  })
  const [join, joinState] = useMutation(JOIN_COMMUNITY)
  const [leave, leaveState] = useMutation(LEAVE_COMMUNITY)
  const [remove] = useMutation(REMOVE_COMMUNITY)
  const [tab, setTab] = useState<Tab>('wall')
  const [editing, setEditing] = useState(false)
  const [posting, setPosting] = useState(false)
  const [videoDialog, setVideoDialog] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [createMenu, setCreateMenu] = useState<{ x: number; y: number } | null>(null)
  // Меняется после добавления видео: вкладка «Видео» загружается заново
  const [videosKey, setVideosKey] = useState(0)

  const community = data?.getCommunity
  if (!community) {
    return (
      <div className={`playground ${cl.notice}`}>
        {loading ? 'Загрузка…' : error?.message || 'Сообщество не найдено'}
      </div>
    )
  }
  document.title = `${community.name} - Сообщество`

  const busy = joinState.loading || leaveState.loading
  const actionError = joinState.error || leaveState.error
  const button = membershipButton(community)
  const press = async () => {
    try {
      if (button.action === 'leave') await leave({ variables: { id } })
      else if (button.action === 'join') await join({ variables: { id } })
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const canInvite = community.isMember && (!community.isClosed || community.canModerate)
  const menuItems: ContextMenuItem[] = [
    { label: 'Управление', svg: '/icons/edit.svg', onClick: () => setEditing(true), hidden: !community.isAdmin },
    {
      label: community.isAdmin ? 'Участники и роли' : 'Управление участниками',
      svg: '/icons/friends.svg',
      onClick: () => setMembersOpen(true),
      hidden: !(community.isAdmin || community.canModerate),
    },
    { label: 'Пригласить друзей', svg: '/icons/friends.svg', onClick: () => setInviting(true), hidden: !canInvite },
    {
      label: 'Скопировать ссылку',
      svg: '/icons/copy.svg',
      onClick: () => void navigator.clipboard?.writeText(window.location.href).catch(() => undefined),
    },
    {
      label: 'Удалить сообщество',
      svg: '/icons/delete.svg',
      danger: true,
      hidden: !community.isOwner,
      onClick: () => {
        if (!window.confirm(`Удалить сообщество «${community.name}» вместе со всеми записями?`)) return
        void remove({ variables: { id } }).then(() => navigate('/communities'))
      },
    },
  ]

  // Администратор создаёт то же, что и в профиле, но от имени сообщества
  const createItems: ContextMenuItem[] = [
    { label: 'Запись', svg: '/icons/note.svg', onClick: () => setPosting(true) },
    { label: 'Статья', svg: '/icons/edit.svg', onClick: () => navigate(`/article/new?community=${id}`) },
    { label: 'Фото', svg: '/icons/add_photo.svg', onClick: () => setTab('photos') },
    { label: 'Видео', svg: '/icons/video.svg', onClick: () => setVideoDialog(true) },
  ]

  const tabs: TabItem<Tab>[] = [
    { id: 'wall', title: 'Стена', show: true },
    { id: 'discussions', title: 'Обсуждения', show: community.canView },
    { id: 'photos', title: 'Фото', show: community.canView },
    { id: 'music', title: 'Музыка', show: community.canView },
    { id: 'videos', title: 'Видео', show: community.canView },
    { id: 'suggested', title: 'Предложенные', badge: community.suggestedCount, show: community.canModerate },
    {
      id: 'requests',
      title: 'Заявки',
      badge: community.requestsCount,
      show: community.canModerate && community.isClosed,
    },
    { id: 'bans', title: 'Чёрный список', show: community.canModerate },
  ]

  const cover = communityImageUrl(community.cover)
  const created = formatDateTime(toTimestamp(community.createdAt))

  return (
    <>
      <div className={`playground ${cl.card}`}>
        <div className={cl.cover}>
          {cover ? <img className={cl.coverImage} src={cover} alt='' /> : <div className={cl.coverEmpty} />}
        </div>
        <div className={cl.head}>
          <div className={cl.avatarWrap}>
            <CommunityAvatar name={community.name} avatar={community.avatar} size={110} />
          </div>
          <div className={cl.identity}>
            <h1 className={cl.name}>
              {community.name}
              {community.isClosed && (
                <span className={cl.lock} title='Закрытое сообщество'>
                  🔒
                </span>
              )}
            </h1>
            {community.status && <p className={cl.status}>{community.status}</p>}
            <span className={cl.muted}>
              {community.isClosed ? 'Закрытое сообщество · ' : ''}
              {membersLabel(community.membersCount)}
            </span>
          </div>
          <div className={cl.actions}>
            {community.isOwner ? (
              <ButtonUI onClick={() => setEditing(true)}>Управление</ButtonUI>
            ) : (
              <ButtonUI onClick={() => void press()} disabled={busy || button.disabled}>
                {button.label}
              </ButtonUI>
            )}
            <button
              type='button'
              className={cl.more}
              title='Действия'
              aria-haspopup='menu'
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMenu(menu ? null : { x: rect.left, y: rect.bottom + 4 })
              }}
            >
              ⋯
            </button>
          </div>
        </div>
        {actionError && <p className={cl.error}>{actionError.message}</p>}
      </div>

      <div className={cl.layout}>
        <div className={cl.main}>
          {(community.description ||
            community.website ||
            community.links.length > 0 ||
            community.contacts.length > 0) && (
            <div className={`playground ${cl.info}`}>
              {community.description && (
                <p className={cl.description}>
                  <RichText text={community.description} />
                </p>
              )}
              {community.website && (
                <p className={cl.line}>
                  <span className={cl.muted}>Сайт: </span>
                  <a href={community.website} target='_blank' rel='noopener noreferrer nofollow'>
                    {community.website}
                  </a>
                </p>
              )}
              {community.links.length > 0 && (
                <div className={cl.links}>
                  {community.links.map((link) => (
                    <a key={link.id} href={link.url} target='_blank' rel='noopener noreferrer nofollow'>
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
              {community.contacts.length > 0 && (
                <div className={cl.contacts}>
                  <span className={cl.muted}>Контакты</span>
                  {community.contacts.map((contact) => (
                    <Link key={contact.user.id} to={`/profile/${contact.user.id}`}>
                      <b>{contact.user.login}</b>
                      {contact.position && <span className={cl.muted}> · {contact.position}</span>}
                    </Link>
                  ))}
                </div>
              )}
              <p className={cl.muted}>Создано {created}</p>
            </div>
          )}

          <Tabs card items={tabs} value={tab} onChange={setTab} />

          {notice && <p className={cl.noticeOk}>{notice}</p>}

          {tab === 'wall' && (
            <>
              {community.canPublish ? (
                <button
                  type='button'
                  className={`playground ${cl.compose}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setCreateMenu({ x: rect.left + 20, y: rect.bottom + 4 })
                  }}
                >
                  ＋ Создать от имени сообщества…
                </button>
              ) : (
                community.isMember && (
                  <button type='button' className={`playground ${cl.compose}`} onClick={() => setPosting(true)}>
                    Предложить запись…
                  </button>
                )
              )}
              {community.canView ? (
                <Posts communityId={id} canManage={community.canManagePosts} fill />
              ) : (
                <div className={`playground ${cl.closedBox}`}>
                  <b>🔒 Это закрытое сообщество</b>
                  Стену и участников видят только участники. Подайте заявку, чтобы вступить.
                </div>
              )}
            </>
          )}
          {tab === 'discussions' && (
            <Discussions
              communityId={id}
              canModerate={community.canModerate}
              canWrite={community.isMember && !community.isBanned}
            />
          )}
          {tab === 'music' && <ProfileMusicList scope={`community:${id}`} canAdd={community.canPublish} />}
          {tab === 'photos' && <CommunityPhotos id={id} canAdd={community.canPublish} />}
          {tab === 'videos' && (
            <CommunityVideos key={videosKey} id={id} canAdd={community.canPublish} onAdd={() => setVideoDialog(true)} />
          )}
          {tab === 'suggested' && community.canModerate && <SuggestedPanel id={id} onChanged={() => void refetch()} />}
          {tab === 'requests' && community.canModerate && <RequestsPanel id={id} onChanged={() => void refetch()} />}
          {tab === 'bans' && community.canModerate && <BansPanel id={id} />}
        </div>
        <aside className={cl.aside}>
          {community.canView && (
            <CommunityStories
              id={id}
              name={community.name}
              avatar={community.avatar}
              canPublish={community.canPublish}
              canManage={community.canManagePosts}
            />
          )}
          <MembersCard
            id={id}
            count={community.membersCount}
            viewer={community}
            canView={community.canView}
            open={membersOpen}
            onOpen={() => setMembersOpen(true)}
            onClose={() => setMembersOpen(false)}
            onInvite={canInvite ? () => setInviting(true) : undefined}
          />
        </aside>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {createMenu && (
        <ContextMenu x={createMenu.x} y={createMenu.y} items={createItems} onClose={() => setCreateMenu(null)} />
      )}
      {editing && <EditCommunityDialog community={community} onClose={() => setEditing(false)} />}
      {inviting && <InviteDialog id={id} onClose={() => setInviting(false)} />}
      {posting && (
        <PostDialog
          communityId={id}
          onClose={() => setPosting(false)}
          onPublished={() => {
            if (!community.canPublish) {
              setNotice('Запись отправлена администраторам на проверку. После одобрения она появится на стене.')
              setTimeout(() => setNotice(''), 8000)
            }
          }}
        />
      )}
      {videoDialog && (
        <VideoUploadDialog
          communityId={id}
          onClose={() => setVideoDialog(false)}
          onUploaded={() => {
            setVideosKey((key) => key + 1)
            setTab('videos')
          }}
        />
      )}
    </>
  )
}
