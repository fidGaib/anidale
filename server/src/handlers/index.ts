import { CookieParser } from './cookie-parser'
import { cors } from './cors'
import { expressJson } from './express-json'
import { ExpressStatic, ExpressStatic2, FileUpload } from './file-upload'
import { Yoga } from './yoga'

export default [cors, expressJson, ExpressStatic2, FileUpload, CookieParser, Yoga, ExpressStatic]
