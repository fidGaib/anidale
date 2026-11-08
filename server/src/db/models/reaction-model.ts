import prisma from '../db'

const Like = prisma.like
const Comment = prisma.comment

export { Comment, Like }
