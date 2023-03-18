import cl from './index.module.less'

interface Props {
  value?: string
  placeholder?: string
  onChange?: (e: any) => void
  id?: string
  type?: string
}
export const Input = (props: Props) => {
  return <input className={cl.input} {...props} />
}
