import type { WallKind } from '@/features/profile/types'

/**
 * Подходит ли только что опубликованный пост автора под открытую вкладку стены и поиск.
 * В архив и в результаты поиска новые записи не добавляются, а на «Мои посты» не попадают репосты.
 */
export const fitsWall = (kind: WallKind, search: string, post: { repostOf?: unknown }): boolean =>
  kind !== 'archive' && !search.trim() && !(kind === 'own' && !!post.repostOf)

/** Что изменилось у поста в другом месте приложения (окно поста, меню действий). */
export interface PostChange {
  removed?: boolean
  archived?: boolean
  bookmarked?: boolean
}

/**
 * Нужно ли убрать пост из открытого списка после изменения:
 * удалён; ушёл в архив (кроме вкладки архива); вернулся из архива (на вкладке архива); убран из закладок (на странице закладок).
 */
export const shouldDropAfterChange = (change: PostChange, kind: WallKind, bookmarksPage: boolean): boolean =>
  !!change.removed ||
  (change.archived === true && kind !== 'archive') ||
  (change.archived === false && kind === 'archive') ||
  (bookmarksPage && change.bookmarked === false)
