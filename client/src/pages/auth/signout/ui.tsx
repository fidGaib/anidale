import { useQuery } from '@apollo/client'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { SIGNOUT } from '@/shared/graphql/schema'

export const Signout = () => {
  const { data, loading, error } = useQuery(SIGNOUT, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: false,
  })
  const [reset] = useRefreshStore((state) => [state.reset])
  const navigate = useNavigate()
  useEffect(() => {
    if (loading) return
    if (error) {
      console.error('Ошибка выхода:', error)
      // Можно показать уведомление пользователю
      navigate('/error', { state: { message: 'Не удалось выйти из системы' } })
      return
    }
    if (data?.logout === true) {
      reset()
      navigate('/signin', { replace: true }) // Мягкий редирект
    } else {
      // Если logout вернул false/null — что-то пошло не так
      console.warn('Выход не подтверждён сервером')
      navigate('/signin', { replace: true })
    }
  }, [data, loading, error, reset, navigate])
  if (loading) {
    return <div>Выход...</div>
  }

  return null
  // if (data?.logout) {
  //   reset()
  //   window.location.href = `/signin`
  // }
}
