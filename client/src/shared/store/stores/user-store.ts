import { create } from 'zustand'

import { UserStore } from '../store-types'

export const useUser = create<UserStore>((set, get) => ({
  user: {
    id: 0,
    login: '',
    avatar: '',
    isActivated: false,
  },
  setUser: ({ id, login, avatar, isActivated }) => {
    set((state) => ({
      user: {
        id,
        login,
        avatar,
        isActivated,
      },
    }))
  },
  removeUser: () => {
    set((state) => ({
      user: {
        id: 0,
        login: '',
        avatar: '',
        isActivated: false,
      },
    }))
  },
  validate: () => {},
}))
