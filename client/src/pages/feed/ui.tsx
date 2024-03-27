import { MeshBlockFeed } from '@/features/profile'
import Content from '@/shared/content'
import { Posts } from '@/widgets/post'

import cl from './ui.module.less'
import {  HistoryFeed } from '@/entities/history'

export const Feed = () => {
  document.title = 'AniDale - Лента'

  return (
    <Content id={cl.content}>
      <HistoryFeed/>
      <MeshBlockFeed />
      <Posts/>
    </Content>
  )
}
