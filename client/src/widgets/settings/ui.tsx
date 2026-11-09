import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'
import AvatarEditor from 'react-avatar-editor'
import Dropzone from 'react-dropzone'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useSettingsStore } from '@/features/settings/module'
import { PROFILE, UPDATE_COVER, UPDATE_PROFILE, updateUserQuery } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { toTimestamp } from '@/shared/lib/time'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'

import cl from './ui.module.css'

const IMAGE_TYPES = { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }

type ProfileData = {
  login?: string | null
  status?: string | null
  city?: string | null
  work?: string | null
  education?: string | null
  about?: string | null
  website?: string | null
  birthDate?: unknown
  backgroundImage?: string | null
}

// Layout editor profile
export const LayoutLoginAvatar = () => {
  const me = useRefreshStore((state) => state.refreshData)
  const { data } = useQuery(PROFILE, {
    variables: { id: me.id ?? 0 },
    skip: !me.id,
    fetchPolicy: 'network-only',
  })
  const user = data?.getUser as ProfileData | undefined

  return (
    <div className={cl.wrapper}>
      <EditProfile user={user} />
      <CoverEditor user={user} />
      <AvatarEditorComponent />
    </div>
  )
}

// Основные поля профиля: логин, статус, город и дата рождения
const EditProfile = ({ user }: { user?: ProfileData }) => {
  const setRefreshData = useRefreshStore((state) => state.setRefreshData)
  const [login, setLogin] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const [work, setWork] = useState('')
  const [education, setEducation] = useState('')
  const [about, setAbout] = useState('')
  const [website, setWebsite] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saved, setSaved] = useState(false)
  const [updateProfile, { loading, error }] = useMutation(UPDATE_PROFILE)
  // Заполняем форму один раз: после сохранения обложки запрос может обновиться,
  // и это не должно затирать несохранённые правки.
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || initialized.current) return
    initialized.current = true
    setLogin(user.login ?? '')
    setStatus(user.status ?? '')
    setCity(user.city ?? '')
    setWork(user.work ?? '')
    setEducation(user.education ?? '')
    setAbout(user.about ?? '')
    setWebsite(user.website ?? '')
    const timestamp = toTimestamp(user.birthDate)
    setBirthDate(timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '')
  }, [user])

  const save = async () => {
    setSaved(false)
    const timestamp = birthDate ? new Date(`${birthDate}T00:00:00.000Z`).getTime() : null
    try {
      const result = await updateProfile({
        variables: { login: login.trim() || null, status, city, work, education, about, website, birthDate: timestamp },
      })
      const updated = result.data?.updateUser
      if (updated?.login) setRefreshData({ login: updated.login })
      setSaved(true)
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <section className={cl.section}>
      <h2>Профиль</h2>
      <p className={cl.error}>{loading ? 'Сохранение...' : error?.message}</p>
      {saved && !loading && !error && <p className={cl.success}>Сохранено</p>}
      <div className={cl.form}>
        <label>
          Логин
          <Input type='text' placeholder='Введите логин...' value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>
        <label>
          Статус
          <Input
            type='text'
            placeholder='Пару слов о себе'
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </label>
        <label>
          Город
          <Input type='text' placeholder='Где вы живёте' value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label>
          Дата рождения
          <Input type='date' value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <label>
          Место работы
          <Input
            type='text'
            maxLength={100}
            placeholder='Где вы работаете'
            value={work}
            onChange={(e) => setWork(e.target.value)}
          />
        </label>
        <label>
          Образование
          <Input
            type='text'
            maxLength={100}
            placeholder='Где вы учились'
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          />
        </label>
        <label>
          О себе
          <Input
            type='text'
            maxLength={500}
            placeholder='Расскажите о себе'
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </label>
        <label>
          Сайт
          <Input
            type='text'
            maxLength={200}
            placeholder='https://'
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        <ButtonUI onClick={save} disabled={loading}>
          Сохранить
        </ButtonUI>
      </div>
    </section>
  )
}

