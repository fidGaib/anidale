import cl from './styles/style.module.css'

export const Loader = () => {
  return (
    <div className={cl.loader}>
      <img src='http://localhost:5000/public/loading.gif' />
    </div>
  )
}
