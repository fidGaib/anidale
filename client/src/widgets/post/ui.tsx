import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { useParams } from 'react-router-dom'

import { PostActionWrapp, PostDescription, PostImages, PostOwner } from '@/entities/post'
import { PostDropdownMenu } from '@/features/post'
import { Post } from '@/features/profile/types'
import { usePostStore } from '@/shared/store'

import cl from './ui.module.less'

export const Posts = () => {
  const id = parseInt(useParams().id || '')
  const [feedPosts, profilePosts, addPost, removeId, clearPosts] = usePostStore((state) => [
    state.feedPosts,
    state.profilePosts,
    state.addPost,
    state.removeId,
    state.clearPosts,
  ])
  useEffect(() => {
    addPost(id)
    return () => clearPosts()
  }, [])
  return (
    <>
      {id ? <ProfilePosts profilePosts={profilePosts} /> : <FeedPosts feedPosts={feedPosts} />}
      <RefetchPosts />
    </>
  )
}
const ProfilePosts = ({ profilePosts }: any) => {
  return (
    <>
      {profilePosts.length !== 0 &&
        profilePosts?.map((post: Post) => (
          <div key={post.id} className={`playground ${cl.wrapper}`}>
            <div className={cl.owner}>
              <PostOwner post={post} />
              <PostDropdownMenu postId={post.id} userId={post.user.id} />
            </div>
            <PostImages images={post.images} />
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        ))}
    </>
  )
}
const FeedPosts = ({ feedPosts }: any) => {
  return (
    <>
      {feedPosts.length !== 0 &&
        feedPosts?.map((post: Post) => (
          <div key={post.id} className={`playground ${cl.wrapper}`}>
            <div className={cl.owner}>
              <PostOwner post={post} />
              <PostDropdownMenu postId={post.id} userId={post.user.id} />
            </div>
            <PostImages images={post.images} />
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        ))}
    </>
  )
}
const RefetchPosts = () => {
  const id = parseInt(useParams().id || '')
  const { ref, inView } = useInView({ threshold: 0.1 })
  const [addPost, clearPosts] = usePostStore((state) => [state.addPost, state.clearPosts])
  useEffect(() => {
    if (inView) addPost(id)
  }, [inView])
  return (
    <div ref={ref} className='refech' style={{ textAlign: 'center', padding: 10 }}>
      Загрузка...
    </div>
  )
}
