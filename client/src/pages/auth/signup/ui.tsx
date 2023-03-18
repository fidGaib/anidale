import { FormSignup } from '@/features/auth'
import Content from '@/shared/content'

import cl from './ui.module.less'

export const Registration = () => {
  return (
    <Content>
      <div className={cl.wrapLogin}>
        <div className={cl.conteiner}>
          <img
            src='https://sun7-16.userapi.com/impg/HckZ-lStpDExIb_I7Z7TDxtjmyplGxULPjVxcA/fXi4iP3-Hs8.jpg?size=604x518&quality=96&sign=5a31e03e6944d8e84772b1c73a2683ec&type=album'
            alt=''
          />
        </div>
        <FormSignup />
      </div>
    </Content>
  )
}
