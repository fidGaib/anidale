import { useMutation } from '@apollo/client'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import Content from '@/shared/content'
import { REGISTRATION } from '@/shared/graphql/schema'

import cl from './styles/index.module.less'

export const Registration = () => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [isError, setError] = useState('')
  const [REG, { data, error }] = useMutation(REGISTRATION)
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!email || !pass || !pass2) return
    if (pass !== pass2) return setError('Пароли не совпадают')
    REG({ variables: { email, pass, pass2 }, fetchPolicy: 'network-only' })
  }
  if (data?.registration.id) return <Navigate to='/signin' replace={false} />
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
            {isError && <p>{isError}</p>}
            <input onChange={(e) => setEmail(e.target.value)} value={email} type='email' placeholder='E-mail...' />
            <input onChange={(e) => setPass(e.target.value)} value={pass} type='password' placeholder='Пароль...' />
            <input
              onChange={(e) => setPass2(e.target.value)}
              value={pass2}
              type='password'
              placeholder='Подтвердите пароль...'
            />
            <button className={cl.sign}>Регистрация</button>
            <p className={cl.redirect}>
              Есть аккаунт? - <Link to={'/signin'}>Войти</Link>
            </p>
          </form>
        </div>
      </div>
    </Content>
  )
}
