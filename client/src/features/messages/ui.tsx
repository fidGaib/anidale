import { useQuery } from '@apollo/client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { Track, useMusicStore } from '@/features/music/module'
import { storageUrl } from '@/shared/config'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, formatFileSize, formatShort } from '@/shared/lib/time'
import { GET_USERS } from '@/shared/graphql/schema'
import ButtonUI from '@/shared/ui/button'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'
import { UploadProgress } from '@/shared/ui/progress'

import {
  Attachment,
  ChatMessage,
  MAX_ATTACHMENTS,
  ReplyPreview,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  MAX_TOTAL_SIZE,
  useMessagesStore,
} from './module'
import cl from './ui.module.css'

/** Сколько получателей можно выбрать при пересылке (как на сервере). */
const MAX_FORWARD = 10

const Avatar = ({ src, className }: { src: string; className?: string }) => (
  <ImageLoading className={className ?? cl.avatar} src={useSrcAvatar(src)} />
)

/** Краткое описание сообщения для списка диалогов. */
const preview = (message: ChatMessage | null, myId: number) => {
  if (!message) return ''
  const prefix = message.senderId === myId ? 'Вы: ' : ''
  if (message.text) return prefix + message.text
  const first = message.attachments[0]
  if (!first) return prefix
  const label = first.kind === 'image' ? 'Фото' : first.kind === 'audio' ? 'Аудио' : first.name
  return `${prefix}${label}${message.attachments.length > 1 ? ` и ещё ${message.attachments.length - 1}` : ''}`
}

/**
 * Окно выбора при удалении диалога: «только у меня» или «у всех».
 * Возвращает функцию ask(пользователь) и готовый элемент окна, который нужно вставить в разметку.
 */
