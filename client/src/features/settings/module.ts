import { create } from 'zustand'

interface SettingsTypes {
  layout: number
  errorLogin: string
  errorAvatar: string
  login?: string
  image: File[] | []
  setLogin: (login?: string) => void
  setLayout: (id: number) => void
  validateFile: (file: File[]) => Promise<boolean | void>
  setFiles: (fileList: FileList) => void
  send: (fn: any, owner: number) => void
}

export const useSettingsStore = create<SettingsTypes>()((set, get) => ({
  layout: 1,
  errorLogin: '',
  errorAvatar: '',
  login: '',
  image: [],
  setLogin(login) {
    set(() => ({ login }))
  },
  setLayout(id) {
    set(() => ({ layout: id }))
  },
  async validateFile(file) {
    const re = /(\.jpg|\.jpeg|\.gif|\.png|\.webp)$/i
    const size = file[0].size / 1024 / 1024
    const maxSize = 5
    if (!re.exec(file[0].name)) return set(() => ({ errorAvatar: 'Загружать можно только арты.' }))
    else if (size > maxSize) return set(() => ({ errorAvatar: `Размер изображения не должен привышать ${maxSize}мб` }))
    else return true
  },
  setFiles: async (fileList) => {
    set(() => ({ errorAvatar: '' }))
    const file = Array.from(fileList)
    const validateResult = await get().validateFile(file)
    if (validateResult) set(() => ({ image: file }))
    console.log(get().image)
  },
  send: async (schemaFn, id) => {
    if (get().image.length) {
      return await schemaFn({ variables: { id, avatar: get().image }, fetchPolicy: 'network-only' })
    }
  },
}))
