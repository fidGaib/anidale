import { useNavigate } from 'react-router-dom'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import { Toast, useNotificationsStore } from './module'
import cl from './ui.module.css'

const ToastItem = ({ toast }: { toast: Toast }) => {
  const navigate = useNavigate()
  const dismiss = useNotificationsStore((s) => s.dismissToast)
  return (
    <div
      className={`playground ${cl.toast}`}
      onClick={() => {
        dismiss(toast.id)
        navigate(toast.link)
      }}
    >
      {toast.avatar && <ImageLoading className={cl.avatar} src={useSrcAvatar(toast.avatar)} />}
      <div className={cl.body}>
        <p className={cl.title}>{toast.title}</p>
        <p className={`${cl.description} ${cl.clamp}`}>{toast.text}</p>
      </div>
      <img
        className={cl.toastClose}
        src='/icons/close.svg'
        alt='Закрыть'
        onClick={(e) => {
          e.stopPropagation()
          dismiss(toast.id)
        }}
      />
    </div>
  )
}

/** Всплывающие окна в правом нижнем углу: клик ведёт к источнику, крестик закрывает. */
export const Toasts = () => {
  const toasts = useNotificationsStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className={cl.toasts}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
