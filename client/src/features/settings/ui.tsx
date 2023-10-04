import { useState } from 'react'
import cl from './ui.module.less'
export const SettingsMenu = () => {
    const [layout, setLayout] = useState(1)
    return (
      <ul className={cl.listSettings}>
        <li onClick={() => setLayout(1)}>Профиль</li>
        <li onClick={() => setLayout(2)}>Безопастность</li>
        <li onClick={() => setLayout(3)}>Оформление</li>
        <li onClick={() => setLayout(4)}>Прочее</li>
      </ul>
      )
  }