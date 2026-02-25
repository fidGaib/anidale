import { useMutation } from '@apollo/client'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { REGISTRATION } from '@/shared/graphql/schema'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'

import cl from './styles.module.css'

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

  const [_, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
  const [REG, { data, error }] = useMutation(REGISTRATION)
  const onSubmit: SubmitHandler<InputValues> = ({ email, pass, pass2 }) => {
    REG({ variables: { email, pass, pass2 }, fetchPolicy: 'network-only' })
  }
  if (data?.registration) {
    setRefreshData(data?.registration)
    window.location.href = `/profile/${data?.registration.id}`
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
        <ButtonUI>Регистрация</ButtonUI>
        <p className={cl.redirect}>
          Есть аккаунт? - <Link to={'/signin'}>Войти</Link>
        </p>
      </form>
    </div>
  )
}
