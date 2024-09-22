import { ThemeProvider } from 'styled-components'

import Header from '@/widgets/header'

import { GlobalStyles } from './globalStyles'
import { useDarkModeStore } from './module'
import { withProviders } from './providers'
import AppRouter from './providers/routes/AppRouter'
import './styles/index.less'
import { darkTheme, lightTheme } from './themes'

const App = () => {
  const theme = useDarkModeStore((store) => store.theme)
  const setTheme = useDarkModeStore((store) => store.setTheme)
  return (
    <>
      <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        <GlobalStyles />
        <Header themeToggler={setTheme} />
        <AppRouter />
      </ThemeProvider>
    </>
  )
}

export default withProviders(App)
