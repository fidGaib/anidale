import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.css'

export const Avatar = ({ src, className }: { src: string; className?: string }) => (
  <ImageLoading className={className ?? cl.avatar} src={useSrcAvatar(src)} />
)
