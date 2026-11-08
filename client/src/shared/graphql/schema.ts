import { graphql } from './gql/gql'

export const GET_USERS = graphql(`
  query GET_USERS {
    getUsers {
      id
      login
      avatar
    }
  }
`)
export const SIGNOUT = graphql(`
  query SIGNOUT {
    logout
  }
`)
export const REFRESH = graphql(`
  query REFRESH {
    refresh {
      id
      login
      avatar
    }
  }
`)
export const REGISTRATION = graphql(`
  mutation REG($email: String!, $pass: String!, $pass2: String!) {
    registration(user: { email: $email, pass: $pass, pass2: $pass2 }) {
      id
      login
      avatar
      email
    }
  }
`)
export const SIGNIN = graphql(`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      id
      login
      avatar
      email
    }
  }
`)
export const updateUserQuery = graphql(`
  mutation UPDATE_LOGIN($login: String, $avatar: File!) {
    updateUser(user: { login: $login, avatar: $avatar }) {
      login
      avatar
    }
  }
`)
export const PROFILE = graphql(`
  query PROFILE($id: Int!) {
    getUser(id: $id) {
      id
      login
      avatar
    }
  }
`)

export const POST_BY_USER = graphql(`
  query POST_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getPostsByUser(id: $id, limit: $limit, page: $page) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
      likesCount
      liked
      commentsCount
    }
  }
`)
export const POSTS = graphql(`
  query POSTS($limit: Int!, $page: Int!) {
    getPosts(limit: $limit, page: $page) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
      likesCount
      liked
      commentsCount
    }
  }
`)
export const CREATE_POST = graphql(`
  mutation CREATE_POST($owner: Int!, $description: String, $images: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images }) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
      likesCount
      liked
      commentsCount
    }
  }
`)
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
export const REMOVE_POST = graphql(`
  mutation REMOVE_POST($id: Int!) {
    removePost(id: $id)
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
export const CONVERSATIONS = graphql(`
  query CONVERSATIONS {
    getConversations {
      unread
      user {
        id
        login
        avatar
      }
      lastMessage {
        id
        text
        date
        senderId
        recipientId
        editedAt
        forwardedFrom
        forwardedFromId
        attachments {
          id
          kind
          name
          size
          file
          thumb
        }
      }
    }
  }
`)
export const MESSAGES = graphql(`
  query MESSAGES($userId: Int!, $beforeId: Int, $limit: Int!) {
    getMessages(userId: $userId, beforeId: $beforeId, limit: $limit) {
      id
      text
      date
      senderId
      recipientId
      editedAt
      forwardedFrom
      forwardedFromId
      replyToId
      replyTo {
        id
        senderId
        text
        attachmentKind
        attachmentName
      }
      attachments {
        id
        kind
        name
        size
        file
        thumb
      }
    }
  }
`)
export const SEND_MESSAGE = graphql(`
  mutation SEND_MESSAGE($to: Int!, $text: String, $files: [File!], $replyTo: Int) {
    sendMessage(to: $to, text: $text, files: $files, replyTo: $replyTo) {
      id
      text
      date
      senderId
      recipientId
      editedAt
      forwardedFrom
      forwardedFromId
      replyToId
      replyTo {
        id
        senderId
        text
        attachmentKind
        attachmentName
      }
      attachments {
        id
        kind
        name
        size
        file
        thumb
      }
    }
  }
`)
export const DELETE_CONVERSATION = graphql(`
  mutation DELETE_CONVERSATION($userId: Int!, $forEveryone: Boolean) {
    deleteConversation(userId: $userId, forEveryone: $forEveryone)
  }
`)
export const MARK_READ = graphql(`
  mutation MARK_READ($userId: Int!) {
    markRead(userId: $userId)
  }
`)
export const PINNED_MESSAGE = graphql(`
  query PINNED_MESSAGE($userId: Int!) {
    getPinnedMessage(userId: $userId) {
      id
      text
      date
      senderId
      recipientId
      editedAt
      forwardedFrom
      forwardedFromId
      replyToId
      replyTo {
        id
        senderId
        text
        attachmentKind
        attachmentName
      }
      attachments {
        id
        kind
        name
        size
        file
        thumb
      }
    }
  }
`)
export const EDIT_MESSAGE = graphql(`
  mutation EDIT_MESSAGE($id: Int!, $text: String!) {
    editMessage(id: $id, text: $text) {
      id
      text
      date
      senderId
      recipientId
      editedAt
      forwardedFrom
      forwardedFromId
      replyToId
      replyTo {
        id
        senderId
        text
        attachmentKind
        attachmentName
      }
      attachments {
        id
        kind
        name
        size
        file
        thumb
      }
    }
  }
`)
export const DELETE_MESSAGE = graphql(`
  mutation DELETE_MESSAGE($id: Int!, $forEveryone: Boolean) {
    deleteMessage(id: $id, forEveryone: $forEveryone)
  }
`)
export const FORWARD_MESSAGE = graphql(`
  mutation FORWARD_MESSAGE($id: Int!, $to: [Int!]!) {
    forwardMessage(id: $id, to: $to) {
      id
    }
  }
`)
export const PIN_MESSAGE = graphql(`
  mutation PIN_MESSAGE($id: Int!, $pinned: Boolean!) {
    pinMessage(id: $id, pinned: $pinned)
  }
`)
