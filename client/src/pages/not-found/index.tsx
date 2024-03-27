import { useLocation } from 'react-router-dom'

import cl from './styles.module.less'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

const NotFound: React.FC = () => {
  const location = useLocation()
  return (
    <section className={'container ' + cl.NotFoundContainer}>
       {/* <h3>
         Страница <code>{location.pathname}</code> не найдена :(
       </h3> */}
      <ImageLoading src='http://localhost:5173/src/assets/images/404.gif' alt='anidale' className={cl.gif}/>
    </section>
  )
}

export default NotFound
