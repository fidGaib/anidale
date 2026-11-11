import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2'
import { compare } from 'bcrypt'
import { readFileSync } from 'node:fs'
import { createGraphQLError } from 'graphql-yoga'
import zxcvbn from 'zxcvbn'

/** Минимальная и максимальная длина пароля (в символах, а не байтах). */
export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

// Параметры OWASP для Argon2id: 19 МиБ памяти, 2 прохода, один поток.
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

// Список самых частых паролей (10 000 штук из SecLists). Читается один раз при первом обращении.
let commonPasswords: Set<string> | undefined
const getCommonPasswords = () => {
  if (commonPasswords) return commonPasswords
  try {
    const text = readFileSync(new URL('../../utils/data/common-passwords.txt', import.meta.url), 'utf8')
    commonPasswords = new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean),
    )
  } catch (error) {
    // Без списка остаются длина, похожесть и zxcvbn — сайт не должен падать из-за файла
    console.error('Не удалось загрузить список популярных паролей', error)
    commonPasswords = new Set()
  }
  return commonPasswords
}

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** Проверяет, что пароль не повторяет логин или адрес почты. */
const looksLikeLogin = (password: string, values: Array<string | null | undefined>) => {
  const normalizedPassword = normalize(password)
  if (normalizedPassword.length < 4) return false
  for (const value of values) {
    if (!value) continue
    // bot#12345678 — служебный логин, сравниваем и с числом, и с полной строкой
    for (const part of [value, value.replace(/^bot#/i, '')]) {
      const normalizedValue = normalize(part)
      if (normalizedValue.length < 4) continue
      if (normalizedPassword.includes(normalizedValue) || normalizedValue.includes(normalizedPassword)) return true
    }
  }
  return false
}

export type PasswordSubject = {
  email?: string | null
  login?: string | null
}

/** Бросает понятную ошибку, если пароль не проходит политику. */
export const assertStrongPassword = (password: string, subject: PasswordSubject = {}) => {
  const length = Array.from(password).length
  if (length < PASSWORD_MIN) {
    throw createGraphQLError(`Пароль должен быть не короче ${PASSWORD_MIN} символов`)
  }
  if (length > PASSWORD_MAX) {
    throw createGraphQLError(`Пароль должен быть не длиннее ${PASSWORD_MAX} символов`)
  }
  if (getCommonPasswords().has(password.trim().toLowerCase())) {
    throw createGraphQLError('Этот пароль слишком популярен. Придумайте другой')
  }

  const email = subject.email?.trim().toLowerCase()
  const emailLocal = email?.split('@')[0]
  if (looksLikeLogin(password, [subject.login, email, emailLocal])) {
    throw createGraphQLError('Пароль не должен повторять логин или адрес почты')
  }

  // zxcvbn подсказывает, какие приёмы делают пароль слабее. Оценки 0–1 отсекаем как заведомо ненадёжные.
  const result = zxcvbn(password, [subject.login, email, emailLocal].filter(Boolean) as string[])
  if (result.score < 2) {
    const advice = [result.feedback.warning, ...result.feedback.suggestions].filter(Boolean).join(' ')
    throw createGraphQLError(advice ? `Пароль слишком простой. ${advice}` : 'Пароль слишком простой. Придумайте более надёжный')
  }
}

/** Новый хеш Argon2id. Pepper добавляется к паролю, как и раньше в bcrypt. */
const withPepper = (password: string) => password + (process.env.PASS_PEPPER ?? '')

class PasswordService {
  async hash(password: string) {
    return await argonHash(withPepper(password), ARGON_OPTIONS)
  }

  /** Понимает и новые Argon2id-хеши, и старые bcrypt: они переносятся при следующем входе. */
  async verify(password: string, storedHash: string) {
    if (storedHash.startsWith('$argon2')) {
      return await argonVerify(storedHash, withPepper(password))
    }
    return await compare(withPepper(password), storedHash)
  }

  /** Старый bcrypt-хеш нужно заменить после успешного входа. */
  needsRehash(storedHash: string) {
    return !storedHash.startsWith('$argon2id$')
  }

  assertStrong(password: string, subject: PasswordSubject = {}) {
    assertStrongPassword(password, subject)
  }
}

export default new PasswordService()
