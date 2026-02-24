// import { HistoryProfile } from '@/entities/history'
import Content from '@/shared/content'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  return (
    <>
      {/* <HistoryProfile /> */}
      <Content className={cl.content}>
        <ArtWork />
      </Content>
    </>
  )
}
