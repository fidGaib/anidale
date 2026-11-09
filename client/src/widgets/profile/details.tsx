import { useState } from 'react'
import { Link } from 'react-router-dom'

import { RichText } from '@/shared/ui/rich-text'

import { DetailRow } from './details-model'
import cl from './details.module.css'

interface Props {
  rows: DetailRow[]
  isOwn: boolean
}

/** Раскрывающийся блок «Подробнее» в карточке профиля. */
export const ProfileDetails = ({ rows, isOwn }: Props) => {
  const [open, setOpen] = useState(false)
  if (!rows.length && !isOwn) return null

  return (
    <div className={cl.wrap}>
      <button type='button' className={cl.toggle} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? 'Скрыть подробную информацию' : 'Подробнее'}
        <span className={`${cl.arrow} ${open ? cl.arrowOpen : ''}`}>⌄</span>
      </button>
      {open && (
        <dl className={cl.list}>
          {rows.map((row) => (
            <div key={row.key} className={cl.row}>
              <dt>{row.label}</dt>
              <dd>
                {row.link ? (
                  <a href={row.link} target='_blank' rel='noopener noreferrer nofollow'>
                    {row.value}
                  </a>
                ) : row.key === 'about' ? (
                  <RichText text={row.value} />
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
          {!rows.length && <p className={cl.empty}>Вы ещё ничего не рассказали о себе.</p>}
          {isOwn && (
            <Link to='/settings' className={cl.edit}>
              {rows.length ? 'Изменить' : 'Заполнить профиль'}
            </Link>
          )}
        </dl>
      )}
    </div>
  )
}
