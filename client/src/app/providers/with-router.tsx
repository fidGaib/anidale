import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
})

export const withRouter = (component: () => React.ReactNode) => () => {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<h1>Loading...</h1>}>{component()}</Suspense>
      </BrowserRouter>
    </ApolloProvider>
  )
}
