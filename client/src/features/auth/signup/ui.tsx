import { useMutation } from '@apollo/client'
import { useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { ViewerVar } from '@/entities/viewer'
import { REGISTRATION } from '@/shared/graphql/schema'
import Input from '@/shared/ui/input/intex'

import cl from './styles.module.less'

interface InputValues {
  email: string
  pass: string
  pass2: string
}

export const FormSignup = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InputValues>()

  const [REG, { data, error }] = useMutation(REGISTRATION)
  const onSubmit: SubmitHandler<InputValues> = ({ email, pass, pass2 }) => {
    REG({ variables: { email, pass, pass2 }, fetchPolicy: 'network-only' })
  }

  if (data?.registration) {
    ViewerVar(data.registration)
  }

  return (
    <div className={cl.container}>
      <form className={cl.form} onSubmit={handleSubmit(onSubmit)}>
        {error && <p>{error.message}</p>}
        <Input {...register('email')} type='email' placeholder='E-mail...' />
        <Input {...register('pass')} type='password' placeholder='Пароль...' />
        <Input
          {...register('pass2', { validate: (value, formValues) => value === formValues.pass })}
          type='password'
          placeholder='Подтвердите пароль...'
        />
        {errors.pass2 ? <p>Пароли не совпадают</p> : ''}
        <button className={cl.sign}>Регистрация</button>
        <p className={cl.redirect}>
          Есть аккаунт? - <Link to={'/signin'}>Войти</Link>
        </p>
      </form>
    </div>
  )
}
