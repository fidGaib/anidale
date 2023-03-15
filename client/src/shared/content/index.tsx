import React from 'react'

import cl from './content.module.less'

interface Props extends React.PropsWithChildren {
  id?: string
}

const Content: React.FC<Props> = ({ children, id }) => {
  return (
    <div className={cl.content} id={id}>
      {children}
    </div>
  )
}

export default Content
