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
  const [feedPosts, profilePosts, fetchPostsFeed, fetchPostsProfile, clearPosts] = usePostStore((state) => [
    state.feedPosts,
    state.profilePosts,
    state.fetchPostsFeed,
    state.fetchPostsProfile,
    state.clearPosts,
  ])
  useEffect(() => {
    if (id) fetchPostsProfile(id)
    else fetchPostsFeed()
    return () => clearPosts()
  }, [])
  return <>{id ? <ProfilePosts profilePosts={profilePosts} id={id} /> : <FeedPosts feedPosts={feedPosts} />}</>
}
const ProfilePosts = ({ profilePosts, id }: any) => {
  const [lastPostRef, loading] = useRefetchPosts(id)
  return (
    <>
      {profilePosts.length !== 0 &&
        profilePosts?.map((post: Post, index: number) => (
          <div
            key={post.id}
            className={`playground ${cl.wrapper}`}
            ref={index === profilePosts.length - 1 ? lastPostRef : null}
          >
            <div className={cl.owner}>
              <PostOwner post={post} />
              <PostDropdownMenu postId={post.id} userId={post.user.id} />
            </div>
            <PostImages images={post.images} />
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        ))}
      {loading && <Loading />}
    </>
  )
}
const FeedPosts = ({ feedPosts }: any) => {
  const [lastPostRef, loading] = useRefetchPosts()
  return (
    <>
      {feedPosts.length !== 0 &&
        feedPosts?.map((post: Post, index: number) => (
          <div
            key={post.id}
            className={`playground ${cl.wrapper}`}
            ref={index === feedPosts.length - 1 ? lastPostRef : null}
          >
            <div className={cl.owner}>
              <PostOwner post={post} />
              <PostDropdownMenu postId={post.id} userId={post.user.id} />
            </div>
            <PostImages images={post.images} />
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        ))}
      {loading && <Loading />}
    </>
  )
}

const useRefetchPosts = (id?: number) => {
  const { ref, inView } = useInView({ threshold: 0.1 })
  const [fetchPostsFeed, fetchPostsProfile, refetch] = usePostStore(
    ({ fetchPostsFeed, fetchPostsProfile, refetch }) => [fetchPostsFeed, fetchPostsProfile, refetch],
  )
  useEffect(() => {
    if (inView) {
      if (id) fetchPostsProfile(id)
      else fetchPostsFeed()
    }
  }, [inView])
  return [ref, refetch, inView] as const
}

const Loading = () => {
  return (
    <div className='refetch' style={{ textAlign: 'center', padding: 10 }}>
      Загрузка...
    </div>
  )
}
