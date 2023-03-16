import { forwardRef } from 'react'

const MenuHeaderIcon = forwardRef((props, ref?: any) => {
  return (
    <svg
      ref={ref}
      viewBox='0 0 1024 1024'
      xmlns='http://www.w3.org/2000/svg'
      fill='#a52a2a'
      stroke='#a52a2a'
      strokeWidth='0.01024'
      {...props}
    >
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g
        id='SVGRepo_tracerCarrier'
        strokeLinecap='round'
        strokeLinejoin='round'
        stroke='#CCCCCC'
        strokeWidth='100.352'
      ></g>
      <g id='SVGRepo_iconCarrier'>
        <path
          fill='#a52a2a'
          d='M160 448a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32H160zm448 0a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32H608zM160 896a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32H160zm448 0a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32H608z'
        ></path>
      </g>
    </svg>
  )
})

export default MenuHeaderIcon
