import { useEffect } from 'react'

export const useAutosizeTextArea = (textRef?: any, value?: string) => {
  useEffect(() => {
    if (textRef) {
      textRef.style.height = '0px'
      const scrollHeight = textRef.scrollHeight
      textRef.style.height = scrollHeight + 'px'
    }
  }, [textRef, value])
}
