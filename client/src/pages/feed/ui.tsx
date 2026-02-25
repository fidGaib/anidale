import { MeshBlockFeed } from '@/features/feed'
import Content from '@/shared/content'

import cl from './ui.module.css'

export const Feed = () => {
  document.title = 'AniDale - Лента'
  return (
    <>
      <Content id={cl.content}>
        <MeshBlockFeed />
      </Content>
    </>
  )
}
