import { useEffect, useMemo, useState } from 'react'

const useOnScreen = (ref) => {
  const [isIntersecting, setIntersecting] = useState(false)
  const observer = useMemo(() => new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting)), [ref])
  useEffect(() => {
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return isIntersecting
}
export default useOnScreen
