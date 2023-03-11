import Router from 'express'
const router = new Router()
import userRouter from './route/user-router'
import noticeRouter from './route/notice-router'

router.use('/user', userRouter)
router.use('/notice', noticeRouter)

export default router
