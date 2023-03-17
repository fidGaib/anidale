import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'

import Content from '@/shared/content'
import { PROFILE } from '@/shared/graphql/schema'
import { ArtWork } from '@/widgets/profile'

import cl from './styles/profile.module.less'

export const Profile = () => {
  document.title = 'AniDale - Профиль'
  const { id } = useParams()
  const { data, error, loading } = useQuery(PROFILE(parseInt(id || '')))
  return (
    <Content className={cl.content}>
      <ArtWork login={data?.getUser.login} avatar={data?.getUser.avatar} />
    </Content>
  )
}
