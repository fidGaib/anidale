import { useEffect } from 'react'

import { AddStory, useStoriesStore } from '@/features/stories'
import { storageUrl } from '@/shared/config'
import { formatShort } from '@/shared/lib/time'
import { Btn } from '@/shared/ui/btn'

import cl from './stories.module.css'

interface Props {
  id: number
  name: string
  avatar: string
  /** Может публиковать истории от имени сообщества. */
  canPublish: boolean
  /** Может удалять истории и видит число просмотров. */
  canManage: boolean
}

/** Карточка «Моменты» сообщества: истории за последние 24 часа и кнопка «Создать момент» для редакторов. */
export const CommunityStories = ({ id, name, avatar, canPublish, canManage }: Props) => {
  const loadCommunity = useStoriesStore((s) => s.loadCommunity)
  const open = useStoriesStore((s) => s.open)
  const group = useStoriesStore((s) => s.groups.find((g) => g.community?.id === id))
  const stories = group?.stories ?? []

  useEffect(() => {
    void loadCommunity({ id, name, avatar, canManage })
  }, [loadCommunity, id, name, avatar, canManage])

  if (stories.length === 0 && !canPublish) return null

  return (
    <section className={`playground ${cl.card}`}>
      <h3 className={cl.title}>Моменты {stories.length > 0 && <span className={cl.count}>{stories.length}</span>}</h3>
      {stories.length > 0 && (
        <div className={cl.stories}>
          {stories.map((story) => (
            <button
              key={story.id}
              type='button'
              className={cl.story}
              title={story.text || 'Смотреть момент'}
              onClick={() => open(-id, story.id)}
            >
              <span className={`${cl.ring} ${story.seen ? cl.ringSeen : ''}`}>
                <img className={cl.image} src={`${storageUrl(story.src)}.webp`} alt='' loading='lazy' />
              </span>
              <span className={cl.label}>{story.text || formatShort(story.date)}</span>
            </button>
          ))}
        </div>
      )}
      {canPublish && (
        <AddStory communityId={id}>
          {(openEditor, uploading) => (
            <Btn block onClick={openEditor} disabled={uploading}>
              {uploading ? 'Загрузка…' : 'Создать момент'}
            </Btn>
          )}
        </AddStory>
      )}
    </section>
  )
}
