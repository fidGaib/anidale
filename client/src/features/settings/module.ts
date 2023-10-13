import { useViewer } from "@/entities/viewer";
import { create } from "zustand";

interface SettingsTypes {
    layout: number,
    error: string,
    login: string,
    setLogin: (login: string) => void,
    setError: (message: string) => void,
    setLayout: (id: number) => void,
    sendLogin: (schemaFn: any, user: any) => Promise<boolean>
}

export const useSettingsStore = create<SettingsTypes>()((set, get) => ({
    layout: 1,
    error: '',
    login: '',
    setLogin(login) {
        console.log(login)
        set(()=>({ login }))
    },
    setLayout(id){
        set(()=>({ layout: id }))
    },
    setError(message) {
        set(() => ({ error: message }))
    },
    sendLogin: async(schemaFn, user) => {
        await schemaFn({variables: {id: user.id, login: get().login}, fetchPolicy: 'network-only'})
        return true
    }
}))