import Header from '@/widgets/header'

import { withProviders } from './providers'
import AppRouter from './providers/AppRouter'
import './styles/index.less'

const App = () => {
  return (
    <>
      <Header />
      <AppRouter />
    </>
  )
}

export default withProviders(App)
