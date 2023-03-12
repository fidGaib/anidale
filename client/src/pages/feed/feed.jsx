import { observer } from 'mobx-react-lite'
import { Suspense } from 'react'

import Notices from '../../entities/notices/Notices'
import Content from '../../shared/content/ui'
import useTitlePage from '../../shared/hooks/useTitlePage'
import Plug from '../../shared/notice/plug'

const Feed = () => {
  useTitlePage('AniDale - Лента')
  return (
    <Content>
      <Suspense fallback={<Plug />}>
        <Notices id='feed' />
      </Suspense>
    </Content>
  )
}

export default observer(Feed)
