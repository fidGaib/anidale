import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import Loader from '@/shared/loader'
import Header from '@/widgets/header'

import { GlobalStyles } from '../globalStyles'
import { useDarkModeStore } from '../module'
import { darkTheme, lightTheme } from '../themes'

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
    const theme = useDarkModeStore((store) => store.theme)
    return (
      <ApolloProvider client={client}>
        <BrowserRouter>
          <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
            <GlobalStyles />
            <Header />
            <Suspense fallback={<Loader />}>{component()}</Suspense>
          </ThemeProvider>
        </BrowserRouter>
      </ApolloProvider>
    )
  }
