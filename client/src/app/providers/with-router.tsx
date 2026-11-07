import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import Loader from '@/shared/loader'
import Header from '@/widgets/header'

import { GRAPHQL_URL } from '@/shared/config'

import GlobalStyles from '../globalStyles'
import { useDarkModeStore } from '../module'
import { darkTheme, lightTheme } from '../themes'
import { SocketProvider } from './socket-context'

export const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: createUploadLink({
    uri: GRAPHQL_URL,
    credentials: 'include',
  }),
})
export const withRouter = (Component: () => React.ReactElement) =>
  function WithRouter() {
    const theme = useDarkModeStore((store) => store.theme)
    return (
      <ApolloProvider client={client}>
        <SocketProvider>
          <BrowserRouter>
            <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
              <GlobalStyles />
              <Header />
              <Suspense fallback={<Loader />}>
                <Component />
              </Suspense>
            </ThemeProvider>
          </BrowserRouter>
        </SocketProvider>
      </ApolloProvider>
    )
  }
