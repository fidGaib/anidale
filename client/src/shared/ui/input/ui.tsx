import { InputHTMLAttributes, forwardRef } from 'react'

import cl from './ui.module.less'

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input className={cl.input} {...props} ref={ref} />
})
