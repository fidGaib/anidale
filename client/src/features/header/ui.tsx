import { useReactiveVar } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { VarAuthData } from '@/app/providers/routes/AppRouter'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

export const MenuHeader = () => {
  const AuthData = useReactiveVar(VarAuthData)
  const setTheme = useDarkModeStore((store) => store.setTheme)
  const linksAuth = [
    { link: `/profile/${AuthData.id}`, text: 'Профиль', icon: '/icons/profile.svg' },
    { link: `/feed`, text: 'Лента', icon: '/icons/feed.svg' },
    { link: `/messages`, text: 'Мессенджер', icon: '/icons/chat.svg' },
    { link: `/friends`, text: 'Друзья', icon: '/icons/friends.svg' },
    { link: `/groups`, text: 'Сообщества', icon: '/icons/groups.svg' },
    { link: `/music`, text: 'Музыка', icon: '/icons/music.svg' },
    { link: `/anime`, text: 'Аниме', icon: '/icons/manga.svg' },
    { link: `/settings`, text: 'Настройки', icon: '/icons/settings.svg' },
  ]
  const linksNotAuth = [{ link: `/feed`, text: 'Лента', icon: '/icons/feed.svg' }]
  return (
    <>
      <button className={cl.focusBtn}>
        <ImageLoading className={cl.headerMenuSvg} src='/icons/menu.svg' alt='anidale menu icon' />
      </button>
      <ul className={`playground ${cl.menu}`}>
        {AuthData.id > 0 ? (
          <>
            {linksAuth.map((item) => {
              return (
                <li key={item.text}>
                  <ImageLoading className={cl.menuSvg} src={item.icon} alt={`anidale ${item.text}`} />
                  <Link to={item.link}>{item.text}</Link>
                </li>
              )
            })}
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/turn.svg' alt='anidale settings icon' />
              <Link onClick={setTheme} to={'#'}>
                Темный режим
              </Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/logout.svg' alt='anidale logout icon' />
              <Link to={'/signout'}>Выйти</Link>
            </li>
          </>
        ) : (
          <>
            {linksNotAuth.map((item) => {
              return (
                <li key={item.text}>
                  <ImageLoading className={cl.menuSvg} src={item.icon} alt={`anidale ${item.text}`} />
                  <Link to={item.link}>{item.text}</Link>
                </li>
              )
            })}
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/turn.svg' alt='anidale settings icon' />
              <Link onClick={setTheme} to={'#'}>
                Темный режим
              </Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/sigin.svg' alt='anidale sigin icon' />
              <Link to={'/signin'}>Войти</Link>
            </li>
          </>
        )}
      </ul>
      {AuthData.id > 0 ? (
        <Link to={`/profile/${AuthData.id}`} className={cl.userAvatar}>
          <ImageLoading src={useSrcAvatar(AuthData.avatar)} />
        </Link>
      ) : (
        <></>
      )}
    </>
  )
}
export const FindAnime = () => {
  const [active__modal, setActiveModal] = useState(false)
  const theme = useDarkModeStore((store) => store.theme)
  const [input, set__input] = useState('')
  const data = [
    {
      title: 'Мастера меча онлайн',
      preview: '/1.png',
      date: ' Лето • 2023 • +18',
    },
    {
      title: 'Башня бога',
      preview: '/2.png',
      date: ' Лето • 2023 • +18',
    },
    {
      title: 'Магическая битва',
      preview: '/5.jpg',
      date: ' Лето • 2023 • +18',
    },
    {
      title: 'Ванпачмен',
      preview: '/4.png',
      date: ' Лето • 2023 • +18',
    },
  ]
  const filter__data = data.filter((item) => {
    return item.title.toLowerCase().includes(input.toLowerCase())
  })
  return (
    <>
      <ImageLoading className={cl.search__anime} onClick={() => setActiveModal(true)} src='/icons/search.svg' />
      <Modal active={active__modal} setActive={setActiveModal}>
        <div className={cl.search__in__modal}>
          <Input
            type='text'
            placeholder='Введите название аниме...'
            style={{
              color: `${theme === 'dark' ? '#fff' : '#000'}`,
              background: `${theme === 'dark' ? 'rgb(50, 50, 50)' : 'rgb(235,235,235)'}`,
            }}
            value={input}
            onChange={(e) => set__input(e.target.value)}
          />
        </div>
        {input ? (
          filter__data.map((item) => {
            return (
              <Link
                key={item.title}
                to={'/watch'}
                className={`${cl.response__shearch__item} ${theme === 'dark' ? '' : `${cl.ligth_hover}`}`}
                onClick={() => setActiveModal(false)}
                style={{
                  color: `${theme === 'dark' ? '#fff' : '#000'}`,
                }}
              >
                <ImageLoading src={item.preview} className={cl.item__image} />
                <div className={cl.description}>
                  <div className={cl.title} style={{ color: `${theme === 'dark' ? '#fff' : '#000'}` }}>
                    {item.title}
                  </div>
                  <div className={cl.date} style={{ color: `${theme === 'dark' ? 'gray' : 'gray'}` }}>
                    {item.date}
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <></>
        )}
      </Modal>
    </>
  )
}
export const NotificationHeader = () => {
  const AuthData = useReactiveVar(VarAuthData)
  return (
    <>
      {AuthData.id === 0 ? (
        <div style={{ marginLeft: 'auto' }}></div>
      ) : (
        <>
          <button className={cl.notification}>
            <ImageLoading
              className={cl.notificationSvg}
              src='/icons/notification.svg'
              alt='anidale notification icon'
            />
          </button>
          <div className={cl.notificationWrapper}>
            <div className='playground'>
              <div className={cl.item}>
                <ImageLoading src={useSrcAvatar(AuthData.avatar)} className={cl.itemAvatar} />
                <div className={cl.body}>
                  <p className={cl.title}>{AuthData.login ? AuthData.login : 'Акигава'}</p>
                  <p className={cl.description}>Привет! Как твои дела?</p>
                </div>
              </div>
              <div className={cl.item}>
                <ImageLoading src={useSrcAvatar(AuthData.avatar)} className={cl.itemAvatar} />
                <div className={cl.body}>
                  <p className={cl.title}>{AuthData.login ? AuthData.login : 'Акигава'}</p>
                  <p className={cl.description}>Привет! Как твои дела?</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
