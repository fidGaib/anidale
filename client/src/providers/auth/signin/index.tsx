import { useMutation } from '@apollo/client'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import Content from '@/shared/content'
import { SIGNIN } from '@/shared/graphql/schema'

import cl from '../registration/ui/styles/index.module.less'

const Signin = () => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [LOGIN, { data, loading, error }] = useMutation(SIGNIN)
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !pass) return
    LOGIN({ variables: { email, pass } })
  }
  if (loading) return <></>
  else if (data?.login.accessToken) {
    window.location.reload()
    return <></>
  } else
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
            <form onSubmit={(e) => onSubmit(e)}>
              {error && <p>{error.message}</p>}
              <input onChange={(e) => setEmail(e.target.value)} value={email} type='email' placeholder='E-mail...' />
              <input onChange={(e) => setPass(e.target.value)} value={pass} type='password' placeholder='Пароль...' />
              <button className={cl.sign}>Войти</button>
              <p className={cl.redirect}>
                Нет аккаунта? - <Link to={'/registration'}>Регистрация</Link>
              </p>
            </form>
          </div>
        </div>
      </Content>
    )
}

export default Signin