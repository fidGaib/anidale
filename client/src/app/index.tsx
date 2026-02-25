import { withProviders } from './providers'
import AppRouter from './providers/routes/AppRouter'
import './styles/index.css'
import './styles/root.css'
import './styles/scroll.css'

const App = () => {
  return <AppRouter />
}

export default withProviders(App)
