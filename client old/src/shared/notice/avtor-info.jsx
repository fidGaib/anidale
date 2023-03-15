import { Link } from 'react-router-dom'

import Image from '../hooks/onLoadImage/onLoadImage'
import cl from './styles/avtor.module.css'

const AvtorInfo = ({ avtor, notice }) => {
  return (
    <Link to={`/profile/${avtor.id}`} className={cl.avtorInfo}>
      <Image src={avtor.avatar} alt={'anidale'} />
      <div className={cl.nickname}>{avtor.login}</div>
      <div className={cl.createDate}>{notice.date}</div>
    </Link>
  )
}

export default AvtorInfo
