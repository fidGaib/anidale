import { useState } from 'react'

import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Hint } from '@/shared/ui/notice'

import { useMessagesStore } from './module'
import cl from './ui.module.css'

/**
 * Окно выбора при удалении диалога: «только у меня» или «у всех».
 * Возвращает функцию ask(пользователь) и готовый элемент окна, который нужно вставить в разметку.
 */
export const useDeleteDialog = (onDeleted: (userId: number) => void) => {
  const removeConversation = useMessagesStore((s) => s.removeConversation)
  const [target, setTarget] = useState<{ id: number; login: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const choose = async (forEveryone: boolean) => {
    if (!target || busy) return
    setBusy(true)
    const ok = await removeConversation(target.id, forEveryone)
    setBusy(false)
    if (ok) {
      onDeleted(target.id)
      setTarget(null)
    }
  }

  const modal = target && (
    <Dialog
      title={`Удалить диалог с ${target.login || 'пользователем'}?`}
      width={400}
      busy={busy}
      onClose={() => setTarget(null)}
    >
      <div className={cl.deleteBox}>
        <Btn disabled={busy} onClick={() => void choose(false)}>
          Только у меня
        </Btn>
        <Hint>Собеседник сохранит переписку и файлы.</Hint>
        <Btn variant='danger' disabled={busy} onClick={() => void choose(true)}>
          У всех
        </Btn>
        <Hint>Переписка и файлы удалятся у обоих без возможности восстановления.</Hint>
        <Btn variant='ghost' disabled={busy} onClick={() => setTarget(null)}>
          Отмена
        </Btn>
      </div>
    </Dialog>
  )

  return { ask: setTarget, modal }
}
