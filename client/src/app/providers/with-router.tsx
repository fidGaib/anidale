import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

import Loader from '@/shared/loader'

const link = createUploadLink({
  uri: 'http://localhost:5000/graphql',
  credentials: 'include',
})

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
})
export const withRouter = (component: () => React.ReactNode) =>
  function WithRouter() {
    return (
      <ApolloProvider client={client}>
        <BrowserRouter>
          <Suspense fallback={<Loader/>}>{component()}</Suspense>
        </BrowserRouter>
      </ApolloProvider>
    )
  }
