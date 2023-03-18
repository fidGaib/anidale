import { InputHTMLAttributes, forwardRef } from 'react'

import cl from './index.module.less'

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef((props: Props) => {
  return <input className={cl.input} {...props} />
})
