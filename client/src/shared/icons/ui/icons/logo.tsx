import { ImgHTMLAttributes } from 'react'

const Logo = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  return <img src='http://localhost:5000/storage/files-site/images/logo.png' {...props} />
}

export default Logo
