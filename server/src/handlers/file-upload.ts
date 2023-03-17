import express from 'express'
import fileUpload from 'express-fileupload'
import { fileURLToPath } from 'url'

export const __dirname = fileURLToPath(new URL('../../', import.meta.url))
export const ExpressStatic = { path: '/storage', func: express.static(__dirname + './storage/') }
export const ExpressStatic2 = express.static(__dirname + './storage/')
export const FileUpload = fileUpload({ createParentPath: true })
