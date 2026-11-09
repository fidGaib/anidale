import React from 'react'

import cl from './ui.module.css'

interface Props extends React.PropsWithChildren {
  className?: string
  id?: string
}

export const Content: React.FC<Props> = ({ children, id, className }) => {
  return (
    <div className={`${cl.content} ${className ?? ''}`} id={id}>
      {children}
    </div>
  )
}
