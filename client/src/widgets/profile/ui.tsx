import { useQuery, useReactiveVar } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { MeshBlockProfile } from '@/features/profile'
import { PROFILE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import ButtonUI from '@/shared/ui/button'

// import { ModalWindow } from '../modal_window'
import cl from './ui.module.less'

export const ArtWork = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'cache-first' })
  const user = {
    login: data?.getUser?.login,
    avatar: data?.getUser?.avatar,
  }
  document.title = `${user.login} - Профиль`

  const [refreshData] = useRefreshStore((state) => [state.refreshData])

  const avatar = useSrcAvatar(user.avatar || '')
  return (
    <>
      <div className={`playground ${cl.wrapper}`} style={{ padding: 0 }}>
        {/* <ModalWindow avatar={avatar} /> */}
        <div className={cl.artwork}>
          <ImageLoading className={cl.avatar} src={avatar} />
          <ImageLoading id={cl.edit_profile_ico} src='/icons/edit.svg' className={cl.meshIcon} />
          <div id={cl.loginWrap}>
            <div className={`playground ${cl.nickname}`}>
              {user.login || 'not found :('}{' '}
              <ImageLoading id={cl.edit_login_ico} src='/icons/edit.svg' className={cl.meshIcon} />
            </div>
          </div>
        </div>
        {refreshData.id !== id ? (
          <div className={cl.wrappSubscribe}>
            <Link to={'/chat'}>
              <ButtonUI>Написать</ButtonUI>
            </Link>
            <ButtonUI>Подписаться</ButtonUI>
          </div>
        ) : (
          <></>
        )}
        <MeshBlockProfile />
      </div>
    </>
  )
}
