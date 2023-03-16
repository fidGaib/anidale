import { useState } from 'react'

import Content from '@/shared/content'

import cl from './styles/index.module.less'

export const Registration = () => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  return (
    <Content>
      <div className={cl.wrapLogin}>
        <div className={cl.conteiner}>
          <img
            src='https://sun7-16.userapi.com/impg/HckZ-lStpDExIb_I7Z7TDxtjmyplGxULPjVxcA/fXi4iP3-Hs8.jpg?size=604x518&quality=96&sign=5a31e03e6944d8e84772b1c73a2683ec&type=album'
            alt=''
          />
        </div>
        <div className={cl.conteiner}>
          <form>
            {/* <p>{loginStore.error}</p> */}
            <input onChange={(e) => setEmail(e.target.value)} value={email} type='email' placeholder='E-mail...' />
            <input onChange={(e) => setPass(e.target.value)} value={pass} type='password' placeholder='Пароль...' />
            <input
              onChange={(e) => setPass(e.target.value)}
              value={pass}
              type='password'
              placeholder='Подтвердите пароль...'
            />
            <button onClick={(e) => '' /*loginStore.login(e, email, pass) */} className={cl.sign}>
              Зарегистрироваться
            </button>
          </form>
        </div>
      </div>
    </Content>
  )
}
