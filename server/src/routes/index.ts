import Router from 'express'

import noticeRouter from './route/notice-router'
import userRouter from './route/user-router'

const router = Router()

router.use('/user', userRouter)
router.use('/notice', noticeRouter)

export default router
