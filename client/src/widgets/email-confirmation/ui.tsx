import { useMutation } from '@apollo/client'
import { useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { RESEND_VERIFICATION } from '@/shared/graphql/schema'
import Content from '@/shared/content'
import { ButtonUI } from '@/shared/ui/button/ui'

import cl from './ui.module.css'

/**
 * Напоминание о неподтверждённой почте. Показывается на всех страницах,
 * пока человек не перейдёт по ссылке из письма.
 */
export const EmailConfirmationBanner = () => {
  const me = useRefreshStore((state) => state.refreshData)
  const [resend, { loading, error }] = useMutation(RESEND_VERIFICATION)
  const [sent, setSent] = useState(false)

  if (!me.id || me.isActivated !== false) return null

  const send = async () => {
    try {
      await resend({ fetchPolicy: 'network-only' })
      setSent(true)
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Content>
      <div className={cl.banner}>
        <p className={cl.text}>
          <strong>Почта не подтверждена.</strong> Читать можно, но публикации, комментарии, сообщения и вступление в
          сообщества станут доступны после подтверждения.
        </p>
        <div className={cl.action}>
          <ButtonUI onClick={send} disabled={loading || sent}>
            {sent ? 'Письмо отправлено' : loading ? 'Отправляем…' : 'Отправить письмо ещё раз'}
          </ButtonUI>
          {error && <span className={cl.error}>{error.message}</span>}
        </div>
      </div>
    </Content>
  )
}
