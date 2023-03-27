import { shallow } from 'zustand/shallow'

import { usePostStore as Post } from '@/features/profile/module'
import { PostStore } from '@/features/profile/types'

const usePostStore = <T>(cb: (store: PostStore) => T) => Post(cb, shallow)

export { usePostStore }
