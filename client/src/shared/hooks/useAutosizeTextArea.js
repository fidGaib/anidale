import { useEffect } from 'react'

const useAutosizeTextArea = (textAreaRef, value, reziseBlockRef) => {
  useEffect(() => {
    if (textAreaRef && reziseBlockRef) {
      textAreaRef.style.height = '0px'
      reziseBlockRef.style.height = '50px'
      const scrollHeight = textAreaRef.scrollHeight
      textAreaRef.style.height = scrollHeight + 'px'
      reziseBlockRef.style.height = 15 + scrollHeight + 'px'
    }
  }, [textAreaRef, value])
}
export default useAutosizeTextArea
