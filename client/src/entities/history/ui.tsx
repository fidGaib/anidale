import { useReactiveVar } from '@apollo/client'

import { VarAuthData } from '@/app/providers/routes/AppRouter'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.less'

export const HistoryProfile = () => {
  const { avatar } = useReactiveVar(VarAuthData)
  const image_url = [
    { src: useSrcAvatar(avatar || '') },
    { src: '/icons/add_photo.svg', type: 'svg' },
    { src: 'https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg' },
    { src: 'https://pushinka.top/uploads/posts/2023-04/1680492408_pushinka-top-p-top-anime-avi-dlya-ks-krasivo-9.jpg' },
    {
      src: 'https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1',
    },
  ]
  return (
    <div className={`${cl.WrapOnHistorys} ${cl.profile}`}>
      {image_url.map((image) => {
        if (image.type === 'svg') return <ImageLoading key={image.src} src={image.src} className={cl.history_add} />
        else return <ImageLoading key={image.src} src={image.src} className={cl.others} />
      })}
      <div>
        <p className='playground'>Ещё</p>
      </div>
    </div>
  )
}
export const HistoryFeed = () => {
  const { avatar } = useReactiveVar(VarAuthData)
  const image_url = [
    { src: useSrcAvatar(avatar || '') },
    { src: '/icons/add_photo.svg', type: 'svg' },
    { src: 'https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg' },
    { src: 'https://pushinka.top/uploads/posts/2023-04/1680492408_pushinka-top-p-top-anime-avi-dlya-ks-krasivo-9.jpg' },
    {
      src: 'https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1',
    },
  ]
  return (
    <div className={`${cl.WrapOnHistorys} ${cl.feed}`}>
      {image_url.map((image) => {
        if (image.type === 'svg') return <ImageLoading key={image.src} src={image.src} className={cl.history_add} />
        else return <ImageLoading key={image.src} src={image.src} className={cl.others} />
      })}
      <div>
        <p className='playground'>Ещё</p>
      </div>
    </div>
  )
}
