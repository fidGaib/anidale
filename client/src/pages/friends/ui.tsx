import { useReactiveVar } from '@apollo/client'

import { VarAuthData } from '@/app/providers/routes/AppRouter'
import CardUser from '@/entities/friends/ui'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

export const Friends = () => {
  const { login } = useReactiveVar(VarAuthData)
  document.title = `${login} - Друзья`
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
