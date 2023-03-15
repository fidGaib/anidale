import { Navigate } from 'react-router-dom'

const Signout = () => {
  return <Navigate to='/signin' replace={false} />
}

export default Signout
