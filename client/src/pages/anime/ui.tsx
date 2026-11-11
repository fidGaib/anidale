import { PropsWithChildren, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import Content from '@/shared/content'

import {
  franchises,
  genres,
  newEpisodes,
  releaseMeta,
  schedule,
  SCHEDULE_DAYS,
  ScheduleDay,
  videos,
} from './model'
import cl from './ui.module.css'

const PAGE_NAV = [
  { href: '#new-episodes', label: 'Новые эпизоды' },
  { href: '#schedule', label: 'Расписание' },
  { href: '#videos', label: 'Видео' },
  { href: '#franchises', label: 'Франшизы' },
  { href: '#genres', label: 'Жанры' },
]

/** Страница каталога аниме: новые эпизоды, расписание, видео, франшизы и жанры. */
export const Anime = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const [day, setDay] = useState<ScheduleDay>('today')

  return (
    <Content id={cl.content}>
      <div className={`${cl.page} ${theme === 'dark' ? cl.dark : cl.light}`}>
        <nav className={cl.nav} aria-label='Разделы каталога'>
          {PAGE_NAV.map((item, index) => (
            <a key={item.href} href={item.href} className={`${cl.navLink} ${index === 0 ? cl.navLinkActive : ''}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <Section id='new-episodes' title='Новые эпизоды' subtitle='Самые новые и свежие эпизоды в любимой озвучке'>
          <div className={cl.episodes}>
            {newEpisodes.map((episode) => (
              <Link to='/watch' className={cl.episodeCard} key={episode.id}>
                <img src={episode.preview} alt={episode.title} loading='lazy' />
                <span className={cl.episodeBadge}>Эпизод {episode.episode}</span>
                <span className={cl.episodePlay} aria-hidden>
                  <span className={cl.playIcon} />
                </span>
                <span className={cl.episodeBody}>
                  <span className={cl.episodeTitle}>{episode.title}</span>
                  <span className={cl.episodeMeta}>{releaseMeta(episode)}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <div className={cl.promo}>
          <div className={cl.promoText}>
            <h2 className={cl.promoTitle}>Так звучит аниме!</h2>
            <p className={cl.promoSubtitle}>
              Перевод и озвучивание на русский язык аниме-сериалов и не только. Смотрите новые эпизоды без рекламы и
              ждите продолжения вместе с нами.
            </p>
          </div>
          <a className={cl.promoButton} href='#schedule'>
            Смотреть расписание
          </a>
        </div>

        <Section
          id='schedule'
          title='Расписание релизов'
          subtitle='Список релизов, над которыми команда трудится прямо сейчас'
        >
          <div className={cl.tabs} role='tablist' aria-label='День показа'>
            {SCHEDULE_DAYS.map((tab) => (
              <button
                key={tab.id}
                type='button'
                role='tab'
                aria-selected={day === tab.id}
                className={`${cl.tab} ${day === tab.id ? cl.tabActive : ''}`}
                onClick={() => setDay(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={cl.schedule}>
            {schedule[day].map((release) => (
              <Link to='/watch' className={cl.scheduleCard} key={release.id}>
                <img className={cl.schedulePoster} src={release.poster} alt='' loading='lazy' />
                <span className={cl.scheduleBody}>
                  <span className={cl.scheduleName}>{release.title}</span>
                  <span className={cl.scheduleEpisode}>Эпизод {release.episode}</span>
                  <span className={cl.scheduleMeta}>{releaseMeta(release)}</span>
                  <span className={cl.scheduleGenres}>{release.genres.slice(0, 3).join(' • ')}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <Section id='videos' title='Последние видео' subtitle='Самые интересные видео ролики от любимой команды'>
          <div className={cl.videos}>
            {videos.map((video) => (
              <Link to='/watch' className={cl.videoCard} key={video.id}>
                <span className={cl.videoThumb}>
                  <img src={video.thumb} alt='' loading='lazy' />
                  <span className={cl.videoPlay} aria-hidden>
                    <span className={cl.playIcon} />
                  </span>
                  <span className={cl.videoDuration}>{video.duration}</span>
                </span>
                <span className={cl.videoTitle}>{video.title}</span>
                <span className={cl.videoMeta}>
                  {video.author} • {video.views} просмотров
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <Section
          id='franchises'
          title='Франшизы'
          subtitle='Самые интересные и захватывающие франшизы в любимой озвучке'
        >
          <div className={cl.franchises}>
            {franchises.map((franchise) => (
              <Link to='/watch' className={cl.franchiseCard} key={franchise.id}>
                <img src={franchise.poster} alt='' loading='lazy' />
                <span className={cl.franchiseBody}>
                  <span className={cl.franchiseTitle}>{franchise.title}</span>
                  <span className={cl.franchiseOriginal}>{franchise.original}</span>
                  <span className={cl.franchiseMeta}>
                    {franchise.years} • {franchise.releases} сезона • {franchise.episodes} эпизодов
                  </span>
                  <span className={cl.franchiseDuration}>{franchise.duration}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <Section id='genres' title='Жанры' subtitle='Список жанров на любой вкус и цвет'>
          <div className={cl.genres}>
            {genres.map((genre) => (
              <div className={cl.genre} key={genre.name}>
                <span className={cl.genreName}>{genre.name}</span>
                <span className={cl.genreCount}>{genre.count} релизов</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Content>
  )
}

type SectionProps = PropsWithChildren<{
  id: string
  title: string
  subtitle?: string
}>

const Section = ({ id, title, subtitle, children }: SectionProps) => (
  <section className={cl.section} id={id}>
    <header className={cl.sectionHead}>
      <div>
        <h2 className={cl.sectionTitle}>{title}</h2>
        {subtitle && <p className={cl.sectionSubtitle}>{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
)
