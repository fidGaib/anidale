import { useMutation } from '@apollo/client'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { REGISTRATION } from '@/shared/graphql/schema'
import { isPasswordReady, PASSWORD_MIN } from '@/shared/lib/password'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'
import { PasswordMeter } from '@/shared/ui/password-meter'

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
    watch,
    formState: { errors },
  } = useForm<InputValues>()

  const setRefreshData = useRefreshStore((state) => state.setRefreshData)
  const [REG, { data, error }] = useMutation(REGISTRATION)
  const email = watch('email') ?? ''
  const pass = watch('pass') ?? ''
  const canSubmit = isPasswordReady(pass, [email])
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
        <Input {...register('email', { required: 'Введите почту' })} type='email' placeholder='E-mail...' />
        {errors.email && <p>{errors.email.message}</p>}
        <Input
          {...register('pass', {
            required: 'Введите пароль',
            minLength: { value: PASSWORD_MIN, message: `Пароль должен быть не короче ${PASSWORD_MIN} символов` },
          })}
          type='password'
          placeholder='Пароль...'
        />
        <div className={cl.passwordMeter}>
          <PasswordMeter password={pass} userInputs={[email]} />
        </div>
        {errors.pass && <p>{errors.pass.message}</p>}
        <Input
          {...register('pass2', {
            validate: (value, formValues) => value === formValues.pass || 'Пароли не совпадают',
          })}
          type='password'
          placeholder='Подтвердите пароль...'
        />
        {errors.pass2 ? <p>{errors.pass2.message}</p> : ''}
        <ButtonUI type='submit' disabled={!canSubmit}>
          Регистрация
        </ButtonUI>
        <p className={cl.redirect}>
          Есть аккаунт? - <Link to={'/signin'}>Войти</Link>
        </p>
      </form>
    </div>
  )
}
