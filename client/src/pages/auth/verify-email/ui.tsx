import { useMutation } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { RESEND_VERIFICATION, VERIFY_EMAIL } from '@/shared/graphql/schema'
import Content from '@/shared/content'
import { ButtonUI } from '@/shared/ui/button/ui'

import cl from '../auth-pages.module.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

export const VerifyEmail = () => {
  document.title = 'AniDale - Подтверждение почты'
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? '' : 'В ссылке нет токена. Откройте письмо ещё раз.')
  const [verify] = useMutation(VERIFY_EMAIL)
  const [resend, resendState] = useMutation(RESEND_VERIFICATION)
  const [resent, setResent] = useState(false)
  const started = useRef(false)
  const me = useRefreshStore((state) => state.refreshData)
  const setRefreshData = useRefreshStore((state) => state.setRefreshData)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verify({ variables: { token }, fetchPolicy: 'network-only' })
      .then(() => {
        setStatus('success')
        setRefreshData({ isActivated: true })
      })
      .catch((error: Error) => {
        setStatus('error')
        setMessage(error.message)
      })
  }, [token, verify, setRefreshData])

  const sendAgain = async () => {
    try {
      await resend({ fetchPolicy: 'network-only' })
      setResent(true)
    } catch {
      // Текст ошибки показываем из состояния мутации
    }
  }

  const profileLink = me.id ? `/profile/${me.id}` : '/signin'

  return (
    <Content>
      <div className={cl.page}>
        <section className={cl.card}>
          <h1 className={cl.title}>Подтверждение почты</h1>
          {status === 'loading' && <p className={cl.text}>Проверяем ссылку…</p>}
          {status === 'success' && (
            <>
              <p className={`${cl.message} ${cl.success}`}>Почта подтверждена. Теперь можно публиковать записи, комментарии и писать сообщения.</p>
              <div className={cl.actions}>
                <Link className={cl.link} to={profileLink}>
                  Перейти в профиль
                </Link>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <p className={`${cl.message} ${cl.error}`}>{message || 'Ссылка недействительна или устарела.'}</p>
              {me.id && me.isActivated === false && (
                <div className={cl.actions}>
                  <ButtonUI onClick={sendAgain} disabled={resendState.loading || resent}>
                    {resent ? 'Письмо отправлено' : 'Отправить письмо ещё раз'}
                  </ButtonUI>
                  {resendState.error && <p className={cl.text}>{resendState.error.message}</p>}
                </div>
              )}
              <p className={cl.text}>
                <Link className={cl.link} to={profileLink}>
                  Вернуться на сайт
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </Content>
  )
}
