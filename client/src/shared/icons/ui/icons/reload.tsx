import { SVGAttributes } from 'react'

const ReloadIcon = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg {...props} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g>
      <g id='SVGRepo_iconCarrier'>
        {' '}
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M6.23706 2.0007C6.78897 2.02117 7.21978 2.48517 7.19931 3.03708L7.10148 5.67483C8.45455 4.62548 10.154 4.00001 12 4.00001C16.4183 4.00001 20 7.58174 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68631 15.3137 6.00001 12 6.00001C10.4206 6.00001 8.98317 6.60994 7.91098 7.60891L11.3161 8.00677C11.8646 8.07087 12.2573 8.56751 12.1932 9.11607C12.1291 9.66462 11.6325 10.0574 11.0839 9.99326L5.88395 9.38567C5.36588 9.32514 4.98136 8.87659 5.00069 8.35536L5.20069 2.96295C5.22116 2.41104 5.68516 1.98023 6.23706 2.0007Z'
          fill='#a52a2a'
        ></path>{' '}
      </g>
    </svg>
  )
}

export default ReloadIcon
