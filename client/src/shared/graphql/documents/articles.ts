import { graphql } from '../gql/gql'

export const CREATE_ARTICLE = graphql(`
  mutation CREATE_ARTICLE($article: CreateArticle!) {
    createArticle(article: $article) {
      id
      description
      date
      images {
        id
        high
        small
        medium
        saved
        type
      }
      videos {
        id
        title
        file
        size
        type
        date
        postId
        saved
      }
      user {
        id
        login
        avatar
      }
      likesCount
      liked
      commentsCount
      editedAt
      pinned
      archived
      views
      repostsCount
      bookmarked
      repostDeleted
      article {
        id
        title
        cover
        excerpt
      }
      community {
        id
        name
        avatar
      }
      repostOf {
        id
        description
        date
        user {
          id
          login
          avatar
        }
        images {
          id
          high
          small
          medium
          saved
        }
        videos {
          id
          title
          file
          size
          type
          postId
          saved
        }
      }
    }
  }
`)

export const EDIT_ARTICLE = graphql(`
  mutation EDIT_ARTICLE($article: EditArticle!) {
    editArticle(article: $article) {
      id
      description
      date
      images {
        id
        high
        small
        medium
        saved
        type
      }
      videos {
        id
        title
        file
        size
        type
        date
        postId
        saved
      }
      user {
        id
        login
        avatar
      }
      likesCount
      liked
      commentsCount
      editedAt
      pinned
      archived
      views
      repostsCount
      bookmarked
      repostDeleted
      article {
        id
        title
        cover
        excerpt
      }
      community {
        id
        name
        avatar
      }
      repostOf {
        id
        description
        date
        user {
          id
          login
          avatar
        }
        images {
          id
          high
          small
          medium
          saved
        }
        videos {
          id
          title
          file
          size
          type
          postId
          saved
        }
      }
    }
  }
`)

export const GET_ARTICLE = graphql(`
  query GET_ARTICLE($id: Int!) {
    getArticle(id: $id) {
      id
      title
      cover
      content
      date
      editedAt
      postId
      user {
        id
        login
        avatar
      }
    }
  }
`)
