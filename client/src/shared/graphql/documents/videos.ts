import { graphql } from '../gql/gql'

export const GET_VIDEOS = graphql(`
  query GET_VIDEOS($id: Int!, $limit: Int, $offset: Int) {
    getVideos(id: $id, limit: $limit, offset: $offset) {
      id
      title
      file
      size
      type
      date
      postId
      saved
      savedAt
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const GET_SAVED_VIDEOS = graphql(`
  query GET_SAVED_VIDEOS($limit: Int, $offset: Int) {
    getSavedVideos(limit: $limit, offset: $offset) {
      id
      title
      file
      size
      type
      date
      postId
      saved
      savedAt
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const SAVE_VIDEO = graphql(`
  mutation SAVE_VIDEO($id: Int!, $saved: Boolean!) {
    saveVideo(id: $id, saved: $saved)
  }
`)

export const CREATE_VIDEO = graphql(`
  mutation CREATE_VIDEO($file: File!, $title: String) {
    createVideo(file: $file, title: $title) {
      id
      title
      file
      size
      type
      date
      postId
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const REMOVE_VIDEO = graphql(`
  mutation REMOVE_VIDEO($id: Int!) {
    removeVideo(id: $id)
  }
`)

export const ALL_VIDEOS = graphql(`
  query ALL_VIDEOS($limit: Int, $offset: Int) {
    getAllVideos(limit: $limit, offset: $offset) {
      id
      title
      file
      size
      type
      date
      postId
      saved
      user {
        id
        login
        avatar
      }
    }
  }
`)
