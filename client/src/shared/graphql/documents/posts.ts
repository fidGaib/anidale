import { graphql } from '../gql/gql'

export const POST_BY_USER = graphql(`
  query POST_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getPostsByUser(id: $id, limit: $limit, page: $page) {
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

export const POSTS = graphql(`
  query POSTS($limit: Int!, $page: Int!) {
    getPosts(limit: $limit, page: $page) {
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

export const GET_POST = graphql(`
  query GET_POST($id: Int!) {
    getPost(id: $id) {
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

export const CREATE_POST = graphql(`
  mutation CREATE_POST($owner: Int!, $description: String, $images: [File!], $videos: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images, videos: $videos }) {
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

export const REMOVE_POST = graphql(`
  mutation REMOVE_POST($id: Int!) {
    removePost(id: $id)
  }
`)

export const EDIT_POST = graphql(`
  mutation EDIT_POST($id: Int!, $description: String!) {
    editPost(id: $id, description: $description) {
      id
      description
      editedAt
    }
  }
`)

export const PIN_POST = graphql(`
  mutation PIN_POST($id: Int!, $pinned: Boolean!) {
    pinPost(id: $id, pinned: $pinned)
  }
`)

export const ARCHIVE_POST = graphql(`
  mutation ARCHIVE_POST($id: Int!, $archived: Boolean!) {
    archivePost(id: $id, archived: $archived)
  }
`)

export const BOOKMARK_POST = graphql(`
  mutation BOOKMARK_POST($id: Int!, $bookmarked: Boolean!) {
    bookmarkPost(id: $id, bookmarked: $bookmarked)
  }
`)

export const REPORT_POST = graphql(`
  mutation REPORT_POST($id: Int!, $reason: String!) {
    reportPost(id: $id, reason: $reason)
  }
`)

export const BOOKMARKS = graphql(`
  query BOOKMARKS($limit: Int!, $page: Int!) {
    getBookmarks(limit: $limit, page: $page) {
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

export const REPOST_POST = graphql(`
  mutation REPOST_POST($id: Int!, $comment: String) {
    repostPost(id: $id, comment: $comment) {
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

export const VIEW_POSTS = graphql(`
  mutation VIEW_POSTS($ids: [Int!]!) {
    viewPosts(ids: $ids)
  }
`)

export const SET_LIKE = graphql(`
  mutation SET_LIKE($id: Int!, $liked: Boolean!) {
    setLike(id: $id, liked: $liked) {
      liked
      likesCount
    }
  }
`)

export const COMMENTS = graphql(`
  query COMMENTS($postId: Int!, $limit: Int!, $page: Int!) {
    getComments(postId: $postId, limit: $limit, page: $page) {
      id
      text
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

export const ADD_COMMENT = graphql(`
  mutation ADD_COMMENT($postId: Int!, $text: String!) {
    addComment(postId: $postId, text: $text) {
      id
      text
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

export const REMOVE_COMMENT = graphql(`
  mutation REMOVE_COMMENT($id: Int!) {
    removeComment(id: $id)
  }
`)
