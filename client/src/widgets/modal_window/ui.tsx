import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

export const ModalWindow = ({ avatar }: { avatar: string }) => {
  return (
    <div className={cl.modal_window}>
      <div className={cl.modal_body}>
        <div className={cl.content}>
          <ImageLoading className={cl.bg} src={avatar} />
          <ImageLoading className={cl.image} src={avatar} />
        </div>
        <div className={cl.wrap_menu}>
          <div className={cl.menu}>
            <li>Скопировать URL</li>
            <li>Пожаловаться</li>
            <li>В избранное</li>
            <li>Поделиться</li>
            <li>Скачать</li>
          </div>
          <div className={cl.commentaries}>
            <div className={cl.send_comm}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <Input type='text' placeholder='Начните вводить...' />
              <img src='/icons/add_photo.svg' />
              <img src='/icons/send.svg' />
            </div>
            <div className={cl.item}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <div className={cl.text}>Привет</div>
            </div>
            <div className={cl.item}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <div className={cl.text}>Lorem ipsum dolor sit amet.</div>
            </div>
            <div className={cl.item}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <div className={cl.text}>Lorem, ipsum dolor.</div>
            </div>
            <div className={cl.item}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <div className={cl.text}>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa, officiis!</div>
            </div>
            <div className={cl.item}>
              <ImageLoading className={cl.avatar_send} src={avatar} />
              <div className={cl.text}>Lorem, ipsum.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
