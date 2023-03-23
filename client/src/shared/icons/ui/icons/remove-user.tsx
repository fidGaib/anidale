import { SVGAttributes } from 'react'

const RemoveUserIcon = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg {...props} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g>
      <g id='SVGRepo_iconCarrier'>
        {' '}
        <path
          d='M22 9L18 13M18 9L22 13M6.5 21.0001H17.5C18.8807 21.0001 20 19.8808 20 18.5001C20 14.4194 14 14.5001 12 14.5001C10 14.5001 4 14.4194 4 18.5001C4 19.8808 5.11929 21.0001 6.5 21.0001ZM16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z'
          stroke='darkgrey'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        ></path>{' '}
      </g>
    </svg>
  )
}

export default RemoveUserIcon
