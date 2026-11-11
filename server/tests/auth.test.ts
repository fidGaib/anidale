import { hash } from 'bcrypt'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import mailService from '@/api/user/mail-service'
import { requireVerifiedUser } from '@/api/user/require-verified'
import UserService from '@/api/user/service'
import tokenService from '@/api/user/token-service'
import EmailToken from '@/db/models/email-token-model'

import { createUser, prisma, resetDb } from './helpers'

const OLD_PASS = 'Xy7#Lm2!Qp9$Rt4@'
const NEW_PASS = 'Nw8$Kj3!Vb6@Zc1%'

beforeEach(async () => {
  await resetDb()
  vi.restoreAllMocks()
})

describe('политика паролей', () => {
  it('не принимает короткий, популярный и похожий на почту пароль', async () => {
    vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    await expect(UserService.registration('new-user@test.local', 'short')).rejects.toThrow('10 символов')
    await expect(UserService.registration('new-user@test.local', 'password123')).rejects.toThrow('популярен')
    await expect(UserService.registration('new-user@test.local', 'newuser-strong-2026!')).rejects.toThrow('почты')
  })

  it('хранит Argon2id-хеш, а не сам пароль', async () => {
    vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    const { user } = await UserService.registration('new-user@test.local', OLD_PASS)
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { pass: true } })
    expect(stored.pass.startsWith('$argon2id$')).toBe(true)
    expect(stored.pass).not.toContain(OLD_PASS)
  })
})

describe('подтверждение почты', () => {
  it('активирует пользователя по ссылке и не принимает её повторно', async () => {
    const send = vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    await UserService.registration('new-user@test.local', OLD_PASS)
    const token = send.mock.calls[0][2]
    expect(token).toBeTruthy()

    const record = await EmailToken.findFirstOrThrow({ where: { type: 'verify' } })
    expect(record.tokenHash).not.toBe(token)
    expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000)

    await UserService.verifyEmail(token)
    const activated = await prisma.user.findUniqueOrThrow({ where: { email: 'new-user@test.local' } })
    expect(activated.isActivated).toBe(true)
    await expect(UserService.verifyEmail(token)).rejects.toThrow('недействительна')
  })

  it('закрывает публикации до подтверждения и открывает после', async () => {
    const send = vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    const { user, refreshToken } = await UserService.registration('new-user@test.local', OLD_PASS)
    const req = { cookies: { refreshToken }, headers: {}, socket: undefined } as never
    const res = {} as never

    await expect(requireVerifiedUser(req, res)).rejects.toThrow('Подтвердите')
    await UserService.verifyEmail(send.mock.calls[0][2])
    await expect(requireVerifiedUser(req, res)).resolves.toMatchObject({ id: user.id, isActivated: true })
  })
})

describe('сброс и смена пароля', () => {
  it('сбрасывает пароль по одноразовой ссылке и завершает сессии', async () => {
    vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    const resetMail = vi.spyOn(mailService, 'sendPasswordReset').mockResolvedValue()
    const { user } = await UserService.registration('new-user@test.local', OLD_PASS)
    await tokenService.saveToken(user.id, 'старая-сессия')

    await UserService.requestPasswordReset('new-user@test.local')
    const token = resetMail.mock.calls[0][2]
    await UserService.resetPassword(token, NEW_PASS, NEW_PASS)

    expect(await tokenService.findToken('старая-сессия')).toBeNull()
    await expect(UserService.login('new-user@test.local', OLD_PASS)).rejects.toThrow('пароль')
    await expect(UserService.login('new-user@test.local', NEW_PASS)).resolves.toMatchObject({ user: { id: user.id } })
  })

  it('при смене пароля оставляет только текущую сессию', async () => {
    vi.spyOn(mailService, 'sendVerification').mockResolvedValue()
    const { user, refreshToken } = await UserService.registration('new-user@test.local', OLD_PASS)
    const other = await tokenService.generateTokens(user)
    await tokenService.saveToken(user.id, other.refreshToken)

    const current = await UserService.changePassword(user.id, OLD_PASS, NEW_PASS, NEW_PASS)
    expect(await tokenService.findToken(refreshToken)).toBeNull()
    expect(await tokenService.findToken(other.refreshToken)).toBeNull()
    expect(await tokenService.findToken(current.refreshToken)).toBeTruthy()
  })

  it('переносит старый bcrypt-хеш на Argon2id при входе', async () => {
    const me = await createUser('legacy')
    const legacyHash = await hash(OLD_PASS + process.env.PASS_PEPPER, 10)
    await prisma.user.update({ where: { id: me.id }, data: { pass: legacyHash } })

    await expect(UserService.login(me.email, OLD_PASS)).resolves.toBeTruthy()
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { pass: true } })
    expect(stored.pass.startsWith('$argon2id$')).toBe(true)
    await expect(UserService.login(me.email, OLD_PASS)).resolves.toBeTruthy()
  })
})
