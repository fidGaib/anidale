import { RefObject, useEffect } from 'react'

type ElementRef = RefObject<HTMLElement>

/**
 * Вызывает handler по клику вне ref (и вне notOutRef, если он передан).
 *
 * Важно: один и тот же listener добавляется и снимается с одинаковыми опциями.
 * В прежней версии добавлялся анонимный обработчик, а удалялся handler с capture=true,
 * поэтому слушатель не снимался никогда.
 */
const useOutsideClick = (
  ref: ElementRef,
  handler: (event: MouseEvent) => void,
  notOutRef?: ElementRef | null,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const el = ref.current
      const notOut = notOutRef?.current
      const target = event.target as Node | null

      if (!el || el.contains(target) || (notOut && notOut.contains(target))) return

      handler(event)
    }

    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler, notOutRef])
}

export default useOutsideClick

export const useOutsideClickModal = (ref: ElementRef, handler: (event: MouseEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const el = ref.current
      const target = event.target as Node | null

      if (!el || el.contains(target)) return

      handler(event)
    }

    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}
