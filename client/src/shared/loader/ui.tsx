import cl from './ui.module.css'

/**
 * Глобальный fallback для Suspense. Раньше здесь грузился gif на 1.5 МБ,
 * который попадал в критический путь первой загрузки — заменили на CSS-анимацию.
 */
export const Loader = () => {
  return (
    <div className={cl.loader}>
      <div className={cl.spinner} />
    </div>
  )
}
