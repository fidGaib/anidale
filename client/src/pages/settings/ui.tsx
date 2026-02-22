import SettingsMenu from '@/features/settings'
import { useSettingsStore } from '@/features/settings/module'
import Content from '@/shared/content'
import { LayoutLoginAvatar } from '@/widgets/settings'

import cl from './ui.module.less'

export const Settings = () => {
  document.title = `AniDale - Настройки`
  const layout = useSettingsStore((state) => state.layout)
  return (
    <Content>
      <div className='playground' id={cl.content}>
        {layout === 1 && <LayoutLoginAvatar />}
      </div>
    </Content>
  )
}
