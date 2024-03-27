import ImageLoading from "@/shared/hooks/onLoadImage/onLoadImage"
import cl from "./ui.module.less"
export const HistoryProfile = () => {
    return <div className={cl.historyProfile} id={cl.history}>
    <ImageLoading src="http://localhost:5000/storage/3a/3a82c7b5d1f074925f5ea7d73c706d62.webp" alt="" />
    <ImageLoading className={cl.add_history} src='/icons/add_photo.svg' alt='anidale add icon' />
    <ImageLoading src="https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg" alt="" />
    <ImageLoading src="https://pushinka.top/uploads/posts/2023-04/1680492408_pushinka-top-p-top-anime-avi-dlya-ks-krasivo-9.jpg" alt="" />
    <ImageLoading src="https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1" alt="" />
    <p>Ещё</p>
  </div>
}
export const HistoryFeed = () => {
    return <div className={cl.historyFeed} id={cl.history}>
    <ImageLoading src="http://localhost:5000/storage/3a/3a82c7b5d1f074925f5ea7d73c706d62.webp" alt="" />
    <ImageLoading className={cl.add_history} src='/icons/add_photo.svg' alt='anidale add icon' />
    <ImageLoading src="https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg" alt="" />
    <ImageLoading src="https://pushinka.top/uploads/posts/2023-04/1680492408_pushinka-top-p-top-anime-avi-dlya-ks-krasivo-9.jpg" alt="" />
    <ImageLoading src="https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1" alt="" />
    <p>Ещё</p>
  </div>
}