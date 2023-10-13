import { ViewerVar, useViewer } from "@/entities/viewer"
import cl from './ui.module.less'
import Icon from "@/shared/icons"
import ImageLoading from "@/shared/hooks/onLoadImage/onLoadImage"
import Input from "@/shared/ui/input"
import { useState } from "react"
import { useMutation } from "@apollo/client"
import { UPDATE_USER } from "@/shared/graphql/schema"
import { useSettingsStore } from "@/features/settings/module"

export const EditLoginAvatar = () => {
    const user = useViewer()
    const newLogin = useSettingsStore((state) => state.login)
    const setLogin = useSettingsStore((state) => state.setLogin)
    const sendLogin = useSettingsStore((state) => state.sendLogin)
    const [NEWLOGIN, { data, error, loading }] = useMutation(UPDATE_USER)

    const setFiles = (fileList: FileList) => {
      const file = Array.from(fileList)
      const re = /(\.jpg|\.jpeg|\.gif|\.png)$/i
      const size = file[0].size / 1024 / 1024
      const maxSize = 5
      if (!re.exec(file[0].name)) return 'Загружать можно только арты.'
      else if (size > maxSize) return `Размер изображения не должен привышать ${maxSize}мб`
      else return true
    }
    return (
        <div className={cl.wrapper}>
            <h2>Профиль</h2>
            <label htmlFor='upl' className={cl.upload}>
              <Icon className={cl.changeAvatar} iconId='changeAvatar' />
            </label>
            <ImageLoading className={cl.avatar} src={user?.avatar}/>
            <Input
              id={'upl'}
              type='file'
              accept='image/*'
              onChange={(e) => setFiles(e.target.files!)}
              hidden
              required
            />
            <h2>Информация</h2>
              <p className={cl.error}>{error?.message || loading? 'Сохранение...': ''}</p>
              <Input type='text' placeholder='Никнейм...' defaultValue={user?.login} onChange={(e) => setLogin(e.target.value)} required/>
              <h2 className={cl.save}>
                <button onClick={() => {
                    ViewerVar(data?.update)
                    sendLogin(NEWLOGIN, user)
                }}>Сохранить</button>
              </h2>
          </div>
      )
  }
export const EditPassEmail = () => {
  const user = useViewer()
  const [newEmail, setNewEmail] = useState(user?.email ? user.email : '')
  const [NEWEMAIL, { data, error, loading }] = useMutation(UPDATE_USER)
  const sendNewEmail = async() => {
    if(user?.email === newEmail) return
    console.log(user?.email)
    if(user?.id && user.email){
      await NEWEMAIL({variables: {id: user?.id, email: newEmail}, fetchPolicy: 'network-only'})
      ViewerVar(data?.update)
    }
  }
    return (
        <div className={cl.wrapper}>
        <h2>Email</h2>
        <p className={cl.error}>{error?.message || loading? 'Сохранение...': ''}</p>
        <Input type='email' placeholder='E-mail...' value={newEmail} onChange={(e) => setNewEmail(e.target.value)}/>
        <h2 className={cl.save}>
        <button onClick={sendNewEmail} className={cl.BtnSecure}>Получить подтверждение на почту</button>
        </h2>
        <h2>Пароль</h2>
        <Input type='password' placeholder='Старый пароль...' value={''}/>
        <Input type='password' placeholder='Новый пароль...' value={''}/>
        <Input type='password' placeholder='Подтвердите пароль...' value={''}/>
        <h2 className={cl.save}>
        <button  className={cl.BtnSecure}>Сохранить</button>
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