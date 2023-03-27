import { HTMLAttributes } from 'react'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface Props extends HTMLAttributes<HTMLElement> {
  className: string
  images: File[]
  removeImage(i: File): void
}

export const MakePostImages: React.FC<Props> = ({ className, images, removeImage, ...rest }) => {
  return (
    <div className={`${cl.imagesPreview} ${className}`} {...rest}>
      {images.map((image) => (
        <div key={image.size} className={cl.imagePreviewWrapper}>
          <Icon iconId='close' className={cl.imagePreviewClose} onClick={() => removeImage(image)} />
          <ImageLoading className={cl.imagePreview} src={URL.createObjectURL(image)} />
        </div>
      ))}
    </div>
  )
}
