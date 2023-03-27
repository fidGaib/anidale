import cl from './styles/plug.module.less'

export const Plug = () => {
  return (
    <div className={cl.wrapper}>
      <a className={cl.avtorInfo}>
        <div className={cl.img}></div>
        <div className={cl.imgP}></div>
      </a>
      <div className={cl.description}></div>
      <div key={1} className={cl.wrapImage}></div>
    </div>
  )
}
