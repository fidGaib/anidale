import { InputHTMLAttributes, forwardRef } from 'react'

import cl from './ui.module.less'

type Props = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <input className={cl.input} {...props} ref={ref} />
})
