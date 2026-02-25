import { HTMLAttributes } from 'react'

import cl from './styles.module.css'

const Dropdown: React.FC<HTMLAttributes<HTMLElement>> = ({ className, children, ...rest }) => {
  return (
    <div className={`${cl.dropdownWrapper} ${className}`} {...rest}>
      {children}
    </div>
  )
}

const DropdownHeader: React.FC<HTMLAttributes<HTMLElement>> = ({ className, children, ...rest }) => {
  return (
    <button className={`${cl.dropdownHeader} ${className}`} {...rest}>
      {children}
    </button>
  )
}

const DropdownBody: React.FC<HTMLAttributes<HTMLElement>> = ({ className, children, ...rest }) => {
  return (
    <ul className={`${cl.dropdownBody} ${className}`} {...rest}>
      {children}
    </ul>
  )
}

export default Object.assign(Dropdown, { Header: DropdownHeader, Body: DropdownBody })
