/** Вкладки блока превью над стеной профиля. */
export type PreviewTab = 'music' | 'photos' | 'videos'

export const PREVIEW_ORDER: PreviewTab[] = ['music', 'photos', 'videos']

/** Сколько элементов есть в каждой вкладке (0 — вкладки нет). */
export type PreviewCounts = Record<PreviewTab, number>

/** Вкладки, в которых что-то есть, в привычном порядке: музыка, фото, видео. */
export const availableTabs = (counts: PreviewCounts): PreviewTab[] => PREVIEW_ORDER.filter((tab) => counts[tab] > 0)

/**
 * Какая вкладка должна быть открыта: выбранная пользователем, если в ней что-то есть,
 * иначе первая непустая; null, если показывать нечего (блок скрывается).
 */
export const pickPreviewTab = (counts: PreviewCounts, chosen: PreviewTab | null): PreviewTab | null => {
  const available = availableTabs(counts)
  if (chosen && available.includes(chosen)) return chosen
  return available[0] ?? null
}
