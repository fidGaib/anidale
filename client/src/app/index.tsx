import { withProviders } from './providers'
import AppRouter from './providers/routes/AppRouter'
import './styles/index.less'

const App = () => {
  return <AppRouter />
}

export default withProviders(App)
