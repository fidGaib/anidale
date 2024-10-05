import { useEffect, useState } from 'react'
import { FreeMode, Navigation } from 'swiper'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
// Import Swiper styles
import 'swiper/swiper.min.css'

import { useDarkModeStore } from '@/app/module'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import ButtonUI from '@/shared/ui/button'

import cl from './ui.module.less'

export const Anime = () => {
  const anime = [
    {
      title: 'Магическая битва 2 сезон',
      src: '/5.jpg',
      date: 'Лето • 2023 • +18',
      cat: 'Демоны • Сверхъестественное • Сёнен • Фэнтези • Экшен',
      desc: '2006 год. Юджи Итадори только-только исполнилось четыре, а шестнадцатилетний Сатору Годжо на пару с Сугуру Гэто уже стали самыми сильными. Преподаватель Токийского колледжа магии поручает им двоим крайне важную миссию: в целости и сохранности доставить к мастеру Тэнгэну старшеклассницу по имени Рико Аманай. Девочка была избрана идеальным сосудом силы, и пришло время мастеру слиться с её физической оболочкой. Однако недоброжелатели не дремлют, и, чтобы помешать этому, обращаются к человеку по прозвищу Убийца магов. Кто же на самом деле этот Убийца? Получится ли у юных магов выполнить свою миссию? Обо всём этом мы узнаем во втором сезоне "Магической битвы"!',
    },
    {
      title: 'Клинок, Рассекающий Демонов: Тренировка Хашира',
      src: '/6.jpeg',
      date: 'Весна • 2024 • +18',
      cat: 'Исторический • Приключения • Сверхъестественное • Сёнен • Фэнтези • Экшен',
      desc: 'С тех пор как Нэзуко стала невосприимчива к солнечному свету, нападения демонов прекратились. Но, разумеется, охотники знают, что Кибутсуджи Мудзан обязательно вновь попытается схватить её, а значит, вскоре им предстоит новое разрушительное противостояние. Чтобы повысить шансы на победу в грядущей войне, корпус решает провести так называемую тренировку столпов. Эта изнурительная программа должна не только укрепить физические способности и здоровье рядовых охотников на демонов, но и значительно поднять индивидуальную силу каждого из столпов. Разумеется, для Танджиро с ребятами этот процесс будет явно не из лёгких, но ради победы над демонами они должны стиснуть зубы и вытерпеть все предстоящие испытания.',
    },
  ]

  const theme = useDarkModeStore((store) => store.theme)
  return (
    <Content id={cl.content}>
      <NewReleases anime={anime} />
      <div className={cl.NewReleases}>
        <p className={cl.EpisodesP} style={{ color: `${theme === 'dark' ? '#fff' : '#000'}` }}>
          Новые эпизоды ›
        </p>
        <p className={cl.EpisodesP2}>Самые новые и свежие эпизоды в любимой озвучке</p>

        <div className={cl.wrapReleases}>
          <div className={cl.oneReleas}>
            <img src='https://i.pinimg.com/736x/e9/0a/f9/e90af95413f296d47f20882300fa0b3c.jpg' alt='' />
          </div>
          <div className={cl.oneReleas}>
            <img src='https://i.pinimg.com/736x/a1/0d/37/a10d372d63df3336cf2bdc69aaae5f66.jpg' alt='' />
          </div>
          <div className={cl.oneReleas}>
            <img src='https://i.pinimg.com/736x/ee/24/d8/ee24d89378444b1a1e70f54211809f8a.jpg' alt='' />
          </div>
          <div className={cl.oneReleas}>
            <img src='https://i.pinimg.com/736x/17/b3/0e/17b30eb03357f13214eab5477acbaade.jpg' alt='' />
          </div>
          <div className={cl.oneReleas}>
            <img
              src='https://diskomir.ru/upload/resize_cache/webp/iblock/61a/61a9b39dd8df35d0e9a74785b15402bb.webp'
              alt=''
            />
          </div>
        </div>
        <div className={cl.NewReleases}>
          <p className={cl.EpisodesP} style={{ color: `${theme === 'dark' ? '#fff' : '#000'}` }}>
            Жанры ›
          </p>
          <p className={cl.EpisodesP2}>Список жанров на любой вкус и цвет</p>
          <div className={cl.wrapReleases} id={cl.wrapCat}>
            <div className={cl.oneReleas}>
              <img src='https://i.pinimg.com/736x/17/b3/0e/17b30eb03357f13214eab5477acbaade.jpg' alt='' />
              <p>Фэнтези</p>
            </div>
            <div className={cl.oneReleas}>
              <img
                src='https://diskomir.ru/upload/resize_cache/webp/iblock/61a/61a9b39dd8df35d0e9a74785b15402bb.webp'
                alt=''
              />
              <p>Исекай</p>
            </div>
            <div className={cl.oneReleas}>
              <img src='https://i.pinimg.com/736x/e9/0a/f9/e90af95413f296d47f20882300fa0b3c.jpg' alt='' />
              <p>Экшен</p>
            </div>
            <div className={cl.oneReleas}>
              <img src='https://i.pinimg.com/736x/ee/24/d8/ee24d89378444b1a1e70f54211809f8a.jpg' alt='' />
              <p>Вампиры</p>
            </div>
            <div className={cl.oneReleas}>
              <img src='https://i.pinimg.com/736x/a1/0d/37/a10d372d63df3336cf2bdc69aaae5f66.jpg' alt='' />
              <p>Сверхъестественное</p>
            </div>
          </div>
        </div>
      </div>
    </Content>
  )
}

const NewReleases = ({ anime }: any) => {
  return (
    <Swiper
      style={{
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        '--swiper-navigation-color': '#fff',
        '--swiper-pagination-color': '#fff',

        width: '100%',
      }}
      spaceBetween={0}
      navigation={true}
      className={cl.releases}
      modules={[FreeMode, Navigation]}
    >
      {anime.map((child: any) => {
        return (
          <SwiperSlide id={cl.oneReales} key={child.title}>
            <ImageLoading className={cl.img} src={child.src} />
            <div
              className='hz'
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                zIndex: 9,
                top: 0,
              }}
            >
              <div className={cl.ReleasInfo}>
                <p className={cl.ReleasTitle}>{child.title}</p>
                <p className={cl.ReleasDate}>{child.date}</p>
                <p className={cl.ReleasCat}>{child.cat}</p>
                <p className={cl.ReleasDesc}>{child.desc}</p>
                <ButtonUI id={cl.ReleasButton}>Смотреть</ButtonUI>
              </div>
            </div>
          </SwiperSlide>
        )
      })}
    </Swiper>
  )
}
