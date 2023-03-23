import { SVGAttributes } from 'react'

const NotificationIcon = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg {...props} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g>
      <g id='SVGRepo_iconCarrier'>
        {' '}
        <path
          opacity='0.4'
          d='M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z'
          stroke='#a52a2a'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></path>{' '}
        <path
          opacity='0.4'
          d='M7 13H12'
          stroke='#a52a2a'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></path>{' '}
        <path
          opacity='0.4'
          d='M7 17H16'
          stroke='#a52a2a'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></path>{' '}
        <path
          d='M14 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V10'
          stroke='#a52a2a'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></path>{' '}
      </g>
    </svg>
  )
}

export default NotificationIcon
