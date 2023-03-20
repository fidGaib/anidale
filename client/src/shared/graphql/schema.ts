import { gql } from '@apollo/client'

export const GET_USERS = gql`
  query {
    getUsers {
      id
      login
      avatar
    }
  }
`
export const REFRESH = gql`
  query {
    refresh {
      accessToken
      user {
        id
        login
        avatar
      }
    }
  }
`
export const LOGOUT = gql`
  query {
    logout
  }
`
export const REGISTRATION = gql`
  mutation REG($email: String!, $pass: String!, $pass2: String!) {
    registration(user: { email: $email, pass: $pass, pass2: $pass2 }) {
      id
      login
      avatar
    }
  }
`
export const SIGNIN = gql`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      id
      login
      avatar
    }
  }
`
export const PROFILE = (id?: number) => gql`
  query {
    getUser(id: ${id}) {
      login
      avatar
    }
  }
`
export const POST_BY_USER = ($id: number, $limit: number, $page: number) => gql`
  query {
    getPostsByUser(id: ${$id}, limit: ${$limit}, page: ${$page}) {
      id
      description
      user {
        id
        login
        avatar
      }
    }
  }
`
export const POSTS = ($limit: number, $page: number) => gql`
  query {
    getPosts(limit: ${$limit}, page: ${$page}) {
      id
      description
      user{
        id 
        avatar
        login
      }
    }
  }
`
export const CREATE_POST = gql`
  mutation ($owner: Int!, $description: String, $images: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images }) {
      id
      description
      user {
        id
        avatar
        login
      }
    }
  }
`
export const REMOVE_POST = gql`
  mutation remove($id: Int!) {
    removePost(id: $id)
  }
`
