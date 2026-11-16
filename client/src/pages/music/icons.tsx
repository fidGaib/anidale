import { SVGProps } from 'react'

/**
 * Иконки страницы музыки. Рисуем их сами, а не берём из `public/icons`: там иконки
 * окрашены в цвет акцента сайта, а на тёмной панели плеера нужен `currentColor`.
 */

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const NoteIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M9 18V6l11-2v12' />
    <circle cx='6' cy='18' r='3' />
    <circle cx='17' cy='16' r='3' />
  </svg>
)

export const PlayIcon = (props: IconProps) => (
  <svg {...base(props)} fill='currentColor' stroke='none'>
    <path d='M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z' />
  </svg>
)

export const PauseIcon = (props: IconProps) => (
  <svg {...base(props)} fill='currentColor' stroke='none'>
    <rect x='6' y='5' width='4' height='14' rx='1.2' />
    <rect x='14' y='5' width='4' height='14' rx='1.2' />
  </svg>
)

export const PrevIcon = (props: IconProps) => (
  <svg {...base(props)} fill='currentColor' stroke='none'>
    <path d='M18 5.5v13a1 1 0 0 1-1.54.84L9 14.4V19a1 1 0 0 1-2 0V5a1 1 0 0 1 2 0v4.6l7.46-4.94A1 1 0 0 1 18 5.5Z' />
  </svg>
)

export const NextIcon = (props: IconProps) => (
  <svg {...base(props)} fill='currentColor' stroke='none'>
    <path d='M6 5.5v13a1 1 0 0 0 1.54.84L15 14.4V19a1 1 0 0 0 2 0V5a1 1 0 0 0-2 0v4.6L7.54 4.66A1 1 0 0 0 6 5.5Z' />
  </svg>
)

export const HeartIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => (
  <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
    <path d='M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.4 12 20 12 20Z' />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M12 5v14M5 12h14' />
  </svg>
)

export const DotsIcon = (props: IconProps) => (
  <svg {...base(props)} fill='currentColor' stroke='none'>
    <circle cx='12' cy='5' r='1.8' />
    <circle cx='12' cy='12' r='1.8' />
    <circle cx='12' cy='19' r='1.8' />
  </svg>
)

export const ShuffleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M17 3h4v4M21 3l-7 7M7 21H3v-4M3 21l7-7M17 21h4v-4M21 21l-7-7M7 3H3v4M3 3l7 7' />
  </svg>
)

export const VolumeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M4 9h4l5-4v14l-5-4H4Z' />
    <path d='M16.5 8.5a5 5 0 0 1 0 7' />
  </svg>
)

export const MuteIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M4 9h4l5-4v14l-5-4H4Z' />
    <path d='m16.5 9.5 5 5M21.5 9.5l-5 5' />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx='11' cy='11' r='6.5' />
    <path d='m16 16 4.5 4.5' />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='m6 6 12 12M18 6 6 18' />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v5M14 11v5' />
  </svg>
)

export const EditIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M4 20h4L20 8l-4-4L4 16Z' />
    <path d='m14 6 4 4' />
  </svg>
)

export const DownloadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M12 4v10m0 0 4-4m-4 4-4-4M4 19h16' />
  </svg>
)

export const ClockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx='12' cy='12' r='8.5' />
    <path d='M12 7v5.5l3.5 2' />
  </svg>
)

export const WaveIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M3 12h2.5l2-6 3 12 2.5-9 2 6H21' />
  </svg>
)

export const DiscIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx='12' cy='12' r='9' />
    <circle cx='12' cy='12' r='2.5' />
  </svg>
)

export const UploadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d='M12 20V9m0 0 4 4m-4-4-4 4M4 5h16' />
  </svg>
)
