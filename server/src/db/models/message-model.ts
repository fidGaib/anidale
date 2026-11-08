import prisma from '../db'

const Conversation = prisma.conversation
const Message = prisma.message

export { Conversation, Message }
