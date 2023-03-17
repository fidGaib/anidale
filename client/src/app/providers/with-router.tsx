import { ApolloClient, ApolloProvider, createHttpLink, InMemoryCache } from '@apollo/client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

import Loader from '@/shared/loader'

const link = createHttpLink({
  uri: 'http://localhost:5000/graphql',
  credentials: 'include'
})

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: link
})

export const withRouter = (component: () => React.ReactNode) => () => {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>{component()}</Suspense>
      </BrowserRouter>
    </ApolloProvider>
  )
}