const useDeleteDialog = (onDeleted: (userId: number) => void) => {
  const removeConversation = useMessagesStore((s) => s.removeConversation)
  const [target, setTarget] = useState<{ id: number; login: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const choose = async (forEveryone: boolean) => {
    if (!target || busy) return
    setBusy(true)
    const ok = await removeConversation(target.id, forEveryone)
    setBusy(false)
    if (ok) {
      onDeleted(target.id)
      setTarget(null)
    }
  }

  const modal = (
    <Modal active={target !== null} setActive={(open) => !open && !busy && setTarget(null)}>
      <div className={cl.deleteBox}>
        <p className={cl.deleteTitle}>Удалить диалог с {target?.login || 'пользователем'}?</p>
        <ButtonUI disabled={busy} onClick={() => void choose(false)}>
          Только у меня
        </ButtonUI>
        <p className={cl.deleteHint}>Собеседник сохранит переписку и файлы.</p>
        <ButtonUI disabled={busy} onClick={() => void choose(true)}>
          У всех
        </ButtonUI>
        <p className={cl.deleteHint}>Переписка и файлы удалятся у обоих без возможности восстановления.</p>
        <ButtonUI disabled={busy} onClick={() => setTarget(null)}>
          Отмена
        </ButtonUI>
      </div>
    </Modal>
  )

  return { ask: setTarget, modal }
}

/** Что показать вместо текста в цитате ответа: сам текст или тип вложения. */
const replyLabel = (reply: ReplyPreview) => {
  if (reply.text) return reply.text
  if (reply.attachmentKind === 'image') return 'Фото'
  if (reply.attachmentKind === 'audio') return 'Аудио'
  return reply.attachmentName || 'Вложение'
}

/** Список диалогов слева. */
export const ConversationList = ({ activeId }: { activeId: number | null }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const conversations = useMessagesStore((s) => s.conversations)
  const loading = useMessagesStore((s) => s.conversationsLoading)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog((userId) => {
    if (activeId === userId) navigate('/messages')
  })

  return (
    <div className={`playground ${cl.listBox}`}>
      {modal}
      <div className={cl.listHead}>Сообщения</div>
      {loading && conversations.length === 0 && <p className={cl.hint}>Загрузка…</p>}
      {!loading && conversations.length === 0 && (
        <p className={cl.hint}>Диалогов пока нет. Откройте профиль человека и нажмите «Написать»</p>
      )}
      {conversations.map((c) => (
        <Link
          key={c.user.id}
          to={`/messages/${c.user.id}`}
          className={`${cl.dialog} ${activeId === c.user.id ? cl.dialogActive : ''}`}
        >
          <Avatar src={c.user.avatar} />
          <div className={cl.dialogBody}>
            <div className={cl.dialogTop}>
              <span className={cl.login}>{c.user.login}</span>
              <span className={cl.time}>{c.lastMessage ? formatShort(c.lastMessage.date) : ''}</span>
            </div>
            <div className={cl.dialogBottom}>
              <span className={cl.previewText}>{preview(c.lastMessage, myId)}</span>
              {c.unread > 0 && <span className={cl.badge}>{c.unread > 99 ? '99+' : c.unread}</span>}
            </div>
          </div>
          <img
            className={cl.removeDialog}
            src='/icons/close.svg'
            alt='Удалить диалог'
            title='Удалить диалог'
            onClick={(e) => {
              // Крестик внутри ссылки: не переходим в чат
              e.preventDefault()
              e.stopPropagation()
              ask({ id: c.user.id, login: c.user.login })
            }}
          />
        </Link>
      ))}
    </div>
  )
}

/** Аудио из сообщения в виде трека для общего плеера. Отрицательный id не пересекается с id треков из раздела музыки. */
const toTrack = (attachment: Attachment, senderId: number): Track => ({
  id: -attachment.id,
  title: attachment.name.replace(/\.[^.]+$/, '') || attachment.name,
  artist: 'Из сообщения',
  url: storageUrl(attachment.file),
  file: attachment.file,
  size: attachment.size,
  ownerId: senderId,
  ownerLogin: '',
})

const AudioAttachment = ({ attachment, senderId }: { attachment: Attachment; senderId: number }) => {
  const trackId = -attachment.id
  const playing = useMusicStore((s) => s.currentId === trackId && s.isPlaying)
  const playOne = useMusicStore((s) => s.playOne)
  const messages = useMessagesStore((s) => s.messages)
  return (
    <div
      className={cl.audio}
      onClick={() => {
        // Очередь — все аудио открытого чата по порядку, чтобы работали «вперёд/назад» и автопереход
        const queue = messages.flatMap((m) => m.attachments.filter((a) => a.kind === 'audio').map((a) => toTrack(a, m.senderId)))
        playOne(toTrack(attachment, senderId), queue)
      }}
    >
      <img className={cl.audioIcon} src={playing ? '/icons/pause.svg' : '/icons/play.svg'} alt='' />
      <span className={cl.fileName}>{attachment.name}</span>
      <span className={cl.fileSize}>{formatFileSize(attachment.size)}</span>
    </div>
  )
}

const LONG_PRESS_MS = 500

interface BubbleProps {
  message: ChatMessage
  mine: boolean
  pinned: boolean
  myId: number
  /** Логин собеседника: подпись автора цитаты, когда это не вы. */
  peerLogin: string
  /** Прокрутить к сообщению по клику на цитату. */
  onJump: (id: number) => void
  /** Открыть меню действий в точке экрана (правая кнопка мыши или долгое нажатие). */
  onMenu: (x: number, y: number) => void
}

const MessageBubble = ({ message, mine, pinned, myId, peerLogin, onJump, onMenu }: BubbleProps) => {
  const images = message.attachments.filter((a) => a.kind === 'image')
  const others = message.attachments.filter((a) => a.kind !== 'image')
  // На телефоне правой кнопки нет: меню открывается долгим нажатием
  const pressTimer = useRef<number | undefined>(undefined)
  const cancelPress = () => window.clearTimeout(pressTimer.current)
  return (
    <div className={`${cl.row} ${mine ? cl.rowMine : ''}`} id={`msg-${message.id}`}>
      <div
        className={`${cl.bubble} ${mine ? cl.bubbleMine : ''}`}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu(e.clientX, e.clientY)
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          pressTimer.current = window.setTimeout(() => onMenu(touch.clientX, touch.clientY), LONG_PRESS_MS)
        }}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
      >
        {message.replyToId > 0 &&
          (message.replyTo ? (
            <div className={cl.quote} title='Перейти к сообщению' onClick={() => onJump(message.replyTo!.id)}>
              <div className={cl.quoteAuthor}>
                {message.replyTo.senderId === myId ? 'Вы' : peerLogin || 'Собеседник'}
              </div>
              <div className={cl.quoteText}>{replyLabel(message.replyTo)}</div>
            </div>
          ) : (
            <div className={`${cl.quote} ${cl.quoteGone}`}>Сообщение удалено</div>
          ))}
        {message.forwardedFrom && (
          <div className={cl.forwarded}>
            ↪ Переслано от{' '}
            {message.forwardedFromId ? (
              <Link to={`/profile/${message.forwardedFromId}`}>{message.forwardedFrom}</Link>
            ) : (
              message.forwardedFrom
            )}
          </div>
        )}
        {images.length > 0 && (
          <div className={cl.images}>
            {images.map((a) => (
              <a key={a.id} href={`${storageUrl(a.file)}.webp`} target='_blank' rel='noreferrer'>
                <img className={cl.image} src={`${storageUrl(a.thumb || a.file)}.webp`} alt={a.name} loading='lazy' />
              </a>
            ))}
          </div>
        )}
        {others.map((a) =>
          a.kind === 'audio' ? (
            <AudioAttachment key={a.id} attachment={a} senderId={message.senderId} />
          ) : (
            <a
              key={a.id}
              className={cl.file}
              href={`${storageUrl(a.file)}?name=${encodeURIComponent(a.name)}`}
              download={a.name}
              target='_blank'
              rel='noreferrer'
            >
              <span className={cl.fileIcon}>📎</span>
              <span className={cl.fileName}>{a.name}</span>
              <span className={cl.fileSize}>{formatFileSize(a.size)}</span>
            </a>
          ),
        )}
        {message.text && <div className={cl.text}>{message.text}</div>}
        <div className={cl.stamp}>
          {pinned ? '📌 ' : ''}
          {formatDateTime(message.date)}
          {message.editedAt ? ' · изменено' : ''}
        </div>
      </div>
    </div>
  )
}

