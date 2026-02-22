import { useMutation } from '@apollo/client'
import { useEffect, useState } from 'react'
import { useRef } from 'react'
import AvatarEditor from 'react-avatar-editor'
import Dropzone from 'react-dropzone'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useSettingsStore } from '@/features/settings/module'
import { updateUserQuery } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { ButtonUI } from '@/shared/ui/button/ui'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

// Layout editor login && avatar
export const LayoutLoginAvatar = () => {
  return (
    <div className={cl.wrapper}>
      <AvatarEditorComponent />
      <EditLogin />
    </div>
  )
}
// Edit Login
const EditLogin = () => {
  const [refreshData, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
  const errorInStore = useSettingsStore((state) => state.errorLogin)
  const setLogin = useSettingsStore((state) => state.setLogin)
  const [login, isSetLogin] = useState(refreshData.login)
  //Отслеживаем изменения data и обновляем refreshData
  const [updateUser, { data, error, loading }] = useMutation(updateUserQuery)
  useEffect(() => {
    if (data?.updateUser && data.updateUser.login !== null) {
      setRefreshData({ login: data.updateUser.login })
    }
  }, [data])
  useEffect(() => {
    if (!login) return
    setLogin(login)
  }, [login])
  return (
    <>
      <h2>Информация</h2>
      <p className={cl.error}>{error?.message || loading ? 'Сохранение...' : errorInStore || error?.message}</p>
      <div className={cl.editLogin}>
        <Input
          type='text'
          placeholder='Введите логин...'
          value={login}
          onChange={(e) => isSetLogin(e.target.value)}
          required
        />
        {refreshData.login !== login ? (
          <ButtonUI
            onClick={async () => {
              await updateUser({ variables: { login, avatar: '' } })
            }}
          >
            Сохранить
          </ButtonUI>
        ) : (
          <></>
        )}
      </div>
    </>
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
  const [refreshData, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
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
    <div className={cl.container}>
      <h2>Изменить фотографию профиля</h2>
      {/* Зона загрузки */}
      {!image && (
        <Dropzone onDrop={handleDrop} accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }}>
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
        <div className={`${cl.actions}`}>
          <ButtonUI onClick={() => setImage('')} disabled={!image}>
            Удалить
          </ButtonUI>
          <ButtonUI onClick={saveAvatar} disabled={!image}>
            Сохранить
          </ButtonUI>
        </div>
      )}
    </div>
  )
}
