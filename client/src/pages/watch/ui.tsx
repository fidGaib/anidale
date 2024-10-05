import { ViedeoWrapper } from '@/entities/watch'
import { CommentAnime } from '@/features/watch'
import Content from '@/shared/content'

import cl from './ui.module.less'

export const Watch = () => {
  return (
    <Content id={cl.content}>
      <ViedeoWrapper />
      <CommentAnime />
    </Content>
  )
}
