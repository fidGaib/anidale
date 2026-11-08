/**
 * Ограничитель параллельности: не больше `max` задач одновременно, остальные ждут в очереди.
 * Слот передаётся следующей задаче напрямую, поэтому лимит не превышается даже на короткое время.
 */
export const createLimiter = (max: number) => {
  let active = 0
  const queue: Array<() => void> = []

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < max) {
      active++
    } else {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    try {
      return await task()
    } finally {
      const next = queue.shift()
      if (next) next() // слот переходит следующей задаче, счётчик не меняется
      else active--
    }
  }
}
