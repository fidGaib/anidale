import cl from './ui.module.less'

interface ModalProps {
  active: boolean
  setActive: (arg: boolean) => void
  children: any
}
export const Modal = ({ active, setActive, children }: ModalProps) => {
  return (
    <div className={active ? `${cl.modal} ${cl.modal__active}` : `${cl.modal}`} onClick={() => setActive(false)}>
      <div
        className={active ? `playground ${cl.modal__content} ${cl.active}` : `playground ${cl.modal__content}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
