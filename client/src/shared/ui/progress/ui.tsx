import cl from './ui.module.css'

interface Props {
  /** 0–100, пока файлы уходят на сервер. */
  percent: number
  /** Подпись слева, например «Отправка» или «Загрузка 2 из 3». */
  label?: string
}

/**
 * Полоса прогресса загрузки. На 100% файлы уже на сервере, но он ещё обрабатывает их
 * (сжатие картинок, проверка файлов), поэтому показываем «Обработка…».
 */
export const UploadProgress = ({ percent, label }: Props) => {
  const done = percent >= 100
  return (
    <div className={cl.wrapper} role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className={cl.info}>
        <span className={cl.label}>{label ?? 'Загрузка'}</span>
        <span className={cl.value}>{done ? 'Обработка…' : `${percent}%`}</span>
      </div>
      <div className={cl.track}>
        <div className={`${cl.bar} ${done ? cl.processing : ''}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
