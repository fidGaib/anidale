import { useParams } from 'react-router-dom'

import { MakePost } from '@/features/profile'
import { ViewerVar } from '@/processes/auth'
import Content from '@/shared/content'
import { Posts } from '@/widgets/post'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  const user = ViewerVar()
  document.title = `${user.login} - Профиль`
  const params = useParams()
  const id = parseInt(params.id || '')
  return (
    <Content className={cl.content}>
      <ArtWork login={user.login} avatar={user.avatar} />
      {user.id == id && <MakePost />}
      <Posts id={id} limit={10} page={0} />
    </Content>
  )
}
