import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { useViewer } from '@/entities/viewer'
import { MakePost } from '@/features/profile'
import Content from '@/shared/content'
import { PROFILE } from '@/shared/graphql/schema'
import Loader from '@/shared/loader'
import { Posts } from '@/widgets/post'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  const user = useViewer()
  document.title = `${user?.login} - Профиль`
  const params = useParams()
  const id = parseInt(params.id || '')
  const { data } = useQuery(PROFILE, { variables: { id } })
  if (!data?.getUser) return <Loader />
  return (
    <Content className={cl.content}>
      <ArtWork login={data.getUser.login || ''} avatar={data.getUser.avatar || ''} />
      {user?.id == id && <MakePost />}
      <Posts id={id} limit={10} page={0} />
    </Content>
  )
}
