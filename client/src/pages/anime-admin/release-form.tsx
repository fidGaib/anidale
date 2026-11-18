import { useMutation } from '@apollo/client'
import { FormEvent, useState } from 'react'

import { SAVE_ANIME_RELEASE } from '@/shared/graphql/schema'
import { AnimeReleaseCardFragment } from '@/shared/graphql/gql/graphql'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { FormError, Hint } from '@/shared/ui/notice'

import cl from './ui.module.css'

const SEASONS = ['Зима', 'Весна', 'Лето', 'Осень']
const TYPES = ['ТВ', 'ONA', 'OVA', 'Фильм']
const AGES = ['0+', '6+', '12+', '16+', '18+']
const STATUSES = [
  { value: 'ongoing', label: 'Выходит' },
  { value: 'completed', label: 'Завершён' },
  { value: 'announced', label: 'Анонсирован' },
]

interface Props {
  release?: AnimeReleaseCardFragment | null
  onClose: () => void
  /** Сохранённый релиз: новый можно сразу открыть на загрузку серий. */
  onSaved: (release: AnimeReleaseCardFragment) => void
}

/** Создание и редактирование релиза: карточка каталога, постер, жанры и публикация. */
export const ReleaseForm = ({ release, onClose, onSaved }: Props) => {
  const [title, setTitle] = useState(release?.title ?? '')
  const [originalTitle, setOriginalTitle] = useState(release?.originalTitle ?? '')
  const [description, setDescription] = useState(release?.description ?? '')
  const [year, setYear] = useState(String(release?.year ?? new Date().getFullYear()))
  const [season, setSeason] = useState(release?.season ?? 'Осень')
  const [type, setType] = useState(release?.type ?? 'ТВ')
  const [ageRating, setAgeRating] = useState(release?.ageRating ?? '16+')
  const [status, setStatus] = useState(release?.status ?? 'ongoing')
  const [franchise, setFranchise] = useState(release?.franchise ?? '')
  const [genres, setGenres] = useState(release?.genres.map((genre) => genre.name).join(', ') ?? '')
  const [isPublished, setIsPublished] = useState(release?.isPublished ?? true)
  const [poster, setPoster] = useState<File | null>(null)
  const [preview, setPreview] = useState<File | null>(null)

  const [save, { loading, error }] = useMutation(SAVE_ANIME_RELEASE, {
    onCompleted: (data) => {
      if (data?.saveAnimeRelease) onSaved(data.saveAnimeRelease)
      onClose()
    },
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await save({
      variables: {
        input: {
          ...(release ? { id: release.id } : {}),
          title: title.trim(),
          originalTitle: originalTitle.trim(),
          description: description.trim(),
          year: Number(year),
          season,
          type,
          ageRating,
          status,
          franchise: franchise.trim(),
          isPublished,
          genres: genres
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean),
          ...(poster ? { poster } : {}),
          ...(preview ? { preview } : {}),
        },
      },
    })
  }

  return (
    <Dialog
      title={release ? 'Изменить релиз' : 'Новый релиз'}
      width={620}
      busy={loading}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error?.message}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onClose} disabled={loading}>
              Отмена
            </Btn>
            <Btn variant='primary' type='submit' form='anime-release-form' disabled={loading}>
              {loading ? 'Сохраняем…' : 'Сохранить'}
            </Btn>
          </div>
        </div>
      }
    >
      <form id='anime-release-form' className={cl.form} onSubmit={submit}>
        <Field label='Название' value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        <Field
          label='Оригинальное название'
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
          maxLength={200}
        />
        <div className={cl.formRow}>
          <Field label='Год' type='number' min={1900} max={2100} value={year} onChange={(e) => setYear(e.target.value)} required />
          <label className={cl.select}>
            Сезон
            <select value={season} onChange={(e) => setSeason(e.target.value)}>
              {SEASONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className={cl.select}>
            Тип
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={cl.formRow}>
          <label className={cl.select}>
            Возраст
            <select value={ageRating} onChange={(e) => setAgeRating(e.target.value)}>
              {AGES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className={cl.select}>
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label='Франшиза'
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            maxLength={120}
            hint='Одинаковое название объединяет релизы в одну франшизу'
          />
        </div>
        <Field
          label='Жанры'
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
          hint='Через запятую: Экшен, Фэнтези. Новые жанры создадутся сами'
        />
        <Field.Area
          label='Описание'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
        />
        <div className={cl.formRow}>
          <label className={cl.file}>
            {release ? 'Заменить постер' : 'Постер'}
            <input type='file' accept='image/*' onChange={(e) => setPoster(e.target.files?.[0] ?? null)} />
            <small>{poster ? poster.name : release ? 'Оставьте пустым, чтобы не менять' : 'Обязателен при создании'}</small>
          </label>
          <label className={cl.file}>
            Кадр для карточки
            <input type='file' accept='image/*' onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
            <small>{preview ? preview.name : 'Необязательно: если пусто, показывается постер'}</small>
          </label>
        </div>
        <label className={cl.check}>
          <input type='checkbox' checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          <span>
            Опубликован
            <small>Черновик виден только в админке</small>
          </span>
        </label>
        <Hint>
          Постер и кадр сжимаются в webp на сервере. {release ? 'Видео серий — в кнопке «Серии и видео» у релиза.' : 'После сохранения сразу откроется загрузка серий: можно выбрать несколько видеофайлов.'}
        </Hint>
      </form>
    </Dialog>
  )
}
