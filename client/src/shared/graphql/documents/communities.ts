import { graphql } from '../gql/gql'

export const COMMUNITIES = graphql(`
  query COMMUNITIES($search: String, $filter: String, $limit: Int!, $offset: Int!) {
    getCommunities(search: $search, filter: $filter, limit: $limit, offset: $offset) {
      id
      name
      description
      status
      avatar
      membersCount
      isClosed
      isMember
      isAdmin
      isOwner
    }
  }
`)

export const COMMUNITY = graphql(`
  query COMMUNITY($id: Int!) {
    getCommunity(id: $id) {
      id
      name
      description
      status
      website
      avatar
      cover
      createdAt
      ownerId
      membersCount
      isClosed
      canView
      hasRequested
      isBanned
      requestsCount
      suggestedCount
      links {
        id
        title
        url
      }
      contacts {
        position
        user {
          id
          login
          avatar
        }
      }
      role
      isMember
      isAdmin
      canPublish
      canModerate
      canManagePosts
      isOwner
    }
  }
`)

export const COMMUNITY_MEMBERS = graphql(`
  query COMMUNITY_MEMBERS($id: Int!, $limit: Int!, $offset: Int!) {
    getCommunityMembers(id: $id, limit: $limit, offset: $offset) {
      role
      isOwner
      date
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const CREATE_COMMUNITY = graphql(`
  mutation CREATE_COMMUNITY($name: String!, $description: String, $avatar: File, $isClosed: Boolean) {
    createCommunity(name: $name, description: $description, avatar: $avatar, isClosed: $isClosed) {
      id
      name
    }
  }
`)

export const UPDATE_COMMUNITY = graphql(`
  mutation UPDATE_COMMUNITY(
    $id: Int!
    $name: String
    $description: String
    $status: String
    $website: String
    $isClosed: Boolean
    $avatar: File
    $cover: File
    $removeCover: Boolean
  ) {
    updateCommunity(
      id: $id
      name: $name
      description: $description
      status: $status
      website: $website
      isClosed: $isClosed
      avatar: $avatar
      cover: $cover
      removeCover: $removeCover
    ) {
      id
      name
      description
      status
      website
      avatar
      cover
      membersCount
      isClosed
      isMember
      isAdmin
      isOwner
    }
  }
`)

export const JOIN_COMMUNITY = graphql(`
  mutation JOIN_COMMUNITY($id: Int!) {
    joinCommunity(id: $id) {
      id
      membersCount
      isMember
      isAdmin
      canView
      hasRequested
      isBanned
    }
  }
`)

export const LEAVE_COMMUNITY = graphql(`
  mutation LEAVE_COMMUNITY($id: Int!) {
    leaveCommunity(id: $id) {
      id
      membersCount
      isMember
      isAdmin
      canView
      hasRequested
      isBanned
    }
  }
`)

export const SET_COMMUNITY_ROLE = graphql(`
  mutation SET_COMMUNITY_ROLE($id: Int!, $userId: Int!, $role: String!) {
    setCommunityRole(id: $id, userId: $userId, role: $role)
  }
`)

export const REMOVE_COMMUNITY = graphql(`
  mutation REMOVE_COMMUNITY($id: Int!) {
    removeCommunity(id: $id)
  }
`)

export const SET_COMMUNITY_LINKS = graphql(`
  mutation SET_COMMUNITY_LINKS($id: Int!, $links: [CommunityLinkInput!]!) {
    setCommunityLinks(id: $id, links: $links) {
      id
      links {
        id
        title
        url
      }
    }
  }
`)

export const COMMUNITY_REQUESTS = graphql(`
  query COMMUNITY_REQUESTS($id: Int!, $limit: Int!, $offset: Int!) {
    getCommunityRequests(id: $id, limit: $limit, offset: $offset) {
      date
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const RESOLVE_COMMUNITY_REQUEST = graphql(`
  mutation RESOLVE_COMMUNITY_REQUEST($id: Int!, $userId: Int!, $accept: Boolean!) {
    resolveCommunityRequest(id: $id, userId: $userId, accept: $accept)
  }
`)

export const COMMUNITY_BANS = graphql(`
  query COMMUNITY_BANS($id: Int!, $limit: Int!, $offset: Int!) {
    getCommunityBans(id: $id, limit: $limit, offset: $offset) {
      reason
      date
      user {
        id
        login
        avatar
      }
    }
  }
`)

export const BAN_COMMUNITY_MEMBER = graphql(`
  mutation BAN_COMMUNITY_MEMBER($id: Int!, $userId: Int!, $reason: String) {
    banCommunityMember(id: $id, userId: $userId, reason: $reason)
  }
`)

export const UNBAN_COMMUNITY_MEMBER = graphql(`
  mutation UNBAN_COMMUNITY_MEMBER($id: Int!, $userId: Int!) {
    unbanCommunityMember(id: $id, userId: $userId)
  }
`)

export const INVITE_TO_COMMUNITY = graphql(`
  mutation INVITE_TO_COMMUNITY($id: Int!, $userId: Int!) {
    inviteToCommunity(id: $id, userId: $userId)
  }
`)

export const REVIEW_SUGGESTED_POST = graphql(`
  mutation REVIEW_SUGGESTED_POST($postId: Int!, $approve: Boolean!) {
    reviewSuggestedPost(postId: $postId, approve: $approve)
  }
`)

export const USER_COMMUNITIES = graphql(`
  query USER_COMMUNITIES($userId: Int!, $limit: Int!) {
    getUserCommunities(userId: $userId, limit: $limit) {
      total
      items {
        id
        name
        avatar
        membersCount
      }
    }
  }
`)

export const COMMUNITY_VIDEOS = graphql(`
  query COMMUNITY_VIDEOS($id: Int!, $limit: Int, $offset: Int) {
    getCommunityVideos(id: $id, limit: $limit, offset: $offset) {
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

export const COMMUNITY_PHOTOS = graphql(`
  query COMMUNITY_PHOTOS($id: Int!, $limit: Int, $offset: Int) {
    getCommunityPhotos(id: $id, limit: $limit, offset: $offset) {
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
    }
  }
`)

export const CREATE_COMMUNITY_PHOTO = graphql(`
  mutation CREATE_COMMUNITY_PHOTO($image: File!, $communityId: Int) {
    createPhoto(image: $image, communityId: $communityId) {
      id
    }
  }
`)

export const CREATE_COMMUNITY_VIDEO = graphql(`
  mutation CREATE_COMMUNITY_VIDEO($file: File!, $title: String, $communityId: Int) {
    createVideo(file: $file, title: $title, communityId: $communityId) {
      id
    }
  }
`)

export const SET_COMMUNITY_CONTACTS = graphql(`
  mutation SET_COMMUNITY_CONTACTS($id: Int!, $contacts: [CommunityContactInput!]!) {
    setCommunityContacts(id: $id, contacts: $contacts) {
      id
      contacts {
        position
        user {
          id
          login
          avatar
        }
      }
    }
  }
`)

export const DISCUSSION_TOPICS = graphql(`
  query DISCUSSION_TOPICS($id: Int!, $limit: Int!, $offset: Int!) {
    getDiscussionTopics(id: $id, limit: $limit, offset: $offset) {
      id
      title
      pinned
      closed
      lastMessageAt
      messagesCount
      lastText
      author {
        id
        login
        avatar
      }
    }
  }
`)

export const DISCUSSION_TOPIC = graphql(`
  query DISCUSSION_TOPIC($topicId: Int!) {
    getDiscussionTopic(topicId: $topicId) {
      id
      title
      pinned
      closed
      communityId
      author {
        id
        login
        avatar
      }
    }
  }
`)

export const DISCUSSION_MESSAGES = graphql(`
  query DISCUSSION_MESSAGES($topicId: Int!, $limit: Int!, $offset: Int!) {
    getDiscussionMessages(topicId: $topicId, limit: $limit, offset: $offset) {
      id
      text
      date
      author {
        id
        login
        avatar
      }
    }
  }
`)

export const CREATE_DISCUSSION_TOPIC = graphql(`
  mutation CREATE_DISCUSSION_TOPIC($id: Int!, $title: String!, $text: String!) {
    createDiscussionTopic(id: $id, title: $title, text: $text) {
      id
    }
  }
`)

export const ADD_DISCUSSION_MESSAGE = graphql(`
  mutation ADD_DISCUSSION_MESSAGE($topicId: Int!, $text: String!) {
    addDiscussionMessage(topicId: $topicId, text: $text) {
      id
    }
  }
`)

export const REMOVE_DISCUSSION_MESSAGE = graphql(`
  mutation REMOVE_DISCUSSION_MESSAGE($messageId: Int!) {
    removeDiscussionMessage(messageId: $messageId)
  }
`)

export const REMOVE_DISCUSSION_TOPIC = graphql(`
  mutation REMOVE_DISCUSSION_TOPIC($topicId: Int!) {
    removeDiscussionTopic(topicId: $topicId)
  }
`)

export const SET_DISCUSSION_TOPIC_FLAGS = graphql(`
  mutation SET_DISCUSSION_TOPIC_FLAGS($topicId: Int!, $pinned: Boolean, $closed: Boolean) {
    setDiscussionTopicFlags(topicId: $topicId, pinned: $pinned, closed: $closed)
  }
`)
