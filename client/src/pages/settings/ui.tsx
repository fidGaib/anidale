import SettingsMenu from '@/features/settings'
import { useSettingsStore } from '@/features/settings/module'
import Content from '@/shared/content'
import { CustomizeSettings, EditLoginAvatar, EditPassEmail, OtherSettings } from '@/widgets/settings'

import cl from './ui.module.less'

export const Settings = () => {
  document.title = `AniDale - Настройки`
  const layout = useSettingsStore((state) => state.layout)
  return (
    <Content>
      <div className='playground' id={cl.content}>
        <SettingsMenu />
        {layout === 1 && <EditLoginAvatar />}
        {layout === 2 && <EditPassEmail />}
        {layout === 3 && <CustomizeSettings />}
        {layout === 4 && <OtherSettings />}
      </div>
    </Content>
  )
}
