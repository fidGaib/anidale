import { ApolloProvider } from '@apollo/client'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import { MessagesBridge } from '@/features/messages'
import { GlobalPlayer } from '@/features/music'
import { NotificationsBridge } from '@/features/notifications'
import { PhotoViewerHost } from '@/features/photo-viewer'
import { PostModalHost, ShareDialogHost } from '@/features/post-viewer'
import { StoryViewerHost } from '@/features/stories'
import Loader from '@/shared/loader'
import { EmailConfirmationBanner } from '@/widgets/email-confirmation'
import Header from '@/widgets/header'

import GlobalStyles from '../globalStyles'
import { useDarkModeStore } from '../module'
import { darkTheme, lightTheme } from '../themes'
import { client } from './apollo-client'
import { ErrorBoundary } from './error-boundary'
import { SocketProvider } from './socket-context'

export const withRouter = (Component: () => React.ReactElement) =>
  function WithRouter() {
    const theme = useDarkModeStore((store) => store.theme)
    return (
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <SocketProvider>
            <BrowserRouter>
              <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
                <GlobalStyles />
                <Header />
                <EmailConfirmationBanner />
                <Suspense fallback={<Loader />}>
                  <Component />
                </Suspense>
                <GlobalPlayer />
                <MessagesBridge />
                <NotificationsBridge />
                <PostModalHost />
                <ShareDialogHost />
                <PhotoViewerHost />
                <StoryViewerHost />
              </ThemeProvider>
            </BrowserRouter>
          </SocketProvider>
        </ErrorBoundary>
      </ApolloProvider>
    )
  }
