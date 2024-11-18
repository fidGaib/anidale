import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { createUploadLink } from 'apollo-upload-client'
import React, { Suspense, lazy } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import { useDarkModeStore } from '../module'
import { darkTheme, lightTheme } from '../themes'

const Header = lazy(() => import('@/widgets/header'))
const Loader = lazy(() => import('@/shared/loader'))
const GlobalStyles = lazy(() => import('../globalStyles'))

export const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: createUploadLink({
    uri: 'http://localhost:5000/graphql',
    credentials: 'include',
  }),
})
export const withRouter = (Component: () => React.ReactElement) =>
  function WithRouter() {
    const theme = useDarkModeStore((store) => store.theme)
    return (
      <ApolloProvider client={client}>
        <BrowserRouter>
          <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
            <Suspense fallback={<Loader />}>
              <GlobalStyles />
              <Header />
              <Component />
            </Suspense>
          </ThemeProvider>
        </BrowserRouter>
      </ApolloProvider>
    )
  }
