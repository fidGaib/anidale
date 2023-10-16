// import Icon from '@/shared/icons'
import { useState } from 'react'

import Content from '@/shared/content'

import cl from './ui.module.less'

export const Music = () => {
  document.title = 'AniDale - Музыка'
  const [isPause, setPause] = useState(false)
  const pause_active = () => {
    if (isPause) setPause(false)
    else setPause(true)
  }
  return (
    <Content>
      <ul className={cl.head_music}>
        <p>Моя музыка</p>
        <p>Для вас</p>
        <p>Мои лейлисты</p>
        {/* <Icon className={cl.add_music_icon} iconId='add_photo'/> */}
      </ul>
      <div className={cl.one_child} onClick={pause_active}>
        <img src='https://i.imgur.com/4loHCZU.jpg' />
        {/* {
            isPause ? <Icon iconId='pause' className={cl.pause_icon}/> : <Icon iconId='play' className={cl.play_icon}/>
          } */}

        <div className={cl.info_music}>
          <div className={cl.title}>hentai</div>
          <div className={cl.owner}>hentai edit, basiska</div>
        </div>
      </div>
      <div className={cl.one_child}>
        <img src='https://i.imgur.com/4loHCZU.jpg' />
        {/* <Icon iconId='play' className={cl.play_icon}/> */}
        <div className={cl.info_music}>
          <div className={cl.title}>hentai</div>
          <div className={cl.owner}>hentai edit, basiska</div>
        </div>
      </div>
      <div className={cl.one_child}>
        <img src='https://i.imgur.com/4loHCZU.jpg' />
        {/* <Icon iconId='play' className={cl.play_icon}/> */}
        <div className={cl.info_music}>
          <div className={cl.title}>hentai</div>
          <div className={cl.owner}>hentai edit, basiska</div>
        </div>
      </div>
    </Content>
  )
}