/** Окно пересылки: выбор получателей (до 10) с поиском. Уже знакомые собеседники идут первыми. */
const ForwardModal = ({ messageId, onClose }: { messageId: number; onClose: () => void }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const conversations = useMessagesStore((s) => s.conversations)
  const forwardMessage = useMessagesStore((s) => s.forwardMessage)
  const { data, loading } = useQuery(GET_USERS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const users = useMemo(() => {
    const known = new Set(conversations.map((c) => c.user.id))
    const needle = search.trim().toLowerCase()
    return (data?.getUsers ?? [])
      .filter((u) => u.id !== myId && (!needle || u.login.toLowerCase().includes(needle)))
      .sort((a, b) => Number(known.has(b.id)) - Number(known.has(a.id)))
  }, [data, conversations, myId, search])

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_FORWARD ? [...prev, id] : prev,
    )

  const submit = async () => {
    if (!selected.length || busy) return
    setBusy(true)
    const ok = await forwardMessage(messageId, selected)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal active setActive={(open) => !open && !busy && onClose()}>
      <div className={cl.forwardBox}>
        <p className={cl.deleteTitle}>Переслать сообщение</p>
        <input
          className={cl.forwardSearch}
          placeholder='Найти человека…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={cl.forwardList}>
          {loading && <p className={cl.hint}>Загрузка…</p>}
          {!loading && users.length === 0 && <p className={cl.hint}>Никого не найдено</p>}
          {users.map((u) => (
            <label key={u.id} className={cl.forwardUser}>
              <input type='checkbox' checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <Avatar src={u.avatar} />
              <span className={cl.login}>{u.login}</span>
            </label>
          ))}
        </div>
        <p className={cl.deleteHint}>Выбрано: {selected.length} из {MAX_FORWARD}</p>
        <ButtonUI disabled={!selected.length || busy} onClick={() => void submit()}>
          {busy ? 'Пересылка…' : 'Переслать'}
        </ButtonUI>
      </div>
    </Modal>
  )
}

/** Поле ввода: текст, выбор файлов и кнопка отправки. */
const Composer = () => {
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
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wasEditing = useRef(false)

  // Вход в режим правки подставляет текст сообщения; выход (сохранили или отменили) очищает поле
  useEffect(() => {
    if (editing) {
      setText(editing.text)
      setFiles([])
      setLocalError('')
    } else if (wasEditing.current) {
      setText('')
    }
    wasEditing.current = !!editing
  }, [editing])

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
        <textarea
          ref={textareaRef}
          className={cl.textarea}
          placeholder='Написать сообщение…'
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          rows={1}
          onChange={(e) => setText(e.target.value)}
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
        <ButtonUI
          disabled={editing ? !text.trim() && editing.attachments.length === 0 : sending || (!text.trim() && files.length === 0)}
          onClick={() => void submit()}
        >
          {editing ? 'Сохранить' : sending ? 'Отправка…' : 'Отправить'}
        </ButtonUI>
      </div>
    </div>
  )
}

