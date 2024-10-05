import { useRef, useState } from 'react'

import useOnScreen from '../useOnScreen'
import cl from './style.module.less'

const ImageLoading = (props: any) => {
  const [loading, setLoad] = useState(true)
  const imgRef = useRef(null)
  const onLoad = () => {
    setLoad(false)
  }

  const isVisible = useOnScreen(imgRef)
  return (
    <div ref={imgRef} id={loading ? cl.loading : cl.div} {...props}>
      {isVisible || !loading ? <img src={props.src} onLoad={onLoad} alt={'anidale'} /> : <img src={''} />}
    </div>
  )
}
export default ImageLoading
