import { useMutation } from '@apollo/client'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { SIGNIN } from '@/shared/graphql/schema'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'

import cl from './styles.module.css'

interface InputValues {
  email: string
  pass: string
}

export const FormSignin = () => {
  const { register, handleSubmit } = useForm<InputValues>()
  const [LOGIN, { data, error }] = useMutation(SIGNIN)

  const [_, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
  const onSubmit: SubmitHandler<InputValues> = async (variables) => {
    await LOGIN({ variables, fetchPolicy: 'network-only' })
  }

  if (data?.login) {
    setRefreshData(data?.login)
    window.location.href = `/profile/${data?.login.id}`
  }

  return (
    <div className={cl.container}>
      <form className={cl.form} onSubmit={handleSubmit(onSubmit)}>
        {error && <p>{error.message}</p>}
        <Input {...register('email')} type='email' placeholder='E-mail...' required />
        <Input {...register('pass')} type='password' placeholder='Пароль...' required />
        <ButtonUI>Войти</ButtonUI>
        <p className={cl.redirect}>
          Нет аккаунта? - <Link to={'/signup'}>Регистрация</Link>
        </p>
      </form>
    </div>
  )
}
