import { useState } from 'react'

import { useViewer } from '@/entities/viewer'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

export const Settings = () => {
  document.title = `AniDale - Настройки`
  const [layout, setLayout] = useState(1)
  const user = useViewer()
  return (
    <Content id={cl.content}>
      <ul className={cl.listSettings}>
        <li onClick={() => setLayout(1)}>Профиль</li>
        <li onClick={() => setLayout(2)}>Безопастность</li>
        <li onClick={() => setLayout(3)}>Оформление</li>
        <li onClick={() => setLayout(4)}>Прочее</li>
      </ul>
      {layout === 1 ? (
        <div className={cl.wrapper}>
          <h2>Профиль</h2>
          <ImageLoading className={cl.avatar} src={user?.avatar} />
          <h2>Информация</h2>
          <input type='text' placeholder='Никнейм...' defaultValue={user?.login} />
          <h2 className={cl.save}>
            <button>Сохранить</button>
          </h2>
        </div>
      ) : (
        ''
      )}
      {layout === 2 ? (
        <div className={cl.wrapper}>
          <h2>Email</h2>
          <input type='email' placeholder='E-mail...' defaultValue={user?.email} />
          <h2 className={cl.save}>
            <button className={cl.BtnSecure}>Получить подтверждение на почту</button>
          </h2>
          <h2>Пароль</h2>
          <input type='password' placeholder='Старый пароль...' value={''} />
          <input type='password' placeholder='Новый пароль...' value={''} />
          <input type='password' placeholder='Подтвердите пароль...' value={''} />
          <h2 className={cl.save}>
            <button className={cl.BtnSecure}>Сохранить</button>
          </h2>
        </div>
      ) : (
        ''
      )}
      {layout === 3 ? (
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
      ) : (
        ''
      )}
      {layout === 4 ? (
        <div className={cl.wrapper}>
          <h2>Прочее</h2>
        </div>
      ) : (
        ''
      )}
    </Content>
  )
}
