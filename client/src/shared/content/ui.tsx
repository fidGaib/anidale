import React from 'react'

import cl from './ui.module.less'

interface Props extends React.PropsWithChildren {
  className?: string
  id?: string
}

export const Content: React.FC<Props> = ({ children, className, id }) => {
  return (
    <div className={className ? className : cl.content} id={id}>
      {children}
    </div>
  )
}
