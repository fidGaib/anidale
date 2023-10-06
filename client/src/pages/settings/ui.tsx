import Content from '@/shared/content'
import cl from './ui.module.less'
import SettingsMenu from '@/features/settings'
import { CustomizeSettings, EditLoginAvatar, EditPassEmail, OtherSettings } from '@/widgets/settings'
import { useSettingsStore } from '@/features/settings/module'
 
export const Settings = () => {
  document.title = `AniDale - Настройки`
  const layout = useSettingsStore((state) => state.layout)
  return (
    <Content id={cl.content}>
      <SettingsMenu/>
      {layout === 1 && <EditLoginAvatar/>} 
      {layout === 2 && <EditPassEmail/>}
      {layout === 3 && <CustomizeSettings/>}
      {layout === 4 && <OtherSettings/>}
    </Content>
  )
}
