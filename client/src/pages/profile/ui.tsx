import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { MakePost } from '@/features/profile'
import { ViewerVar } from '@/processes/auth'
import Content from '@/shared/content'
import { PROFILE } from '@/shared/graphql/schema'
import { Posts } from '@/widgets/post'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'network-only' })
  document.title = `${data?.getUser?.login} - Профиль`
  const viewer = ViewerVar()
  return (
    <Content className={cl.content}>
      <ArtWork login={data?.getUser?.login} avatar={data?.getUser?.avatar} />
      {viewer.id === id && <MakePost />}
      <Posts id={id} limit={10} page={0} />
    </Content>
  )
}
