import { useMutation } from '@apollo/client'
import { FormEvent, useState } from 'react'

import { SAVE_ANIME_SCHEDULE } from '@/shared/graphql/schema'
import { AnimeReleaseCardFragment, AnimeScheduleFieldsFragment } from '@/shared/graphql/gql/graphql'
import { toTimestamp } from '@/shared/lib/time'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { FormError, Hint } from '@/shared/ui/notice'

import cl from './ui.module.css'

interface Props {
  entry?: AnimeScheduleFieldsFragment | null
  releases: AnimeReleaseCardFragment[]
  /** Предвыбранный релиз, когда расписание добавляют из карточки. */
  releaseId?: number
  onClose: () => void
  onSaved: () => void
}

/** Локальное время для input[type=datetime-local]. */
const toInputValue = (timestamp: number) => {
  const date = new Date(timestamp || Date.now() + 7 * 24 * 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Планирование выхода серии: релиз, номер и дата. Повтор заменяет дату. */
export const ScheduleForm = ({ entry, releases, releaseId, onClose, onSaved }: Props) => {
  const [selected, setSelected] = useState(String(entry?.releaseId ?? releaseId ?? releases[0]?.id ?? ''))
  const [number, setNumber] = useState(String(entry?.episodeNumber ?? 1))
  const [airAt, setAirAt] = useState(toInputValue(toTimestamp(entry?.airAt)))

  const [save, { loading, error }] = useMutation(SAVE_ANIME_SCHEDULE, {
    onCompleted: () => {
      onSaved()
      onClose()
    },
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await save({
      variables: {
        input: {
          releaseId: Number(selected),
          episodeNumber: Number(number),
          airAt: new Date(airAt).getTime(),
        },
      },
    })
  }

  return (
    <Dialog
      title={entry ? 'Изменить запись расписания' : 'Запланировать серию'}
      width={520}
      busy={loading}
      onClose={onClose}
      footer={
        <div className={cl.formFooter}>
          <FormError>{error?.message}</FormError>
          <div className={cl.formActions}>
            <Btn onClick={onClose} disabled={loading}>
              Отмена
            </Btn>
            <Btn variant='primary' type='submit' form='anime-schedule-form' disabled={loading || !releases.length}>
              {loading ? 'Сохраняем…' : 'Сохранить'}
            </Btn>
          </div>
        </div>
      }
    >
      {releases.length === 0 ? (
        <Hint>Сначала создайте релиз: планировать серию нечем.</Hint>
      ) : (
        <form id='anime-schedule-form' className={cl.form} onSubmit={submit}>
          <label className={cl.select}>
            Релиз
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.title}
                </option>
              ))}
            </select>
          </label>
          <div className={cl.formRow}>
            <Field
              label='Номер серии'
              type='number'
              min={1}
              max={9999}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
            <label className={cl.select}>
              Дата и время выхода
              <input type='datetime-local' value={airAt} onChange={(e) => setAirAt(e.target.value)} required />
            </label>
          </div>
          <Hint>Когда серия появится в каталоге, её запись расписания удалится автоматически.</Hint>
        </form>
      )}
    </Dialog>
  )
}
