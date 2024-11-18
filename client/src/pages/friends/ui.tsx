import { useRefreshStore } from '@/app/providers/routes/model'
import CardUser from '@/entities/friends/ui'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

export const Friends = () => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  document.title = `${refreshData.login} - Друзья`
  return (
    <Content id={cl.content}>
      <div className={cl.meshBlock}>
        <div className={`playground ${cl.mesh}`}>
          <p>Мои друзья</p>
        </div>
        <div className={`playground ${cl.mesh}`}>
          <p>Все люди</p>
        </div>
      </div>
      <div className={cl.wrappSeacrh}>
        <ImageLoading src='/icons/search.svg' className={cl.svg} />
        <Input type='text' placeholder='Найти...' id={`playground ${cl.search}`} />
      </div>
      <CardUser />
    </Content>
  )
}
