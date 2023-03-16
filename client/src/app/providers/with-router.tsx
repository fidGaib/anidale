import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

import Loader from '@/shared/loader'

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
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
