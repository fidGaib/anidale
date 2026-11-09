import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AddStory } from '@/features/stories'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'

import cl from './create-button.module.css'

interface Props {
  /** Открыть окно «Новый пост». */
  onPost: () => void
  /** Открыть окно «Новое видео». */
  onVideo: () => void
  /** Перейти на полную вкладку профиля (2 — музыка, 3 — видео, 4 — фото): там есть добавление. */
  onOpenTab: (layout: number) => void
}

/** Кнопка «Создать» с меню: пост, история, фото, видео, музыка. Показывается только на своём профиле. */
export const CreateButton = ({ onPost, onVideo, onOpenTab }: Props) => {
  const navigate = useNavigate()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  // Окно выбора файла для истории открывается из пункта меню
  const openStoryPicker = useRef<(() => void) | null>(null)

  const items: ContextMenuItem[] = [
    { label: 'Пост', svg: '/icons/note.svg', onClick: onPost },
    { label: 'История', svg: '/icons/arts.svg', onClick: () => openStoryPicker.current?.() },
    { label: 'Статья', svg: '/icons/edit.svg', onClick: () => navigate('/article/new') },
    { label: 'Фото', svg: '/icons/add_photo.svg', onClick: () => onOpenTab(4) },
    { label: 'Видео', svg: '/icons/video.svg', onClick: onVideo },
    { label: 'Музыка', svg: '/icons/music.svg', onClick: () => onOpenTab(2) },
  ]

  return (
    <>
      <AddStory openRef={openStoryPicker} />
      <button
        type='button'
        className={`playground ${cl.button}`}
        aria-haspopup='menu'
        aria-expanded={menu !== null}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMenu({ x: rect.left + rect.width / 2 - 100, y: rect.bottom + 4 })
        }}
      >
        <span className={cl.plus}>＋</span>
        Создать
        <span className={cl.arrow}>⌄</span>
      </button>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </>
  )
}