// Обложка профиля
const CoverEditor = ({ user }: { user?: ProfileData }) => {
  const validateFile = useSettingsStore((state) => state.validateFile)
  const errorInStore = useSettingsStore((state) => state.errorAvatar)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [uploadedCover, setUploadedCover] = useState('')
  const [updateCover, { loading, error }] = useMutation(UPDATE_COVER)

  const storedCover = useSrcAvatar(user?.backgroundImage ?? '')
  const shownCover = uploadedCover || storedCover

  const handleDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    if (await validateFile(acceptedFiles)) {
      setFile(acceptedFiles[0])
      setPreview(URL.createObjectURL(acceptedFiles[0]))
    }
  }

  const saveCover = async () => {
    if (!file) return
    try {
      const result = await updateCover({ variables: { backgroundImage: file } })
      const path = result.data?.updateUser?.backgroundImage
      if (path) setUploadedCover(useSrcAvatar(path))
      setFile(null)
      setPreview('')
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  return (
    <section className={cl.section}>
      <h2>Обложка профиля</h2>
      <p className={cl.error}>{loading ? 'Сохранение...' : error?.message || errorInStore}</p>

      <div className={cl.coverPreview} style={shownCover ? { backgroundImage: `url(${shownCover})` } : undefined}>
        {!shownCover && <span>Обложка пока не загружена</span>}
      </div>

      {!file ? (
        <Dropzone onDrop={handleDrop} accept={IMAGE_TYPES}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()} className={cl.coverDrop}>
              <input {...getInputProps()} />
              <ImageLoading src='/icons/add_photo.svg' />
              <span>Выбрать обложку</span>
            </div>
          )}
        </Dropzone>
      ) : (
        <>
          <div className={cl.coverPreview} style={{ backgroundImage: `url(${preview})` }} />
          <div className={cl.actions}>
            <ButtonUI
              onClick={() => {
                setFile(null)
                setPreview('')
              }}
            >
              Отмена
            </ButtonUI>
            <ButtonUI onClick={saveCover} disabled={loading}>
              Сохранить
            </ButtonUI>
          </div>
        </>
      )}
    </section>
  )
}

const AvatarEditorComponent = () => {
  const [image, setImage] = useState<File | string>('')
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const editorRef = useRef<AvatarEditor>(null)
  const validateFile = useSettingsStore((state) => state.validateFile)
  const errorInStore = useSettingsStore((state) => state.errorAvatar)

  // Обработка загрузки файла
  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (await validateFile(acceptedFiles)) {
        setImage(acceptedFiles[0])
      }
    }
  }

  // Получение обрезанного изображения
  const saveAvatar = () => {
    if (!editorRef.current) return

    // Получаем canvas с обрезанным изображением
    const canvas = editorRef.current.getImageScaledToCanvas()

    // Конвертируем в data URL
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'avatar', {
        type: blob.type,
        lastModified: Date.now(),
      })
      uploadAvatarToServer(file)
    })
  }

  const [updateUser, { data, error, loading }] = useMutation(updateUserQuery)
  const setRefreshData = useRefreshStore((state) => state.setRefreshData)
  const uploadAvatarToServer = async (file: File) => {
    await updateUser({ variables: { avatar: file }, fetchPolicy: 'network-only' })
  }
  useEffect(() => {
    if (data?.updateUser && data.updateUser.avatar !== null) {
      setRefreshData({ avatar: data.updateUser.avatar })
      setImage('')
    }
  }, [data])
  return (
    <section className={cl.container}>
      <h2>Изменить фотографию профиля</h2>
      {/* Зона загрузки */}
      {!image && (
        <Dropzone onDrop={handleDrop} accept={IMAGE_TYPES}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()} className={cl.dropzone}>
              <input {...getInputProps()} />
              <ImageLoading src='/icons/add_photo.svg' />
            </div>
          )}
        </Dropzone>
      )}

      {/* Редактор */}
      {image && (
        <div className={cl.editorWrapper}>
          <AvatarEditor
            ref={editorRef}
            image={image}
            width={250}
            height={250}
            border={50}
            color={[0, 0, 0, 0.6]} // RGBA
            scale={scale}
            rotate={rotate}
            onLoadSuccess={() => console.log('Изображение загружено')}
          />

          {/* Управление масштабом */}
          <div className={cl.controls}>
            <label>
              Масштаб:
              <input
                type='range'
                value={scale}
                min={1}
                max={5}
                step={0.1}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className={cl.customRange}
              />
            </label>

            {/* Управление поворотом */}
            <label>
              Поворот:
              <input
                type='range'
                value={rotate}
                min={0}
                max={360}
                onChange={(e) => setRotate(parseInt(e.target.value, 10))}
                className={cl.customRange}
              />
            </label>
          </div>
          <p className={cl.error}>{error?.message || loading ? 'Сохранение...' : errorInStore || error?.message}</p>
        </div>
      )}

      {/* Кнопки действий */}
      {image && (
        <div className={cl.actions}>
          <ButtonUI onClick={() => setImage('')} disabled={!image}>
            Удалить
          </ButtonUI>
          <ButtonUI onClick={saveAvatar} disabled={!image}>
            Сохранить
          </ButtonUI>
        </div>
      )}
    </section>
  )
}
