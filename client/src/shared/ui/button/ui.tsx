import { ButtonHTMLAttributes } from 'react'

import { Btn } from '../btn'

/**
 * Прежняя кнопка сайта. Теперь это тот же `Btn` в обычном (серым) варианте,
 * чтобы все кнопки выглядели одинаково; новые места лучше писать сразу через `Btn`.
 */
export const ButtonUI = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <Btn variant='secondary' {...props} />
