import { useRefreshStore } from '@/app/providers/routes/model'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.css'

export const HistoryProfile = () => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])

  const image_url = [
    { src: useSrcAvatar(refreshData.avatar || ''), type: 'sigin_user' },
    { src: '/icons/add_photo.svg', type: 'svg' },
    { src: 'https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg' },
    {
      src: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/a1/ed/eba1ed19-9919-3fec-43fa-b6787e31f24f/540966.jpg/800x800cc.jpg',
    },
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
  const [refreshData] = useRefreshStore((state) => [state.refreshData])

  const image_url = [
    { src: useSrcAvatar(refreshData.avatar || ''), type: 'sigin_user', id: 'user-avatar' },
    { src: '/icons/add_photo.svg', type: 'svg', id: 'add-photo' },
    {
      src: 'https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg',
      id: 'faceit-avatar',
    },
    {
      src: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/a1/ed/eba1ed19-9919-3fec-43fa-b6787e31f24f/540966.jpg/800x800cc.jpg',
      id: 'music-avatar',
    },
    {
      src: 'https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1',
      id: 'vk-avatar',
    },
  ]

  return (
    <div className={`${cl.WrapOnHistorys} ${cl.feed}`} key='feed-history'>
      {image_url.map((image) => {
        // Пропускаем элемент полностью, если условие не выполнено
        if (image.type === 'sigin_user' && !refreshData.id) return null

        if (image.type === 'svg') {
          if (!refreshData.id) {
            return null // Возвращаем null вместо undefined
          }
          return (
            <ImageLoading
              key={`image-${image.id}`} // Уникальный ключ
              src={image.src}
              className={cl.history_add}
            />
          )
        }

        return (
          <ImageLoading
            key={`image-${image.id}`} // Уникальный ключ
            src={image.src}
            className={cl.others}
          />
        )
      })}
      <div key='more-button'>
        {' '}
        {/* Добавляем key для последнего элемента */}
        <p className='playground'>Ещё</p>
      </div>
    </div>
  )
}
