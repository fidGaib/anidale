import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { storageUrl } from '@/shared/config'

import { membersLabel } from './format'
import cl from './ui.module.css'

/** Адрес картинки сообщества: в базе лежит путь без расширения. */
export const communityImageUrl = (path: string) => (path ? storageUrl(`${path}.webp`) : '')

/** Круглая аватарка сообщества; без картинки — первая буква названия. */
export const CommunityAvatar = ({ name, avatar, size = 48 }: { name: string; avatar: string; size?: number }) => (
  <span className={cl.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }}>
    {avatar ? <img src={communityImageUrl(avatar)} alt='' /> : name.trim().charAt(0).toUpperCase() || '?'}
  </span>
)

export interface CommunityListItem {
  id: number
  name: string
  description: string
  status: string
  avatar: string
  membersCount: number
}

/** Строка списка сообществ: аватарка, название, подпись и кнопка действия. */
export const CommunityRow = ({ community, action }: { community: CommunityListItem; action?: ReactNode }) => (
  <div className={`playground ${cl.row}`}>
    <Link to={`/community/${community.id}`} className={cl.info}>
      <CommunityAvatar name={community.name} avatar={community.avatar} />
      <span className={cl.text}>
        <span className={cl.name}>{community.name}</span>
        <span className={cl.sub}>{community.status || membersLabel(community.membersCount)}</span>
        {community.status && <span className={cl.sub}>{membersLabel(community.membersCount)}</span>}
      </span>
    </Link>
    {action}
  </div>
)
