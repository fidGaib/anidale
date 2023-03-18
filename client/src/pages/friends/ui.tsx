import CardUser from '@/entities/friends/ui'
import Content from '@/shared/content'

import cl from './ui.module.less'

export const Friends = () => {
  return (
    <Content id={cl.content}>
      <CardUser />
    </Content>
  )
}
