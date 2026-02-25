import cl from './ui.module.css'

export const ButtonUI = (props: any) => {
  return (
    <button className={cl.button} {...props}>
      {props.children}
    </button>
  )
}
