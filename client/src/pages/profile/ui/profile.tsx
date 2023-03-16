import Content from '@/shared/content'
import { ArtWork } from '@/widgets/profile'

import cl from './styles/profile.module.less'

export const Profile = () => {
  document.title = 'AniDale - Профиль'
  return (
    <Content className={cl.content}>
      <ArtWork />
    </Content>
  )
}
