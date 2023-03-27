import { ImgHTMLAttributes } from 'react'

const Logo = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  return <img src='http://localhost:5173/src/assets/images/logo.png' {...props} />
}

export default Logo
