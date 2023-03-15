import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'

import Header from '../widgets/header'
import AppRouter from './providers/AppRouter'
import './styles/index.less'

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
})
const App = () => {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Header />
        <AppRouter />
      </BrowserRouter>
    </ApolloProvider>
  )
}

export default App
