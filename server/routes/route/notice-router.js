import Router from 'express'
import noticeController from '../../api/notice/notice-controller'
const router = new Router()
import { body } from 'express-validator'

router.post('/create', body('user_id').trim().isInt(), body('description').trim().isString(), noticeController.create)
router.post('/update', body('user_id').trim().isInt(), body('description').trim().isString(), noticeController.update)
router.post('/remove', noticeController.remove)
router.get('/fetch-all/', noticeController.fetchAll)
router.get('/fetch-chunk/', noticeController.fetchByUser)

export default router
