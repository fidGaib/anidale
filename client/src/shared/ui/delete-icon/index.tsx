import { assetUrl } from '@/shared/config'

/** Значок удаления вместо текстового «×»: используется в кнопках «убрать» и «удалить». */
export const DeleteIcon = ({ size = 16 }: { size?: number }) => (
  <img
    src={assetUrl('icons/delete.svg')}
    alt=''
    width={size}
    height={size}
    draggable={false}
    style={{ display: 'block' }}
  />
)
