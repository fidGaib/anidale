import { graphql } from './gql/gql'

export const GET_USERS = graphql(`
  query GET_USERS($limit: Int, $offset: Int, $search: String) {
    getUsers(limit: $limit, offset: $offset, search: $search) {
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
      status
      city
      birthDate
      backgroundImage
    }
    getFriendState(id: $id) {
      status
      friendsCount
      subscribersCount
    }
    photosCount(id: $id)
    videosCount(id: $id)
  }
`)

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

export const GET_FRIENDS = graphql(`
  query GET_FRIENDS($id: Int!, $limit: Int, $offset: Int) {
    getFriends(id: $id, limit: $limit, offset: $offset) {
      id
      login
      avatar
    }
  }
`)

export const GET_SUBSCRIBERS = graphql(`
  query GET_SUBSCRIBERS($id: Int!, $limit: Int, $offset: Int) {
    getSubscribers(id: $id, limit: $limit, offset: $offset) {
      id
      login
      avatar
    }
  }
`)

export const SUBSCRIBE = graphql(`
  mutation SUBSCRIBE($userId: Int!) {
    subscribe(userId: $userId) {
      status
      friendsCount
      subscribersCount
    }
  }
`)

export const UNSUBSCRIBE = graphql(`
  mutation UNSUBSCRIBE($userId: Int!) {
    unsubscribe(userId: $userId) {
      status
      friendsCount
      subscribersCount
    }
  }
`)

export const UPDATE_PROFILE = graphql(`
  mutation UPDATE_PROFILE($login: String, $status: String, $city: String, $birthDate: Date) {
    updateUser(user: { login: $login, status: $status, city: $city, birthDate: $birthDate }) {
      login
      status
      city
      birthDate
    }
  }
`)

export const UPDATE_COVER = graphql(`
  mutation UPDATE_COVER($backgroundImage: File!) {
    updateUser(user: { backgroundImage: $backgroundImage }) {
      backgroundImage
    }
  }
`)

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
      muted
      archived
      pinned
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
        reactions {
          userId
          emoji
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
      reactions {
        userId
        emoji
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
      reactions {
        userId
        emoji
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
export const PEER_READ = graphql(`
  query PEER_READ($userId: Int!) {
    getPeerRead(userId: $userId)
  }
`)
export const PINNED_MESSAGES = graphql(`
  query PINNED_MESSAGES($userId: Int!) {
    getPinnedMessages(userId: $userId) {
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
      reactions {
        userId
        emoji
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
      reactions {
        userId
        emoji
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
export const DELETE_MESSAGES = graphql(`
  mutation DELETE_MESSAGES($ids: [Int!]!, $forEveryone: Boolean) {
    deleteMessages(ids: $ids, forEveryone: $forEveryone)
  }
`)
export const FORWARD_MESSAGES = graphql(`
  mutation FORWARD_MESSAGES($ids: [Int!]!, $to: [Int!]!) {
    forwardMessages(ids: $ids, to: $to) {
      id
    }
  }
`)
export const PIN_MESSAGE = graphql(`
  mutation PIN_MESSAGE($id: Int!, $pinned: Boolean!) {
    pinMessage(id: $id, pinned: $pinned)
  }
`)
export const SEARCH_MESSAGES = graphql(`
  query SEARCH_MESSAGES($userId: Int!, $query: String!, $beforeId: Int, $limit: Int!) {
    searchMessages(userId: $userId, query: $query, beforeId: $beforeId, limit: $limit) {
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
      reactions {
        userId
        emoji
      }
    }
  }
`)
export const PRESENCE = graphql(`
  query PRESENCE($userId: Int!) {
    getPresence(userId: $userId) {
      online
      lastSeenAt
    }
  }
`)
export const REACT_MESSAGE = graphql(`
  mutation REACT_MESSAGE($id: Int!, $emoji: String) {
    reactMessage(id: $id, emoji: $emoji) {
      id
      reactions {
        userId
        emoji
      }
    }
  }
`)
export const CONVERSATION_SETTINGS = graphql(`
  mutation CONVERSATION_SETTINGS($userId: Int!, $muted: Boolean, $archived: Boolean, $pinned: Boolean) {
    setConversationSettings(userId: $userId, muted: $muted, archived: $archived, pinned: $pinned)
  }
`)
export const NOTIFICATIONS = graphql(`
  query NOTIFICATIONS($limit: Int!, $beforeId: Int) {
    getNotifications(limit: $limit, beforeId: $beforeId) {
      id
      type
      text
      date
      read
      postId
      actor {
        id
        login
        avatar
      }
    }
  }
`)
export const UNREAD_NOTIFICATIONS = graphql(`
  query UNREAD_NOTIFICATIONS {
    unreadNotificationsCount
  }
`)
export const MARK_NOTIFICATIONS_READ = graphql(`
  mutation MARK_NOTIFICATIONS_READ {
    markNotificationsRead
  }
`)
export const SEARCH = graphql(`
  query SEARCH($query: String!, $type: String, $limit: Int!, $page: Int!) {
    search(query: $query, type: $type, limit: $limit, page: $page) {
      usersTotal
      postsTotal
      musicTotal
      users {
        id
        login
        avatar
      }
      posts {
        id
        description
        date
        likesCount
        commentsCount
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
      music {
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
export const STORIES = graphql(`
  query STORIES {
    getStories {
      allSeen
      user {
        id
        login
        avatar
      }
      stories {
        id
        high
        medium
        small
        text
        date
        expiresAt
        seen
        viewsCount
      }
    }
  }
`)
export const CREATE_STORY = graphql(`
  mutation CREATE_STORY($image: File!, $text: String) {
    createStory(image: $image, text: $text) {
      id
    }
  }
`)
export const VIEW_STORY = graphql(`
  mutation VIEW_STORY($id: Int!) {
    viewStory(id: $id)
  }
`)
export const DELETE_STORY = graphql(`
  mutation DELETE_STORY($id: Int!) {
    deleteStory(id: $id)
  }
`)
export const STORY_VIEWERS = graphql(`
  query STORY_VIEWERS($id: Int!) {
    storyViewers(id: $id) {
      date
      user {
        id
        login
        avatar
      }
    }
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
