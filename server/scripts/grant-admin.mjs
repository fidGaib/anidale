/**
 * Выдаёт роль администратора сайта (доступ к каталогу аниме).
 *
 *   npm run admin -- user@example.com
 *   npm run admin -- Admin[F.I.D.]
 *
 * Аргумент — почта или логин существующего пользователя.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const who = process.argv[2]?.trim()

if (!who) {
  console.error('Укажите почту или логин: npm run admin -- user@example.com')
  process.exit(1)
}

const user = await prisma.user.findFirst({
  where: {
    OR: [{ email: { equals: who, mode: 'insensitive' } }, { login: { equals: who, mode: 'insensitive' } }],
  },
  select: { id: true, email: true, login: true, role: true },
})

if (!user) {
  console.error(`Пользователь «${who}» не найден`)
  process.exit(1)
}

if (user.role === 'admin') {
  console.log(`Уже администратор: ${user.login} (${user.email})`)
} else {
  await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } })
  console.log(`Теперь администратор: ${user.login} (${user.email})`)
}

await prisma.$disconnect()
