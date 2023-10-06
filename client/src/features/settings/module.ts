import { create } from "zustand";

interface SettingsTypes {
    layout: number,
    setLayout: (id: number) => void
}

export const useSettingsStore = create<SettingsTypes>()((set, get) => ({
    layout: 1,
    setLayout(id){
        set(()=>({ layout: id }))
    }
}))