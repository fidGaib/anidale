import prisma from '../db'

prisma.notice

const Notice = prisma.notice
const NoticeImage = prisma.noticeImage

export { Notice, NoticeImage }
