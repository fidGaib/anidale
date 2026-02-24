import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import cl from './style.module.less'

const ImageLoading = (props: any) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })
  const [isImageLoaded, setImageLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  useEffect(() => {
    setImageLoaded(false)
    setHasError(false)
  }, [props.src])
  const handleImageLoad = () => {
    setImageLoaded(true)
  }
  const handleImageError = () => {
    setHasError(true)
    setImageLoaded(false)
  }

  return (
    <div
      ref={ref}
      id={`
      ${!inView ? cl.loading : ''}
      ${isImageLoaded ? cl.loaded : ''}
      ${hasError ? cl.error : ''}
    `.trim()}
      {...props}
    >
      {inView ? (
        <>
          {!isImageLoaded && !hasError && (
            <div className={cl.loader}>
              <span className={cl.spinner}></span>
            </div>
          )}
          {hasError && <div className={cl.errorMsg}>404 not found :(</div>}
          <img
            src={props.src}
            alt={props.alt || 'anidale'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              opacity: isImageLoaded ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          />
        </>
      ) : (
        <div className={cl.placeholder}></div>
      )}
    </div>
  )
}
export default ImageLoading
// !inView ? cl.loading : cl.div
