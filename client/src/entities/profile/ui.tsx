import { usePostStore } from '@/features/profile/module'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const MakePostImages = () => {
  const images = usePostStore((state) => state.images)
  const removeImage = usePostStore((state) => state.removeImage)
  return (
    <div className={cl.imagesPreview}>
      {images.map((image) => (
        <div key={image.size} className={cl.imagePreviewWrapper}>
          <Icon iconId='close' className={cl.imagePreviewClose} onClick={() => removeImage(image)} />
          <img className={cl.imagePreview} src={URL.createObjectURL(image)} />
        </div>
      ))}
    </div>
  )
}
