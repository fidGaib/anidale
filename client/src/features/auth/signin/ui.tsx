import { useMutation } from '@apollo/client'
import { useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { ViewerVar } from '@/entities/viewer'
import { SIGNIN } from '@/shared/graphql/schema'
import Input from '@/shared/ui/input/intex'

import cl from './styles.module.less'

interface InputValues {
  email: string
  pass: string
}

export const FormSignin = () => {
  const { register, handleSubmit } = useForm<InputValues>()
  const [LOGIN, { data, error }] = useMutation(SIGNIN)

  const onSubmit: SubmitHandler<InputValues> = async (variables) => {
    await LOGIN({ variables, fetchPolicy: 'network-only' })
  }

  if (data?.login) {
    ViewerVar(data.login)
  }

  return (
    <div className={cl.container}>
      <form className={cl.form} onSubmit={handleSubmit(onSubmit)}>
        {error && <p>{error.message}</p>}
        <Input {...register('email')} type='email' placeholder='E-mail...' required />
        <Input {...register('pass')} type='password' placeholder='Пароль...' required />
        <button className={cl.sign}>Войти</button>
        <p className={cl.redirect}>
          Нет аккаунта? - <Link to={'/signup'}>Регистрация</Link>
        </p>
      </form>
    </div>
  )
}
