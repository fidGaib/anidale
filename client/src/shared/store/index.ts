import { StateSelector } from 'zustand'
import { shallow } from 'zustand/shallow'

import { usePostStore as Post } from '@/features/profile/module'
import { PostStore } from '@/features/profile/types'

import { UserStore } from './store-types'
import { useUser } from './stores/user-store'

const usePostStore = <T>(cb: StateSelector<PostStore, T>) => Post(cb, shallow)
const useUserStore = <T>(cb: StateSelector<UserStore, T>) => useUser(cb, shallow)

export { usePostStore, useUserStore }
