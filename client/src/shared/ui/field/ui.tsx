import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

import cl from './ui.module.css'

interface FieldProps {
  label: string
  /** Серая подсказка под полем. */
  hint?: string
}

/** Подписанное однострочное поле. */
export const Field = ({ label, hint, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) => (
  <label className={cl.field}>
    {label}
    <input {...rest} />
    {hint && <small>{hint}</small>}
  </label>
)

/** Подписанное многострочное поле. */
Field.Area = function Area({ label, hint, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={cl.field}>
      {label}
      <textarea {...rest} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

interface CheckProps extends InputHTMLAttributes<HTMLInputElement> {
  children: ReactNode
  hint?: string
}

/** Флажок с подписью и пояснением. */
export const CheckField = ({ children, hint, ...rest }: CheckProps) => (
  <label className={cl.check}>
    <input type='checkbox' {...rest} />
    <span>
      {children}
      {hint && <small>{hint}</small>}
    </span>
  </label>
)
