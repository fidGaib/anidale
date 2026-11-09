import { graphql } from '../gql/gql'

export const GET_PHOTOS = graphql(`
  query GET_PHOTOS($id: Int!, $limit: Int, $offset: Int) {
    getPhotos(id: $id, limit: $limit, offset: $offset) {
      id
      source
      postId
      ownerId
      high
      medium
      small
      vertical
      type
      date
      saved
      savedAt
    }
  }
`)

export const GET_SAVED_PHOTOS = graphql(`
  query GET_SAVED_PHOTOS($limit: Int, $offset: Int) {
    getSavedPhotos(limit: $limit, offset: $offset) {
      id
      source
      postId
      ownerId
      high
      medium
      small
      vertical
      type
      date
      saved
      savedAt
    }
  }
`)

export const SAVE_PHOTO = graphql(`
  mutation SAVE_PHOTO($source: String!, $id: Int!, $saved: Boolean!) {
    savePhoto(source: $source, id: $id, saved: $saved)
  }
`)

export const CREATE_PHOTO = graphql(`
  mutation CREATE_PHOTO($image: File!) {
    createPhoto(image: $image) {
      id
      source
      postId
      ownerId
      high
      medium
      small
      vertical
      type
      date
      saved
    }
  }
`)

export const REMOVE_PHOTO = graphql(`
  mutation REMOVE_PHOTO($id: Int!) {
    removePhoto(id: $id)
  }
`)
