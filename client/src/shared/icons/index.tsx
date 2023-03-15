import Logo from './ui/logo'

const icons = {
  logo: (cl?: string) => <Logo className={cl} />,
}
interface PropsType {
  id: keyof typeof icons
  className?: string
}
const Icon = (props: PropsType) => {
  return icons[props.id](props.className)
}

export default Icon
