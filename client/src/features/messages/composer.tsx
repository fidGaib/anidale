import { useEffect, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { formatFileSize } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'
import { EmojiPanel } from '@/shared/ui/emoji-panel'
import { UploadProgress } from '@/shared/ui/progress'

import { getDraft, useDraftsStore } from './drafts'
import { preview } from './helpers'
import { MAX_ATTACHMENTS, MAX_FILE_SIZE, MAX_TEXT_LENGTH, MAX_TOTAL_SIZE, useMessagesStore } from './module'
import cl from './ui.module.css'
import { useVoiceRecorder } from './voice-recorder'

/** Поле ввода: текст, выбор файлов и кнопка отправки. */
export const Composer = ({ userId }: { userId: number }) => {
  const send = useMessagesStore((s) => s.send)
  const sending = useMessagesStore((s) => s.sending)
  const uploadProgress = useMessagesStore((s) => s.uploadProgress)
  const editing = useMessagesStore((s) => s.editing)
  const startEdit = useMessagesStore((s) => s.startEdit)
  const editMessage = useMessagesStore((s) => s.editMessage)
  const replying = useMessagesStore((s) => s.replying)
  const startReply = useMessagesStore((s) => s.startReply)
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Недописанный текст возвращается при повторном входе в диалог
  const [text, setText] = useState(() => getDraft(userId))
  const setDraft = useDraftsStore((s) => s.setDraft)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const voice = useVoiceRecorder()
  const [files, setFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wasEditing = useRef(false)
  const { socket, isConnected } = useSocket()
  const activeUserId = useMessagesStore((s) => s.activeUserId)
  const lastTyping = useRef(0)
  /** Сообщаем собеседнику, что печатаем; не чаще раза в 2 секунды. */
  const notifyTyping = () => {
    const now = Date.now()
    if (!socket || !isConnected || activeUserId === null || editing || now - lastTyping.current < 2000) return
    lastTyping.current = now
    socket.emit('typing', { to: activeUserId })
  }

  // Вход в режим правки подставляет текст сообщения; выход (сохранили или отменили) очищает поле
  useEffect(() => {
    if (editing) {
      setText(editing.text)
      setFiles([])
      setLocalError('')
    } else if (wasEditing.current) {
      setText(getDraft(userId))
    }
    wasEditing.current = !!editing
  }, [editing, userId])

  /** Меняет текст и сохраняет черновик (в режиме правки черновик не трогаем). */
  const changeText = (value: string) => {
    setText(value)
    if (!editing) setDraft(userId, value)
  }

  /** Вставляет эмодзи в позицию курсора. */
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    if (next.length > MAX_TEXT_LENGTH) return
    changeText(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  /** Останавливает запись и сразу отправляет голосовое. */
  const sendVoice = async () => {
    const file = await voice.stop()
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setLocalError('Голосовое слишком большое')
      return
    }
    await send('', [file])
  }

  // Нажали «Ответить»: сразу можно печатать
  useEffect(() => {
    if (replying) textareaRef.current?.focus()
  }, [replying])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list)
    const tooBig = incoming.find((f) => f.size > MAX_FILE_SIZE)
    if (tooBig) {
      setLocalError(`«${tooBig.name}» больше ${MAX_FILE_SIZE / 1024 / 1024} МБ`)
      return
    }
    if (files.length + incoming.length > MAX_ATTACHMENTS) {
      setLocalError(`Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`)
      return
    }
    const total = [...files, ...incoming].reduce((sum, f) => sum + f.size, 0)
    if (total > MAX_TOTAL_SIZE) {
      setLocalError(`Вложения не должны превышать ${MAX_TOTAL_SIZE / 1024 / 1024} МБ в сумме`)
      return
    }
    setLocalError('')
    setFiles((prev) => [...prev, ...incoming])
  }

  const submit = async () => {
    if (editing) {
      const value = text.trim()
      // Без вложений пустой текст не сохраняем: такое сообщение нужно удалить
      if (!value && editing.attachments.length === 0) return
      // Ничего не изменилось: просто выходим из режима правки
      if (value === editing.text) return startEdit(null)
      await editMessage(editing.id, text)
      return
    }
    if (sending || (!text.trim() && files.length === 0)) return
    if (await send(text, files)) {
      setText('')
      setDraft(userId, '')
      setEmojiOpen(false)
      setFiles([])
      setLocalError('')
    }
  }

  return (
    <div className={cl.composer}>
      {editing && (
        <div className={cl.editBar}>
          <span>✎ Редактирование сообщения</span>
          <img
            className={cl.chipRemove}
            src='/icons/close.svg'
            alt='Отменить правку'
            title='Отменить правку (Esc)'
            onClick={() => startEdit(null)}
          />
        </div>
      )}
      {replying && !editing && (
        <div className={cl.editBar}>
          <span className={cl.replyText}>↩ Ответ: {preview(replying, myId)}</span>
          <img
            className={cl.chipRemove}
            src='/icons/close.svg'
            alt='Отменить ответ'
            title='Отменить ответ (Esc)'
            onClick={() => startReply(null)}
          />
        </div>
      )}
      {!editing && files.length > 0 && (
        <div className={cl.chips}>
          {files.map((file, index) => (
            <span key={`${file.name}-${index}`} className={cl.chip}>
              {file.name} · {formatFileSize(file.size)}
              <img
                className={cl.chipRemove}
                src='/icons/close.svg'
                alt='Убрать'
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
              />
            </span>
          ))}
        </div>
      )}
      {localError && <p className={cl.error}>{localError}</p>}
      {uploadProgress !== null && <UploadProgress percent={uploadProgress} label='Отправка файлов' />}
      {voice.error && <p className={cl.error}>{voice.error}</p>}
      {voice.recording ? (
        <div className={cl.inputRow}>
          <img
            className={cl.attach}
            src='/icons/close.svg'
            alt='Отменить'
            title='Отменить запись'
            onClick={voice.cancel}
          />
          <span className={cl.recording}>
            <span className={cl.recDot} /> Запись {Math.floor(voice.seconds / 60)}:
            {String(voice.seconds % 60).padStart(2, '0')}
          </span>
          <span className={cl.spacer} />
          <ButtonUI disabled={sending} onClick={() => void sendVoice()}>
            Отправить
          </ButtonUI>
        </div>
      ) : (
        <div className={cl.inputRow}>
          <input
            ref={inputRef}
            type='file'
            hidden
            multiple
            onChange={(e) => {
              addFiles(e.target.files)
              // Сброс, чтобы тот же файл можно было выбрать повторно
              e.target.value = ''
            }}
          />
          {/* При правке вложения менять нельзя: только текст */}
          {!editing && (
            <img
              className={cl.attach}
              src='/icons/add_photo.svg'
              alt='Прикрепить'
              title='Прикрепить файлы, фото, музыку'
              onClick={() => inputRef.current?.click()}
            />
          )}
          <span className={cl.emojiWrap}>
            {emojiOpen && <EmojiPanel onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
            <button
              type='button'
              className={cl.iconButton}
              title='Эмодзи'
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setEmojiOpen((open) => !open)}
            >
              <ImageLoading className={cl.recordIcon} src={assetUrl('/icons/emoji.svg')} />
            </button>
          </span>
          <textarea
            ref={textareaRef}
            className={cl.textarea}
            placeholder='Написать сообщение…'
            value={text}
            maxLength={MAX_TEXT_LENGTH}
            rows={1}
            onChange={(e) => {
              changeText(e.target.value)
              notifyTyping()
            }}
            onKeyDown={(e) => {
              // Enter отправляет, Shift+Enter — перенос строки, Esc — выйти из правки
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              } else if (e.key === 'Escape') {
                if (editing) startEdit(null)
                else if (replying) startReply(null)
              }
            }}
          />
          {!editing && !text.trim() && files.length === 0 && voice.supported && (
            <button
              type='button'
              className={cl.iconButton}
              title='Записать голосовое'
              onClick={() => void voice.start()}
            >
              <ImageLoading className={cl.recordIcon} src={assetUrl('/icons/record.svg')} />
            </button>
          )}
          <ButtonUI
            disabled={
              editing
                ? !text.trim() && editing.attachments.length === 0
                : sending || (!text.trim() && files.length === 0)
            }
            onClick={() => void submit()}
          >
            {editing ? (
              'Сохранить'
            ) : sending ? (
              'Отправка…'
            ) : (
              <ImageLoading className={cl.recordIcon} src={assetUrl('/icons/send.svg')} />
            )}
          </ButtonUI>
        </div>
      )}
    </div>
  )
}
