import { HTMLAttributes } from 'react'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.css'

interface Props extends HTMLAttributes<HTMLElement> {
  className: string
  images: File[]
  removeImage(i: File): void
}
export const MakePostImages: React.FC<Props> = ({ className, images, removeImage, ...rest }) => {
  return (
    <div
      className={`playground ${cl.imagesPreview} ${className}`}
      {...rest}
      style={{ borderRadius: images?.length ? ' 0 0 10px 10px' : '', paddingTop: '0' }}
    >
      {images.map((image) => (
        <div key={image.size} className={cl.imagePreviewWrapper}>
          <ImageLoading
            key={image.name}
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
