import { useRefreshStore } from '@/app/providers/routes/model'
import { ProfileMusicList } from '@/features/music'
import Content from '@/shared/content'

export const Music = () => {
  document.title = 'AniDale - Музыка'
  const myId = useRefreshStore((state) => state.refreshData.id)
  // Единый плеер приложения живёт в features/music
  return <Content>{myId ? <ProfileMusicList scope={myId} canAdd /> : <></>}</Content>
}
