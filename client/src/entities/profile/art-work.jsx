import React, { useContext, useEffect, useState } from 'react'

import { Context } from '../..'
import { profileController } from '../../pages/profile/model'
import UserService from '../../services/user-service'
import Image from '../../shared/hooks/onLoadImage/onLoadImage'
import useTitlePage from '../../shared/hooks/useTitlePage'
import cl from './styles/art-work.module.css'

const ArtWork = () => {
  const { loginStore } = useContext(Context)
  let userGet = false
  if (profileController.pageID === loginStore.user.id) userGet = true
  const [userProfile, setUserProfile] = useState()
  useEffect(() => {
    if (!userGet) {
      UserService.fetchOneUser(profileController.pageID).then((user) => {
        setUserProfile(user.data)
      })
    }
  }, [])
  useTitlePage(`AniDale - ${userGet ? loginStore.user.login : userProfile?.login || 'not found :('}`)
  return (
    <div className={cl.artwork}>
      <Image
        className={cl.avatar}
        src={
          userGet
            ? loginStore.user.avatar
            : userProfile?.avatar ||
              'http://anime.com.ru/modules/coppermine/albums_for_animecomru/Anime_CG/Anime_Pictures_2013/ES_08/20/601767.jpg'
        }
        alt='anidale'
        title='anidale'
      />
      <div className={cl.nickname}>{userGet ? loginStore.user.login : userProfile?.login || 'not found :('}</div>
    </div>
  )
}

export default ArtWork
