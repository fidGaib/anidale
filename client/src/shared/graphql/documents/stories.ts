import { graphql } from '../gql/gql'

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
  mutation CREATE_STORY($image: File!, $text: String, $communityId: Int) {
    createStory(image: $image, text: $text, communityId: $communityId) {
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

export const COMMUNITY_STORIES = graphql(`
  query COMMUNITY_STORIES($id: Int!) {
    getCommunityStories(id: $id) {
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
`)
