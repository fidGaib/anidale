const reg = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
export const useIsEmail = (email: string) => {
  if (!email.trim()) return false
  else if (!email.match(reg)) return 'Не корректный E-mail'
  else return true
}
export const useIsPassword = (pass: string, pass2?: string) => {
  if (!pass.trim()) return false
  else if (pass2?.trim()) {
    if (pass.trim() !== pass2.trim()) return 'Пароли не совпадают'
    else return ''
  } else if (pass.trim().length < 8) return 'Пароль должен быть более 8 символов'
  return true
}
