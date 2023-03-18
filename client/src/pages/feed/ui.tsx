import Content from '@/shared/content'
import { Posts } from '@/widgets/post'

import cl from './ui.module.less'

export const Feed = () => {
  document.title = 'AniDale - Лента'

  return (
    <Content id={cl.content}>
      <Posts limit={10} page={0} />
    </Content>
  )
}
