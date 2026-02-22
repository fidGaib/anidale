export const useSrcAvatar = (avatar: string) => {
  if (avatar.split('/').length === 3) return `http://localhost:5000/storage/${avatar}.webp`
  else return avatar
}
