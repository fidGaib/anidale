import { useSettingsStore } from './module'
import cl from './ui.module.css'

export const SettingsMenu = () => {
  const setLayout = useSettingsStore((state) => state.setLayout)
  return (
    <ul className={cl.listSettings}>
      <li onClick={() => setLayout(1)}>Профиль</li>
    </ul>
  )
}
