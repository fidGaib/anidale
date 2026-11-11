import { useMemo } from 'react'

import { getPasswordStrength, looksLikeLogin, PASSWORD_MIN, PASSWORD_SCORE_LABELS } from '@/shared/lib/password'

import cl from './ui.module.css'

type Props = {
  password: string
  userInputs?: Array<string | undefined>
  id?: string
}

/**
 * Метр сложности пароля. Опирается на zxcvbn, но подсказки пишет по-русски:
 * человек видит не «ошибку», а что именно стоит изменить.
 */
export const PasswordMeter = ({ password, userInputs = [], id }: Props) => {
  const inputsKey = userInputs.filter(Boolean).join('|')
  const result = useMemo(
    () => (password ? getPasswordStrength(password, userInputs) : null),
    // inputsKey нужен, чтобы не пересчитывать на каждый новый массив
    [password, inputsKey],
  )
  const length = Array.from(password).length

  if (!password) {
    return <p className={cl.hint}>Минимум {PASSWORD_MIN} символов. Лучше длинная фраза, чем короткий набор символов.</p>
  }

  const score = result?.score ?? 0
  const similar = looksLikeLogin(password, userInputs)
  // Совпадение с почтой или логином сервер отклонит, поэтому не показываем такой пароль надёжным.
  const shownScore = similar ? Math.min(score, 1) : score
  const tips: string[] = []
  if (similar) tips.push('Пароль не должен повторять почту или логин')
  if (length < PASSWORD_MIN) tips.push(`Добавьте ещё ${PASSWORD_MIN - length} ${plural(PASSWORD_MIN - length)}`)
  if (score <= 1) tips.push('Слишком простой: используйте несколько слов, цифры и символы')
  else if (score === 2) tips.push('Средний: сделайте пароль длиннее, чтобы его было сложнее подобрать')
  if (!tips.length) tips.push('Хороший пароль: запомните его или сохраните в менеджере паролей')

  return (
    <div className={cl.meter} id={id}>
      <div className={cl.bars} aria-hidden>
        {[0, 1, 2, 3, 4].map((bar) => (
          <span key={bar} className={`${cl.bar} ${bar <= shownScore ? cl[`score${shownScore}`] : ''}`} />
        ))}
      </div>
      <div className={cl.row}>
        <span className={cl[`label${shownScore}`]}>{PASSWORD_SCORE_LABELS[shownScore]}</span>
        <span className={cl.length}>{length} симв.</span>
      </div>
      {tips.map((tip) => (
        <p key={tip} className={cl.tip}>
          {tip}
        </p>
      ))}
    </div>
  )
}

const plural = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'символ'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'символа'
  return 'символов'
}
