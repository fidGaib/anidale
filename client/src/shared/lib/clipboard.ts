/**
 * Копирует текст в буфер обмена. navigator.clipboard работает только в безопасном контексте (https или localhost),
 * а сайт может открываться по обычному http: тогда используем запасной вариант через скрытое поле.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Нет разрешения: пробуем запасной способ
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}
