import CardUser from '@/entities/friends/ui'
import { useViewer } from '@/entities/viewer'
import Content from '@/shared/content'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const Friends = () => {
  const user = useViewer()
  document.title = `${user?.login} - Друзья`
  return (
    <Content id={cl.content}>
      <div className={cl.meshBlock}>
        <div className={cl.mesh}>
          <p>Мои друзья</p>
        </div>
        <div className={cl.mesh}>
          <p>Все люди</p>
        </div>
      </div>
      <div className={cl.wrappSeacrh}>
        <Icon iconId='search' />
        <input type='text' placeholder='Найти...' className={cl.search} />
      </div>
      <CardUser />
    </Content>
  )
}
