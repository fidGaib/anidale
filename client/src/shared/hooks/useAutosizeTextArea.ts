import { useEffect } from 'react'

export const useAutosizeTextArea = (textRef?: any, value?: string, block?: any) => {
  useEffect(() => {
    if (textRef && block) {
      textRef.style.height = '0px'
      block.style.height = '50px'
      const scrollHeight = textRef.scrollHeight
      textRef.style.height = scrollHeight + 'px'
      block.style.height = 30 + scrollHeight + 'px'
    }
  }, [textRef, value])
}
