// import { HistoryFeed } from '@/entities/history'
import { MeshBlockFeed } from '@/features/feed'
import Content from '@/shared/content'

import cl from './ui.module.less'

export const Feed = () => {
  document.title = 'AniDale - Лента'
  return (
    <>
      {/* <HistoryFeed /> */}
      <Content id={cl.content}>
        <MeshBlockFeed />
      </Content>
    </>
  )
}
