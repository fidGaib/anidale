import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

interface typeRefreshData {
  id: number
  avatar: string
  login: string
}
interface typeUserStore {
  refreshData: { id: number; avatar: string; login: string }
  setRefreshData: (refreshData: typeRefreshData) => void
}
const RefreshStore = create(
  persist<typeUserStore>(
    (set) => ({
      refreshData: { id: 0, avatar: '', login: '' },
      setRefreshData: (refreshData) => {
        set({ refreshData })
      },
    }),
    { name: 'refreshData', storage: createJSONStorage(() => sessionStorage) },
  ),
)

const useRefreshStore = <T>(cb: (store: typeUserStore) => T) => RefreshStore(cb, shallow)

export { useRefreshStore }
