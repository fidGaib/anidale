import { useMutation } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { MakePostImages } from '@/entities/profile/ui'
import { assetUrl } from '@/shared/config'
import { CREATE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { usePostStore } from '@/shared/store'
import { UploadProgress } from '@/shared/ui/progress'

import cl from './ui.module.css'

// Create post
export const MakePost = () => {
  const id = parseInt(useParams().id || '')
  const uploadProgress = usePostStore((state) => state.uploadProgress)
  const [
    error_create,
    description,
    images,
    videos,
    removeImage,
    removeVideo,
    handleHeight,
    handleKeydown,
    setFiles,
    setVideoFiles,
    send,
  ] = usePostStore((state) => [
    state.error_create,
    state.description,
    state.images,
    state.videos,
    state.removeImage,
    state.removeVideo,
    state.handleHeight,
    state.handleKeydown,
    state.setFiles,
    state.setVideoFiles,
    state.send,
  ])
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const [createPost, { error, loading }] = useMutation(CREATE_POST)
  if (id !== refreshData.id) return <></>
  return (
    <>
      {error_create || error?.message ? <p className={cl.error}>{error_create || error?.message}</p> : <></>}
      <div
        className={`playground ${cl.wrapperForm}`}
        style={{ borderRadius: images?.length || videos?.length ? ' 10px 10px 0 0' : '', padding: '10px' }}
      >
        <ImageLoading src={useSrcAvatar(refreshData.avatar || '')} className={cl.avatar} />
        <textarea
          className={cl.textarea}
          placeholder='Что у вас нового?'
          value={description}
          onKeyDown={(e) => handleKeydown(e, createPost, refreshData.id!)}
          onChange={(e) => handleHeight(e)}
        />
        <label className={cl.label}>
          <ImageLoading className={cl.svg} src={assetUrl('icons/add_photo.svg')} />
          <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
        </label>
        <label className={cl.label}>
          <ImageLoading className={cl.svg} src={assetUrl('icons/video.svg')} />
          <input multiple type='file' hidden accept='video/*' onChange={(e) => setVideoFiles(e.target.files!)} />
        </label>
        <ImageLoading
          className={cl.svg}
          src={assetUrl('icons/send.svg')}
          onClick={() => send(createPost, refreshData.id!)}
        />
      </div>
      {images?.length ? <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} /> : <></>}
      {videos?.length ? (
        <div className={`playground ${cl.videoList}`}>
          {videos.map((video, index) => (
            <div key={`${video.name}-${index}`} className={cl.videoItem}>
              <ImageLoading className={cl.videoIcon} src={assetUrl('icons/video.svg')} />
              <span className={cl.videoName}>{video.name}</span>
              <button type='button' className={cl.videoRemove} title='Убрать видео' onClick={() => removeVideo(video)}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <></>
      )}
      {uploadProgress !== null && (
        <div className='playground' style={{ borderRadius: 10, marginTop: 5 }}>
          <UploadProgress percent={uploadProgress} label='Публикация поста' />
        </div>
      )}
    </>
  )
}
