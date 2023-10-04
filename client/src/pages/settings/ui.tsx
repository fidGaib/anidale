import { useViewer } from '@/entities/viewer'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'
import Icon from '@/shared/icons'
import Input from '@/shared/ui/input'
import SettingsMenu from '@/features/settings'

export const EditLoginAvatar = () => {
  const user = useViewer()
  return (
      <div className={cl.wrapper}>
          <h2>Профиль</h2>
          <label htmlFor='upl' className={cl.upload}>
            <Icon className={cl.changeAvatar} iconId='changeAvatar' />
          </label>
          <ImageLoading className={cl.avatar} src={user?.avatar}/>
          <input
            id={'upl'}
            type='file'
            hidden
            accept='image/*'
          />
          <h2>Информация</h2>
            <Input type='text' placeholder='Никнейм...' defaultValue={user?.login} required/>
            <h2 className={cl.save}>
              <button>Сохранить</button>
            </h2>
        </div>
    )
}
export const EditPassEmail = () => {
  const user = useViewer()
  return (
    <div className={cl.wrapper}>
    <h2>Email</h2>
    <Input type='email' placeholder='E-mail...' defaultValue={user?.email}/>
    <h2 className={cl.save}>
      <button className={cl.BtnSecure}>Получить подтверждение на почту</button>
    </h2>
    <h2>Пароль</h2>
    <Input type='password' placeholder='Старый пароль...' value={''}/>
    <Input type='password' placeholder='Новый пароль...' value={''}/>
    <Input type='password' placeholder='Подтвердите пароль...' value={''}/>
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
export const Settings = () => {
  document.title = `AniDale - Настройки`
  return (
    <Content id={cl.content}>
      <SettingsMenu/>
      <EditLoginAvatar/>
      {/* <EditPassEmail/>
      <CustomizeSettings/>
      <OtherSettings/> */}
    </Content>
  )
}
