import { graphql } from '../gql/gql'

export const CREATE_MUSIC = graphql(`
  mutation CREATE_MUSIC($title: String!, $artist: String, $file: File!) {
    createMusic(music: { title: $title, artist: $artist, file: $file }) {
      id
      title
      artist
      file
      size
      user {
        id
        login
      }
    }
  }
`)

export const MUSIC_BY_USER = graphql(`
  query MUSIC_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getMusic(id: $id, limit: $limit, page: $page) {
      id
      title
      artist
      file
      size
      user {
        id
        login
      }
    }
  }
`)

export const ALL_MUSIC = graphql(`
  query ALL_MUSIC($limit: Int!, $page: Int!) {
    getAllMusic(limit: $limit, page: $page) {
      id
      title
      artist
      file
      size
      user {
        id
        login
      }
    }
  }
`)

export const REMOVE_MY_MUSIC = graphql(`
  mutation REMOVE_MY_MUSIC($file: String!) {
    removeMyMusic(file: $file)
  }
`)

export const MY_MUSIC_FILES = graphql(`
  query MY_MUSIC_FILES {
    myMusicFiles
  }
`)

export const ADD_MUSIC = graphql(`
  mutation ADD_MUSIC($id: Int!) {
    addMusic(id: $id) {
      id
      title
      artist
      file
      size
      user {
        id
        login
      }
    }
  }
`)

export const REMOVE_MUSIC = graphql(`
  mutation REMOVE_MUSIC($id: Int!) {
    removeMusic(id: $id)
  }
`)
