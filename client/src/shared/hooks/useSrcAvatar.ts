export const useSrcAvatar = (avatar: string) => {
  if (avatar.split('/').length === 2) return `http://localhost:5000/storage/${avatar}.webp`
  else return avatar
}
