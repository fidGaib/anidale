import zxcvbn from 'zxcvbn'

export const PASSWORD_MIN = 10

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * Готовит данные аккаунта для zxcvbn: почту разбираем на части, а служебный логин
 * вида bot#12345678 — на числовую часть. Так метр замечает «пароль из почты».
 */
export const getUserInputs = (values: Array<string | undefined> = []) => {
  const inputs: string[] = []
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    inputs.push(trimmed)
    const local = trimmed.includes('@') ? trimmed.split('@')[0] : undefined
    if (local) inputs.push(local)
    const withoutBot = trimmed.replace(/^bot#/i, '')
    if (withoutBot !== trimmed) inputs.push(withoutBot)
  }
  return Array.from(new Set(inputs.filter((input) => input.length >= 3)))
}

/** Тот же разбор, что и на сервере: пароль не должен повторять логин или почту. */
export const looksLikeLogin = (password: string, values: Array<string | undefined> = []) => {
  const normalizedPassword = normalize(password)
  if (normalizedPassword.length < 4) return false
  for (const value of getUserInputs(values)) {
    const normalizedValue = normalize(value)
    if (normalizedValue.length < 4) continue
    if (normalizedPassword.includes(normalizedValue) || normalizedValue.includes(normalizedPassword)) return true
  }
  return false
}

/** Оценка zxcvbn: 0–4. Для регистрации и смены пароля требуем хотя бы 2. */
export const getPasswordStrength = (password: string, userInputs: Array<string | undefined> = []) =>
  zxcvbn(password, getUserInputs(userInputs))

export const isPasswordReady = (password: string, userInputs: Array<string | undefined> = []) =>
  Array.from(password).length >= PASSWORD_MIN &&
  getPasswordStrength(password, userInputs).score >= 2 &&
  !looksLikeLogin(password, userInputs)

export const PASSWORD_SCORE_LABELS = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный']
