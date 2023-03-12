import { settingController } from '../../pages/settings/model'
import cl from './style.module.css'

const Menu = () => {
  return (
    <div className={cl.listSettings}>
      {settingController.listSett.map((list) => (
        <li
          key={list.id}
          onClick={() => {
            settingController.handleSett(list.id)
          }}
          className={list.active ? cl.active : ''}
        >
          {list.body}
        </li>
      ))}
    </div>
  )
}

export default Menu
