// import { HistoryProfile } from '@/entities/history'
import { MakePost } from '@/features/profile'
import Content from '@/shared/content'
import Posts from '@/widgets/post'
import { ArtWork } from '@/widgets/profile'

import cl from './ui.module.less'

export const Profile = () => {
  return (
    <>
      {/* <HistoryProfile /> */}
      <Content className={cl.content}>
        <ArtWork />
        <MakePost />
        <Posts />
      </Content>
    </>
  )
}
