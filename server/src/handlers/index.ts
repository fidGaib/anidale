import { CookieParser } from './cookie-parser'
import { cors } from './cors'
import { expressJson } from './express-json'
import { ExpressStatic2, FileUpload } from './file-upload'

export default [cors, expressJson, ExpressStatic2, FileUpload, CookieParser]
