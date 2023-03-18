import { useMutation } from '@apollo/client'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { REGISTRATION } from '@/shared/graphql/schema'
import Input from '@/shared/ui/input/intex'

import cl from './styles.module.less'

export const FormSignup = () => {
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
    <div className={cl.conteiner}>
      <form className={cl.form} onSubmit={(e) => onSubmit(e)}>
        {error && <p>{error.message}</p>}
        {isError && <p>{isError}</p>}
        <Input onChange={(e) => setEmail(e.target.value)} value={email} type='email' placeholder='E-mail...' />
        <Input onChange={(e) => setPass(e.target.value)} value={pass} type='password' placeholder='Пароль...' />
        <Input
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
  )
}
