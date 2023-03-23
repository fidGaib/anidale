import { useLocation } from 'react-router-dom'

import cl from './styles.module.less'

const NotFound: React.FC = () => {
  const location = useLocation()
  return (
    <section className={'container ' + cl.NotFoundContainer}>
      <h1>
        Страница <code>{location.pathname}</code> не найдена!
      </h1>
    </section>
  )
}

export default NotFound
