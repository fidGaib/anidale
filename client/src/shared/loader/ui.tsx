import ImageLoading from '../hooks/onLoadImage/onLoadImage'
import cl from './ui.module.css'

export const Loader = () => {
  return (
    <div className={cl.loader}>
      <ImageLoading src='http://localhost:5173/src/assets/images/loading.gif' alt='anidale' />
    </div>
  )
}
