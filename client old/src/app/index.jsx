import { observer } from 'mobx-react-lite'
import { Suspense, useContext, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { Context } from '..'
import Loader from '../shared/loader/ui'
import Header from '../widgets/header/ui'
import './index.css'
import AppRouter from './providers/AppRouter'

function App() {
  const { loginStore } = useContext(Context)
  useEffect(() => {
    if (localStorage.getItem('token')) {
      loginStore.checkAuth()
    }
  }, [])
  if (loginStore.isLoading) {
    return <Loader />
  } else {
    return (
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Header />
          <AppRouter />
        </Suspense>
      </BrowserRouter>
    )
  }
}

export default observer(App)
