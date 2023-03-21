import { PostStore } from '@/features/profile/types'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const MakePostImages = ({ store }: { store: PostStore }) => {
  return (
    <div className={cl.imagesPreview}>
      {store.images.map((image) => (
        <div key={image.size} className={cl.imagePreviewWrapper}>
          <Icon iconId='close' className={cl.imagePreviewClose} onClick={() => store.removeImage(image, store)} />
          <img className={cl.imagePreview} src={URL.createObjectURL(image)} />
        </div>
      ))}
    </div>
  )
}
