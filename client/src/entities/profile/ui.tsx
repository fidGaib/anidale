import { HTMLAttributes } from 'react'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

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
          {/* <Icon iconId='close' className={cl.imagePreviewClose} onClick={() => removeImage(image)} /> */}
          <ImageLoading
            className={cl.imagePreviewClose}
            src={'/icons/close.svg'}
            onClick={() => removeImage(image)}
            alt='anidale close svg'
          />
          <ImageLoading className={cl.imagePreview} src={URL.createObjectURL(image)} />
        </div>
      ))}
    </div>
  )
}
