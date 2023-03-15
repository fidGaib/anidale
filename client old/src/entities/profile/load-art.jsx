import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { noticeService } from '../../services/notice-service'
import Image from '../../shared/hooks/onLoadImage/onLoadImage'
import { useFetching } from '../../shared/hooks/useFetching'
import cl from './styles/load-art.module.css'

const LoadArt = () => {
  const url = 'http://localhost:5000/api/uploads/'
  const params = useParams()
  const [arts, setArts] = useState([])
  const [artsRevers, setArtsRevers] = useState([])

  const [fetching, isLoading, error] = useFetching(async () => {
    const { notices, users, count } = await noticeService.fetchByUser(parseInt(params.id), 10, 0)
    notices.forEach((notice) => {
      setArts((prev) => [...notice.images, ...prev])
    })
  })
  useEffect(() => {
    fetching()
    return () => {
      setArts([])
    }
  }, [])
  useEffect(() => {
    setArtsRevers([...arts.reverse()])
  }, [arts])
  return arts.length ? (
    <div className={cl.wrapPreview}>
      {artsRevers.map((image, i) => {
        return <Image key={`${image.id}${i}`} src={url + image.minimize} />
      })}
    </div>
  ) : (
    ''
  )
}

export default LoadArt
