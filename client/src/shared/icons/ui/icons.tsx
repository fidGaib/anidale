import { forwardRef } from 'react'

import Logo from './icons/logo'
import MenuHeaderIcon from './icons/menu-header'

const icons = {
  logo: (props: any, ref: any) => <Logo {...props} />,
  menu_header: (props: any, ref: any) => <MenuHeaderIcon {...props} ref={ref} />,
}
interface PropsType {
  id: keyof typeof icons
  className?: string
  onClick?: any
  ref?: any
}
export const Icon = forwardRef((props: PropsType, ref: any) => {
  return icons[props.id](props, ref)
})
