import Logo from './icons/logo'

const icons = {
  logo: (cl?: string) => <Logo className={cl} />,
}
interface PropsType {
  id: keyof typeof icons
  className?: string
}
export const Icon = (props: PropsType) => {
  return icons[props.id](props.className)
}
