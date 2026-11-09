import { ButtonHTMLAttributes } from 'react'

import cl from './ui.module.css'

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary — главное действие, secondary — обычное, danger — опасное (красный текст), ghost — без фона. */
  variant?: BtnVariant
  /** Кнопка на всю ширину контейнера. */
  block?: boolean
}

/** Единая кнопка сайта: все окна и страницы берут её вместо своих стилей. */
export const Btn = ({ variant = 'secondary', block = false, className = '', type = 'button', ...rest }: Props) => (
  <button type={type} className={`${cl.btn} ${cl[variant]} ${block ? cl.block : ''} ${className}`} {...rest} />
)