/** Открытый диалог: шапка, история с подгрузкой и поле ввода. */
export const Chat = ({ userId }: { userId: number }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const openChat = useMessagesStore((s) => s.openChat)
  const closeChat = useMessagesStore((s) => s.closeChat)
  const loadOlder = useMessagesStore((s) => s.loadOlder)
  const messages = useMessagesStore((s) => s.messages)
  const activeUser = useMessagesStore((s) => s.activeUser)
  const hasMore = useMessagesStore((s) => s.hasMore)
  const loading = useMessagesStore((s) => s.loading)
  const error = useMessagesStore((s) => s.error)
  const pinned = useMessagesStore((s) => s.pinned)
  const notice = useMessagesStore((s) => s.notice)
  const startEdit = useMessagesStore((s) => s.startEdit)
  const startReply = useMessagesStore((s) => s.startReply)
  const deleteMessage = useMessagesStore((s) => s.deleteMessage)
  const pinMessage = useMessagesStore((s) => s.pinMessage)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog(() => navigate('/messages'))
  // Меню действий над сообщением и окно пересылки
  const [menu, setMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const [forwardId, setForwardId] = useState<number | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  const menuItems: ContextMenuItem[] = menu
    ? [
        { label: 'Ответить', onClick: () => startReply(menu.message) },
        {
          label: 'Редактировать',
          hidden: menu.message.senderId !== myId,
          onClick: () => startEdit(menu.message),
        },
        { label: 'Переслать', onClick: () => setForwardId(menu.message.id) },
        {
          label: pinned?.id === menu.message.id ? 'Открепить' : 'Закрепить',
          onClick: () => void pinMessage(menu.message.id, pinned?.id !== menu.message.id),
        },
        { label: 'Удалить у меня', danger: true, onClick: () => void deleteMessage(menu.message.id, false) },
        {
          label: 'Удалить у всех',
          danger: true,
          // Стереть у обоих можно только своё сообщение
          hidden: menu.message.senderId !== myId,
          onClick: () => {
            if (window.confirm('Удалить сообщение у всех? Это нельзя отменить.')) {
              void deleteMessage(menu.message.id, true)
            }
          },
        },
      ]
    : []

  const scrollToMessage = (id: number) => {
    stickToBottom.current = false
    document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  const scroller = useRef<HTMLDivElement>(null)
  // Запоминаем высоту перед подгрузкой старых сообщений, чтобы список не «прыгал»
  const olderFrom = useRef<number | null>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    stickToBottom.current = true
    void openChat(userId)
    return () => closeChat()
  }, [userId, openChat, closeChat])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (olderFrom.current !== null) {
      el.scrollTop = el.scrollHeight - olderFrom.current
      olderFrom.current = null
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const lastIsMine = messages.length > 0 && messages[messages.length - 1].senderId === myId
  useEffect(() => {
    // Своё новое сообщение всегда показываем целиком
    if (lastIsMine) stickToBottom.current = true
  }, [lastIsMine, messages.length])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const older = async () => {
    olderFrom.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null
    stickToBottom.current = false
    await loadOlder()
  }

  return (
    <div className={`playground ${cl.chatBox}`}>
      {modal}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />}
      {forwardId !== null && <ForwardModal messageId={forwardId} onClose={() => setForwardId(null)} />}
      <div className={cl.chatHead}>
        <Link to='/messages' className={cl.back} title='К диалогам'>
          ←
        </Link>
        {activeUser && (
          <Link to={`/profile/${activeUser.id}`} className={cl.chatUser}>
            <Avatar src={activeUser.avatar} />
            <span className={cl.login}>{activeUser.login || 'Пользователь'}</span>
          </Link>
        )}
        <span className={cl.spacer} />
        <ButtonUI onClick={() => ask({ id: userId, login: activeUser?.login ?? '' })}>Удалить диалог</ButtonUI>
      </div>
      {pinned && (
        <div className={cl.pinnedBar}>
          <span>📌</span>
          <div className={cl.pinnedText} title='Перейти к сообщению' onClick={() => scrollToMessage(pinned.id)}>
            {preview(pinned, myId)}
          </div>
          <img
            className={cl.chipRemove}
            src='/icons/close.svg'
            alt='Открепить'
            title='Открепить'
            onClick={() => void pinMessage(pinned.id, false)}
          />
        </div>
      )}
      <div className={cl.history} ref={scroller} onScroll={onScroll}>
        {hasMore && (
          <div className={cl.older}>
            <ButtonUI disabled={loading} onClick={() => void older()}>
              {loading ? 'Загрузка…' : 'Показать более ранние'}
            </ButtonUI>
          </div>
        )}
        {loading && messages.length === 0 && <p className={cl.hint}>Загрузка…</p>}
        {!loading && messages.length === 0 && !error && <p className={cl.hint}>Сообщений пока нет. Напишите первым</p>}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.senderId === myId}
            pinned={pinned?.id === m.id}
            myId={myId}
            peerLogin={activeUser?.login ?? ''}
            onJump={scrollToMessage}
            onMenu={(x, y) => setMenu({ x, y, message: m })}
          />
        ))}
      </div>
      {error && <p className={cl.error}>{error}</p>}
      {notice && <p className={cl.notice}>{notice}</p>}
      <Composer />
    </div>
  )
}
