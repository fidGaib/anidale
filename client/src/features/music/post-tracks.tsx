import { Track, useMusicStore } from './module'
import cl from './post-tracks.module.css'

/** Треки, прикреплённые к записи: кнопка воспроизведения, название и исполнитель. Играют через общий плеер. */
export const PostTracks = ({ tracks }: { tracks: Track[] }) => {
  const currentId = useMusicStore((s) => s.currentId)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const playOne = useMusicStore((s) => s.playOne)
  if (tracks.length === 0) return null

  return (
    <div className={cl.list}>
      {tracks.map((track) => {
        const active = currentId === track.id
        return (
          <div key={track.id} className={`${cl.row} ${active ? cl.active : ''}`}>
            <button
              type='button'
              className={cl.play}
              title={active && isPlaying ? 'Пауза' : 'Слушать'}
              onClick={() => playOne(track, tracks)}
            >
              {active && isPlaying ? '❚❚' : '▶'}
            </button>
            <span className={cl.text}>
              <span className={cl.title}>{track.title}</span>
              <span className={cl.artist}>{track.artist}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
