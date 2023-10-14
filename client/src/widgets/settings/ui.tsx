import { useMutation } from '@apollo/client'
import { useState } from 'react'

import { useViewer } from '@/entities/viewer'
import { useSettingsStore } from '@/features/settings/module'
import { ViewerVar } from '@/processes/auth'
import { UPDATE_USER } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Icon from '@/shared/icons'
import Input from '@/shared/ui/input'

import cl from './ui.module.less'

// LOGIN && AVATAR
export const EditLoginAvatar = () => {
  const user = useViewer()
  const setLogin = useSettingsStore((state) => state.setLogin)
  const sendLogin = useSettingsStore((state) => state.sendLogin)
  const setFiles = useSettingsStore((state) => state.setFiles)
  const image = useSettingsStore((state) => state.image)
  const send = useSettingsStore((state) => state.send)
  const [UPDATE, { data, error, loading }] = useMutation(UPDATE_USER)
  return (
    <div className={cl.wrapper}>
      {/* AVATAR  */}
      <h2>Профиль</h2>
      <label htmlFor='upl' className={cl.upload}>
        <Icon className={cl.changeAvatar} iconId='changeAvatar' />
      </label>
      <ImageLoading
        className={cl.avatar}
        src={
          image.length
            ? URL.createObjectURL(image[0])
            : user.avatar.split('/').length === 2
            ? `http://localhost:5000/storage/${user.avatar}.webp`
            : user.avatar
        }
      />
      <Input id={'upl'} type='file' accept='image/*' onChange={(e) => setFiles(e.target.files!)} hidden required />
      <h2 className={cl.save}>
        <p className={cl.error}>{error?.message || loading ? 'Сохранение...' : ''}</p>
        <button
          onClick={() => {
            send(UPDATE, user.id)
          }}
        >
          Сохранить
        </button>
      </h2>
      {/* // LOGIN */}
      <h2>Информация</h2>
      <p className={cl.error}>{error?.message || loading ? 'Сохранение...' : ''}</p>
      <Input
        type='text'
        placeholder='Никнейм...'
        defaultValue={user.login}
        onChange={(e) => setLogin(e.target.value)}
        required
      />
      <h2 className={cl.save}>
        <button
          onClick={() => {
            sendLogin(UPDATE, user).finally(() => {
              if (data?.update) ViewerVar(data.update)
            })
          }}
        >
          Сохранить
        </button>
      </h2>
    </div>
  )
}
// EMAIL && PASSWORD
export const EditPassEmail = () => {
  const user = useViewer()
  const [newEmail, setNewEmail] = useState(user?.email ? user.email : '')
  const [NEWEMAIL, { data, error, loading }] = useMutation(UPDATE_USER)
  const sendNewEmail = async () => {
    if (user?.email === newEmail) return
    console.log(user?.email)
    if (user?.id && user.email) {
      await NEWEMAIL({ variables: { id: user?.id, email: newEmail }, fetchPolicy: 'network-only' })
      if (data?.update) ViewerVar(data.update)
    }
  }
  return (
    <div className={cl.wrapper}>
      <h2>Email</h2>
      <p className={cl.error}>{error?.message || loading ? 'Сохранение...' : ''}</p>
      <Input type='email' placeholder='E-mail...' value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
      <h2 className={cl.save}>
        <button onClick={sendNewEmail} className={cl.BtnSecure}>
          Получить подтверждение на почту
        </button>
      </h2>
      <h2>Пароль</h2>
      <Input type='password' placeholder='Старый пароль...' value={''} />
      <Input type='password' placeholder='Новый пароль...' value={''} />
      <Input type='password' placeholder='Подтвердите пароль...' value={''} />
      <h2 className={cl.save}>
        <button className={cl.BtnSecure}>Сохранить</button>
      </h2>
    </div>
  )
}
export const CustomizeSettings = () => {
  const user = useViewer()
  return (
    <div className={cl.wrapper}>
      <h2>Задний фон</h2>
      <ImageLoading className={cl.backround} src={user?.avatar} />
      <h2>Цвет виджетов</h2>
      <input type='color' />
      <h2>Закругление виджетов</h2>
      <input type='number' value={10} />
      <h2>Цвет основного текста</h2>
      <input type='color' />
      <h2>Акцент</h2>
      <input type='color' />
      <h2 className={cl.save}>
        <button className={cl.BtnSecure}>Сохранить</button>
      </h2>
    </div>
  )
}
export const OtherSettings = () => {
  return (
    <div className={cl.wrapper}>
      <h2>Прочее</h2>
    </div>
  )
}