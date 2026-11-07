import { storageUrl } from '@/shared/config'

export const useSrcAvatar = (avatar: string) => {
  if (!avatar) return avatar
  if (avatar.split('/').length === 3) return storageUrl(`${avatar}.webp`)
  else return avatar
}
