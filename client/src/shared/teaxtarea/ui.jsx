import { forwardRef } from "react"
import cl from './style.module.css'
const Textarea = forwardRef((props, ref) => {
    return <textarea className={cl.textarea} ref={ref} {...props}></textarea>
})

export default Textarea