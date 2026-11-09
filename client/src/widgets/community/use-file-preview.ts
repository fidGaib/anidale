import { useEffect, useState } from 'react'

/** Адрес для показа выбранного файла; освобождается, когда файл меняется или окно закрывается. */
export const useFilePreview = (file: File | null): string => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) return setUrl('')
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}
