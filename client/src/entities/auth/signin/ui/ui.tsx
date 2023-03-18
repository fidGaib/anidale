import { useMutation } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { SIGNIN } from '@/shared/graphql/schema'
import { MeVar, isAuthVar } from '@/shared/store/state'
import Input from '@/shared/ui/input/intex'

import cl from './styles.module.less'

export const FormSignin = () => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [LOGIN, { data, error }] = useMutation(SIGNIN)
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !pass) return
    LOGIN({ variables: { email, pass }, fetchPolicy: 'network-only' })
  }
  if (data?.login.id) {
    isAuthVar(true)
    MeVar(data.login)
  }
  return (
    <div className={cl.conteiner}>
      <form className={cl.form} onSubmit={(e) => onSubmit(e)}>
        {error && <p>{error.message}</p>}
        <Input onChange={(e) => setEmail(e.target.value)} value={email} type='email' placeholder='E-mail...' />
        <Input onChange={(e) => setPass(e.target.value)} value={pass} type='password' placeholder='Пароль...' />
        <button className={cl.sign}>Войти</button>
        <p className={cl.redirect}>
          Нет аккаунта? - <Link to={'/signup'}>Регистрация</Link>
        </p>
      </form>
    </div>
  )
}
