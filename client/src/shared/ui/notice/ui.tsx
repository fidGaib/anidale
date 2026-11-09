import { ReactNode } from 'react'

import cl from './ui.module.css'

/** Текст ошибки формы или запроса. Ничего не рисует, если ошибки нет. */
export const FormError = ({ children }: { children?: ReactNode }) =>
  children ? <p className={cl.error}>{children}</p> : null

/** Серая подсказка. */
export const Hint = ({ children }: { children: ReactNode }) => <p className={cl.hint}>{children}</p>

/** Пустое состояние списка: «Ничего нет». */
export const Empty = ({ children }: { children: ReactNode }) => <p className={cl.empty}>{children}</p>
