import React from 'react'

import cl from './ui.module.less'

interface Props extends React.PropsWithChildren {
  className?: string
  id?: string
}

export const Content: React.FC<Props> = ({ children, id }) => {
  return (
    <div className={cl.content} id={id}>
      {children}
    </div>
  )
}
