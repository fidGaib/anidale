import { client } from '@/app/providers/apollo-client'
import { ARCHIVE_POST, BOOKMARK_POST, EDIT_POST, PIN_POST, REMOVE_POST, REPORT_POST } from '@/shared/graphql/schema'
import { toTimestamp } from '@/shared/lib/time'

import { usePostSync } from './sync'

const publish = usePostSync.getState().publish

const message = (error: unknown) => (error instanceof Error ? error.message : 'Что-то пошло не так')

/** Результат действия: ok или текст ошибки для показа пользователю. */
export type ActionResult = { ok: true } | { ok: false; error: string }

const run = async (action: () => Promise<void>): Promise<ActionResult> => {
  try {
    await action()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: message(error) }
  }
}

/**
 * Действия над постом. После успеха изменение публикуется в usePostSync:
 * лента, профиль, окно поста и просмотр фото обновляются без перезагрузки.
 */
export const postActions = {
  edit: (id: number, description: string) =>
    run(async () => {
      const { data } = await client.mutate({ mutation: EDIT_POST, variables: { id, description } })
      publish({
        id,
        description: data?.editPost?.description ?? description.trim(),
        editedAt: toTimestamp(data?.editPost?.editedAt) || Date.now(),
      })
    }),

  pin: (id: number, pinned: boolean) =>
    run(async () => {
      await client.mutate({ mutation: PIN_POST, variables: { id, pinned } })
      publish({ id, pinned })
    }),

  archive: (id: number, archived: boolean) =>
    run(async () => {
      await client.mutate({ mutation: ARCHIVE_POST, variables: { id, archived } })
      // В архиве пост не может быть закреплённым
      publish({ id, archived, ...(archived ? { pinned: false } : {}) })
    }),

  bookmark: (id: number, bookmarked: boolean) =>
    run(async () => {
      await client.mutate({ mutation: BOOKMARK_POST, variables: { id, bookmarked } })
      publish({ id, bookmarked })
    }),

  report: (id: number, reason: string) =>
    run(async () => {
      await client.mutate({ mutation: REPORT_POST, variables: { id, reason } })
    }),

  remove: (id: number) =>
    run(async () => {
      await client.mutate({ mutation: REMOVE_POST, variables: { id } })
      publish({ id, removed: true })
    }),
}

export const REPORT_REASONS: { key: string; title: string }[] = [
  { key: 'spam', title: 'Спам' },
  { key: 'abuse', title: 'Оскорбление' },
  { key: 'adult', title: 'Материал для взрослых' },
  { key: 'violence', title: 'Насилие' },
  { key: 'other', title: 'Другое' },
]
