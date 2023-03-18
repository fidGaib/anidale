import cl from './ui.module.css'

export const Loader = () => {
  return (
    <div className={cl.loader}>
      <img src='http://localhost:5000/storage/files-site/images/loading.gif' />
    </div>
  )
}
