import { FormSignin } from '@/features/auth'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from '../signup/ui.module.css'

export const Signin = () => {
  document.title = 'AniDale - Вход'
  return (
    <Content id={cl.content}>
      <div className={`playground ${cl.wrapLogin}`}>
        <div className={cl.conteiner} id={cl.preview}>
          <ImageLoading
            src='https://sun7-16.userapi.com/impg/HckZ-lStpDExIb_I7Z7TDxtjmyplGxULPjVxcA/fXi4iP3-Hs8.jpg?size=604x518&quality=96&sign=5a31e03e6944d8e84772b1c73a2683ec&type=album'
            alt='anidale'
          />
        </div>
        <FormSignin />
      </div>
    </Content>
  )
}
