import { createHash, randomBytes } from 'node:crypto'
import { createGraphQLError } from 'graphql-yoga'

import EmailToken from '@/db/models/email-token-model'

export type EmailTokenType = 'verify' | 'reset'

const HOUR = 60 * 60 * 1000
/** Подтверждение почты живёт сутки, сброс пароля — час. */
export const EMAIL_TOKEN_TTL: Record<EmailTokenType, number> = {
  verify: 24 * HOUR,
  reset: HOUR,
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

class EmailTokenService {
  /** Создаёт новую ссылку и гасит прежние неиспользованные ссылки того же типа. */
  async issue(userId: number, type: EmailTokenType) {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL[type])
    await EmailToken.deleteMany({ where: { userId, type, usedAt: null } })
    await EmailToken.create({ data: { userId, type, tokenHash: hashToken(token), expiresAt } })
    return token
  }

  /** Находит действующую ссылку, но не расходует её: сначала проверяем новый пароль. */
  async findValid(token: string, type: EmailTokenType) {
    const clean = token.trim()
    if (!clean) throw createGraphQLError('Ссылка недействительна или устарела')
    const record = await EmailToken.findUnique({
      where: { tokenHash: hashToken(clean) },
      include: {
        user: {
          select: { id: true, email: true, login: true, isActivated: true },
        },
      },
    })
    if (!record || record.type !== type || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw createGraphQLError('Ссылка недействительна или устарела')
    }
    return record
  }

  /** Атомарно помечает ссылку использованной: повторный переход по ней уже не сработает. */
  async consume(id: number) {
    const result = await EmailToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })
    if (result.count === 0) throw createGraphQLError('Ссылка недействительна или устарела')
  }

  /** Убирает просроченные записи, чтобы таблица не росла. */
  async cleanup() {
    await EmailToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * HOUR) } } }).catch(() => undefined)
  }
}

export default new EmailTokenService()
