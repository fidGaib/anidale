import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

interface typeRefreshData {
  id?: number
  avatar?: string
  login?: string
}
interface typeUserStore {
  refreshData: typeRefreshData
  setRefreshData: (refreshData: typeRefreshData) => void
  reset: () => void
}
const RefreshStore = create(
  persist<typeUserStore>(
    (set) => ({
      refreshData: { id: 0, avatar: '', login: '' },
      setRefreshData: (newData) => {
        set((state) => ({
          refreshData: { ...state.refreshData, ...newData }, // Частичное обновление
        }))
      },
      reset: () => set({ refreshData: { id: 0, avatar: '', login: '' } }),
    }),
    { name: 'refreshData', storage: createJSONStorage(() => sessionStorage) },
  ),
)

const useRefreshStore = <T>(cb: (store: typeUserStore) => T) => RefreshStore(cb, shallow)

export { useRefreshStore }
