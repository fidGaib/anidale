import { ApolloProvider } from '@apollo/client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import { MessagesBridge } from '@/features/messages'
import { GlobalPlayer } from '@/features/music'
import Loader from '@/shared/loader'
import Header from '@/widgets/header'

import GlobalStyles from '../globalStyles'
import { useDarkModeStore } from '../module'
import { darkTheme, lightTheme } from '../themes'
import { client } from './apollo-client'
import { SocketProvider } from './socket-context'

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
              <GlobalPlayer />
              <MessagesBridge />
            </ThemeProvider>
          </BrowserRouter>
        </SocketProvider>
      </ApolloProvider>
    )
  }
