import { useLocation } from 'react-router-dom'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './styles.module.css'

const NotFound: React.FC = () => {
  const location = useLocation()
  return (
    <div className={cl.NotFoundContainer}>
      <p>Страница {location.pathname} не найдена :(</p>
      <ImageLoading src='http://localhost:5173/src/assets/images/404.gif' alt='anidale' className={cl.gif} />
    </div>
  )
}

export default NotFound
