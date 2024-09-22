import { create } from 'zustand'

type UserType = {
  id: number
  login: string
}
interface SettingsTypes {
  layout: number
  error: string
  login: string
  image: File[] | []
  setLogin: (login: string) => void
  setError: (message: string) => void
  setLayout: (id: number) => void
  sendLogin: (schemaFn: any, user: UserType) => Promise<boolean>
  validateFile: (file: File[]) => Promise<boolean | void>
  setFiles: (fileList: FileList) => void
  send: (fn: any, owner: number) => void
}

export const useSettingsStore = create<SettingsTypes>()((set, get) => ({
  layout: 1,
  error: '',
  login: '',
  image: [],
  setLogin(login) {
    set(() => ({ login }))
  },
  setLayout(id) {
    set(() => ({ layout: id }))
  },
  setError(message) {
    set(() => ({ error: message }))
  },
  sendLogin: async (schemaFn, user) => {
    if (user.login !== get().login) {
      await schemaFn({ variables: { id: user.id, login: get().login }, fetchPolicy: 'network-only' })
      return true
    } else return false
  },
  async validateFile(file) {
    const re = /(\.jpg|\.jpeg|\.gif|\.png)$/i
    const size = file[0].size / 1024 / 1024
    const maxSize = 5
    if (!re.exec(file[0].name)) return get().setError('Загружать можно только арты.')
    else if (size > maxSize) return get().setError(`Размер изображения не должен привышать ${maxSize}мб`)
    else return true
  },
  setFiles: async (fileList) => {
    get().setError('')
    const file = Array.from(fileList)
    const validateResult = await get().validateFile(file)
    if (validateResult) set(() => ({ image: file }))
    console.log(get().image)
  },
  send: async (schemaFn, id) => {
    if (get().image.length) {
      await schemaFn({ variables: { id, avatar: get().image }, fetchPolicy: 'network-only' })
    }
  },
}))
