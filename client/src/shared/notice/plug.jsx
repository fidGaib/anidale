import cl from './styles/plug.module.css'

const Plug = () => {
  return (
    <div className={cl.notice}>
      <a className={cl.avtorInfo}>
        <div className={cl.img}></div>
        <div className={cl.imgP}></div>
      </a>
      <div className={cl.description}></div>
      <div key={1} className={cl.wrapImage}>
        <div key={1} className={cl.img}></div>
        <div key={2} className={cl.img}></div>
        <div key={3} className={cl.img}></div>
        <div key={4} className={cl.img}></div>
        <div key={5} className={cl.img}></div>
        <div key={6} className={cl.img}></div>
        <div key={7} className={cl.img}></div>
        <div key={8} className={cl.img}></div>
        <div key={9} className={cl.img}></div>
      </div>
    </div>
  )
}

export default Plug
