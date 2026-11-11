import { useMutation } from '@apollo/client'
import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import Content from '@/shared/content'
import { RESET_PASSWORD } from '@/shared/graphql/schema'
import { isPasswordReady, PASSWORD_MIN } from '@/shared/lib/password'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'
import { PasswordMeter } from '@/shared/ui/password-meter'

import cl from '../auth-pages.module.css'

export const ResetPassword = () => {
  document.title = 'AniDale - Новый пароль'
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [done, setDone] = useState(false)
  const [mismatch, setMismatch] = useState(false)
  const [resetPassword, { loading, error }] = useMutation(RESET_PASSWORD)
  const canSubmit = Boolean(token) && isPasswordReady(pass) && pass2 === pass

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMismatch(pass2 !== pass)
    if (!canSubmit) return
    try {
      await resetPassword({ variables: { token, pass, pass2 }, fetchPolicy: 'network-only' })
      setDone(true)
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Content>
      <div className={cl.page}>
        <section className={cl.card}>
          <h1 className={cl.title}>Новый пароль</h1>
          {done ? (
            <>
              <p className={`${cl.message} ${cl.success}`}>
                Пароль изменён. Все старые сессии завершены — войдите с новым паролем.
              </p>
              <Link className={cl.link} to='/signin'>
                Перейти ко входу
              </Link>
            </>
          ) : (
            <>
              <p className={cl.text}>
                Придумайте пароль не короче {PASSWORD_MIN} символов. Не используйте популярные пароли и данные от аккаунта.
              </p>
              {!token && <p className={`${cl.message} ${cl.error}`}>В ссылке нет токена. Запросите письмо ещё раз.</p>}
              <form className={cl.form} onSubmit={submit}>
                <Input
                  type='password'
                  placeholder='Новый пароль...'
                  value={pass}
                  onChange={(event) => setPass(event.target.value)}
                  autoComplete='new-password'
                />
                <div className={cl.meter}>
                  <PasswordMeter password={pass} />
                </div>
                <Input
                  type='password'
                  placeholder='Повторите пароль...'
                  value={pass2}
                  onChange={(event) => {
                    setPass2(event.target.value)
                    setMismatch(false)
                  }}
                  autoComplete='new-password'
                />
                {mismatch && <p className={`${cl.message} ${cl.error}`}>Пароли не совпадают</p>}
                {error && <p className={`${cl.message} ${cl.error}`}>{error.message}</p>}
                <div className={cl.actions}>
                  <ButtonUI type='submit' disabled={!canSubmit || loading}>
                    {loading ? 'Сохраняем…' : 'Сохранить пароль'}
                  </ButtonUI>
                  <Link className={cl.link} to='/forgot-password'>
                    Запросить новую ссылку
                  </Link>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </Content>
  )
}
