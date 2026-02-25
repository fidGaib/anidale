import { InputHTMLAttributes, forwardRef } from 'react'

import cl from './ui.module.css'

type Props = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <input className={`input ${cl.input}`} {...props} ref={ref} />
})
