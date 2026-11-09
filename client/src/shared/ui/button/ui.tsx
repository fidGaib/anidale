import { ButtonHTMLAttributes } from 'react'

import cl from './ui.module.css'

export const ButtonUI = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button className={cl.button} {...props}>
      {props.children}
    </button>
  )
}
