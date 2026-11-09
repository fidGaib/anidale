import { graphql } from '../gql/gql'

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
