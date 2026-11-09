import Content from '@/shared/content'
import Posts from '@/widgets/post'

import cl from './ui.module.css'

export const Bookmarks = () => {
  document.title = 'AniDale - Закладки'
  return (
    <Content id={cl.content}>
      <h2 className={cl.title}>Закладки</h2>
      <Posts mode='bookmarks' />
    </Content>
  )
}
