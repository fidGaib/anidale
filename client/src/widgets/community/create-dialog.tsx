import { useMutation } from '@apollo/client'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CommunityAvatar } from '@/entities/community'
import { CREATE_COMMUNITY } from '@/shared/graphql/schema'
import { Btn } from '@/shared/ui/btn'
import { Dialog } from '@/shared/ui/dialog'
import { CheckField, Field } from '@/shared/ui/field'
import { FormError } from '@/shared/ui/notice'

import cl from './dialogs.module.css'
import { useFilePreview } from './use-file-preview'

/** Окно «Создать сообщество»: название, описание и аватарка; после создания открывается страница сообщества. */
export const CreateCommunityDialog = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const [create, { loading, error }] = useMutation(CREATE_COMMUNITY)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [isClosed, setIsClosed] = useState(false)
  const preview = useFilePreview(avatar)
  const input = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!name.trim() || loading) return
    try {
      const result = await create({ variables: { name, description, avatar, isClosed } })
      const id = result.data?.createCommunity.id
      onClose()
      if (id) navigate(`/community/${id}`)
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <Dialog
      title='Новое сообщество'
      width={460}
      busy={loading}
      onClose={onClose}
      footer={
        <>
          <span className={cl.hint}>Вы станете создателем и администратором</span>
          <Btn variant='primary' disabled={!name.trim() || loading} onClick={() => void submit()}>
            {loading ? 'Создание…' : 'Создать'}
          </Btn>
        </>
      }
    >
      <div className={cl.avatarRow}>
        {preview ? (
          <img className={cl.avatarPreview} src={preview} alt='' />
        ) : (
          <CommunityAvatar name={name || '?'} avatar='' size={64} />
        )}
        <Btn variant='secondary' onClick={() => input.current?.click()}>
          {avatar ? 'Заменить картинку' : 'Загрузить картинку'}
        </Btn>
        <input
          ref={input}
          type='file'
          accept='image/*'
          hidden
          onChange={(e) => {
            setAvatar(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>
      <Field
        label='Название'
        value={name}
        maxLength={60}
        autoFocus
        placeholder='Например, Любители аниме'
        onChange={(e) => setName(e.target.value)}
      />
      <Field.Area
        label='Описание'
        value={description}
        maxLength={2000}
        rows={4}
        placeholder='О чём ваше сообщество'
        onChange={(e) => setDescription(e.target.value)}
      />
      <CheckField
        checked={isClosed}
        onChange={(e) => setIsClosed(e.target.checked)}
        hint='Стену и участников видят только участники, вступить можно по заявке'
      >
        Закрытое сообщество
      </CheckField>
      {error && <FormError>{error.message}</FormError>}
    </Dialog>
  )
}
