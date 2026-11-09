import { MutableRefObject, ReactNode, useEffect, useState } from 'react'

import { StoryEditor } from './editor/editor'
import { useStoriesStore } from './module'

interface Props {
  /** Рисует кнопку-вызов: open открывает редактор, uploading — идёт загрузка. */
  children?: (open: () => void, uploading: boolean) => ReactNode
  /** Сюда кладётся функция открытия редактора: так историю можно начать из чужого меню без своей кнопки. */
  openRef?: MutableRefObject<(() => void) | null>
}

/**
 * Добавление истории: окно-редактор (фото или фон, текст, стикеры, рисунок, фильтры) и публикация.
 * Кнопку, которая запускает редактор, рисует вызывающий компонент (в ленте это «+», в профиле «Создать момент»).
 */
export const AddStory = ({ children, openRef }: Props) => {
  const uploading = useStoriesStore((s) => s.uploading)
  const create = useStoriesStore((s) => s.create)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!openRef) return
    openRef.current = () => setOpen(true)
    return () => {
      openRef.current = null
    }
  }, [openRef])

  return (
    <>
      {children?.(() => setOpen(true), uploading)}
      {open && (
        <StoryEditor onClose={() => setOpen(false)} onPublish={(image) => create(image)} publishing={uploading} />
      )}
    </>
  )
}
