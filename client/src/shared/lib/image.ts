const MAX_SIDE = 1920
const QUALITY = 0.8
// Форматы, которые браузер умеет кодировать в canvas. Для остальных (heic, avif, bmp…) отправляем как есть
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Уменьшает картинку (до 1920 px по большей стороне) и пережимает JPEG/WebP с качеством 0.8,
 * НЕ меняя формат: JPEG остаётся JPEG, PNG — PNG, WebP — WebP.
 * Если результат не получился меньше исходного (или формат нельзя пережать), возвращается исходный файл.
 */
export async function compressKeepFormat(file: File): Promise<File> {
  if (!SUPPORTED.includes(file.type)) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, QUALITY))
  // Браузер мог подменить формат (если не умеет кодировать) или сжать хуже оригинала
  if (!blob || blob.type !== file.type || blob.size >= file.size) return file

  return new File([blob], file.name, { type: file.type, lastModified: file.lastModified })
}
