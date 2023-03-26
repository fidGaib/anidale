import CardUser from '@/entities/friends/ui'
import { useViewer } from '@/entities/viewer'
import Content from '@/shared/content'

import cl from './ui.module.less'

export const Friends = () => {
  const user = useViewer()
  document.title = `${user?.login} - Друзья`
  return (
    <Content id={cl.content}>
      <CardUser />
    </Content>
  )
}
