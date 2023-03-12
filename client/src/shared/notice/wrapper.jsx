import cl from './styles/wrapper.module.css'

const Wrapper = (props) => {
  return (
    <div className={cl.notice} id={props.id}>
      {props.children}
    </div>
  )
}
export default Wrapper
