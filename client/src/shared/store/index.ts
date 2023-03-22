import { StateSelector } from 'zustand'
import { shallow } from 'zustand/shallow'

import { usePostStore as Post } from '@/features/profile/module'
import { PostStore } from '@/features/profile/types'

<<<<<<< HEAD
import { UserStore } from './store-types'
import { useUser } from './stores/user-store'

const usePostStore = <T>(cb: StateSelector<PostStore, T>) => Post(cb, shallow)
const useUserStore = <T>(cb: StateSelector<UserStore, T>) => useUser(cb, shallow)

export { usePostStore, useUserStore }
=======
const usePostStore = <T>(cb: StateSelector<PostStore, T>) => Post(cb, shallow)

export { usePostStore }
>>>>>>> 5a3da1c4730f78d195df26612010bb99a416a5e1
