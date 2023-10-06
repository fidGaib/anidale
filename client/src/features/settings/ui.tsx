
import { useSettingsStore } from './module'
import cl from './ui.module.less'
export const SettingsMenu = () => {
  const setLayout = useSettingsStore((state) => state.setLayout)
    return (
      <ul className={cl.listSettings}>
        <li onClick={() => setLayout(1)}>Профиль</li>
        <li onClick={() => setLayout(2)}>Безопастность</li>
        <li onClick={() => setLayout(3)}>Оформление</li>
        <li onClick={() => setLayout(4)}>Прочее</li>
      </ul>
      )
  }