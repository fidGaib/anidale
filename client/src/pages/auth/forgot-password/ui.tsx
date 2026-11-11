import { useMutation } from '@apollo/client'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import Content from '@/shared/content'
import { REQUEST_PASSWORD_RESET } from '@/shared/graphql/schema'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'

import cl from '../auth-pages.module.css'

export const ForgotPassword = () => {
  document.title = 'AniDale - Восстановление пароля'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [requestReset, { loading, error }] = useMutation(REQUEST_PASSWORD_RESET)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    try {
      await requestReset({ variables: { email: email.trim() }, fetchPolicy: 'network-only' })
      setSent(true)
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Content>
      <div className={cl.page}>
        <section className={cl.card}>
          <h1 className={cl.title}>Восстановление пароля</h1>
          <p className={cl.text}>
            Укажите почту, на которую зарегистрирован аккаунт. Мы пришлём одноразовую ссылку для смены пароля.
          </p>
          {sent ? (
            <>
              <p className={`${cl.message} ${cl.success}`}>
                Если такая почта зарегистрирована, письмо уже отправлено. Ссылка действует 1 час.
              </p>
              <p className={cl.text}>Проверьте «Спам», если письма нет во входящих.</p>
              <Link className={cl.link} to='/signin'>
                Вернуться ко входу
              </Link>
            </>
          ) : (
            <form className={cl.form} onSubmit={submit}>
              <Input
                type='email'
                placeholder='E-mail...'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete='email'
                required
              />
              {error && <p className={`${cl.message} ${cl.error}`}>{error.message}</p>}
              <div className={cl.actions}>
                <ButtonUI type='submit' disabled={loading}>
                  {loading ? 'Отправляем…' : 'Отправить ссылку'}
                </ButtonUI>
                <Link className={cl.link} to='/signin'>
                  Вспомнили пароль? Войти
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </Content>
  )
}
