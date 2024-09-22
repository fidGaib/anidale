import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface typeDarkModeStore {
  theme: string
  setTheme: () => void
}

export const useDarkModeStore = create(
  persist<typeDarkModeStore>(
    (set, get) => ({
      theme: 'light',
      setTheme() {
        set(() => ({ theme: get().theme === 'light' ? 'dark' : 'light' }))
      },
    }),
    { name: 'dark_mode', storage: createJSONStorage(() => sessionStorage) },
  ),
)
