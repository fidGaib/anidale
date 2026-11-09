import { useState } from 'react'

import { Modal } from '@/shared/hooks/Modal'
import ButtonUI from '@/shared/ui/button'

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

  const modal = (
    <Modal active={target !== null} setActive={(open) => !open && !busy && setTarget(null)}>
      <div className={cl.deleteBox}>
        <p className={cl.deleteTitle}>Удалить диалог с {target?.login || 'пользователем'}?</p>
        <ButtonUI disabled={busy} onClick={() => void choose(false)}>
          Только у меня
        </ButtonUI>
        <p className={cl.deleteHint}>Собеседник сохранит переписку и файлы.</p>
        <ButtonUI disabled={busy} onClick={() => void choose(true)}>
          У всех
        </ButtonUI>
        <p className={cl.deleteHint}>Переписка и файлы удалятся у обоих без возможности восстановления.</p>
        <ButtonUI disabled={busy} onClick={() => setTarget(null)}>
          Отмена
        </ButtonUI>
      </div>
    </Modal>
  )

  return { ask: setTarget, modal }
}
