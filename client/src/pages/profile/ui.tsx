import { useQuery } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { useViewer } from '@/entities/viewer'
import { MakePost } from '@/features/profile'
import Content from '@/shared/content'
import { PROFILE } from '@/shared/graphql/schema'
import { PostsByUser } from '@/widgets/post'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  document.title = 'AniDale - Профиль'
  const user = useViewer()
  const { id } = useParams()
  const { data } = useQuery(PROFILE(parseInt(id || '')))
  return (
    <Content className={cl.content}>
      <ArtWork login={data?.getUser.login} avatar={data?.getUser.avatar} />
      {user?.id == id && <MakePost user={user} />}
      <PostsByUser id={3} limit={10} page={0} />
    </Content>
  )
}
