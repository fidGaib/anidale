import { useQuery } from '@apollo/client'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { Track, useMusicStore } from '@/features/music/module'
import { assetUrl, storageUrl } from '@/shared/config'
import { GET_USERS } from '@/shared/graphql/schema'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { copyText } from '@/shared/lib/clipboard'
import { openPhotos } from '@/shared/lib/photo-viewer'
import { dayKey, formatDateTime, formatDay, formatFileSize, formatLastSeen, formatShort } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'
import { UploadProgress } from '@/shared/ui/progress'
import { RichText } from '@/shared/ui/rich-text'

import { PinnedBar, ReactionBar, SearchPanel } from './chat-parts'
import { getDraft, useDraftsStore } from './drafts'
import { EmojiPanel } from './emoji-panel'
import {
  Attachment,
  ChatMessage,
  ConversationItem,
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  MAX_TOTAL_SIZE,
  Reaction,
  ReplyPreview,
  useMessagesStore,
} from './module'
import cl from './ui.module.css'
import { useVoiceRecorder } from './voice-recorder'

/** Сколько держать палец на сообщении или диалоге, чтобы открылось меню. */
const LONG_PRESS_MS = 500

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
  const setSettings = useMessagesStore((s) => s.setSettings)
  const drafts = useDraftsStore((s) => s.drafts)
  const draftsOwner = useDraftsStore((s) => s.owner)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog((userId) => {
    if (activeId === userId) navigate('/messages')
  })
  const [showArchive, setShowArchive] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; item: ConversationItem } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  // На телефоне правой кнопки нет: меню открывается долгим нажатием
  const pressTimer = useRef<number | undefined>(undefined)
  const cancelPress = () => window.clearTimeout(pressTimer.current)

  // Подгружаем черновики текущего пользователя из localStorage
  useEffect(() => {
    getDraft(0)
  }, [myId])
  const myDrafts = draftsOwner === myId ? drafts : {}

  const archivedCount = conversations.filter((c) => c.archived).length
  // Если архив опустел, возвращаемся к основному списку
  useEffect(() => {
    if (showArchive && archivedCount === 0) setShowArchive(false)
  }, [showArchive, archivedCount])
  const visible = conversations.filter((c) => c.archived === showArchive)
  const archivedUnread = conversations.reduce((sum, c) => sum + (c.archived && !c.muted ? c.unread : 0), 0)

  const menuItems: ContextMenuItem[] = menu
    ? [
        {
          label: menu.item.pinned ? 'Открепить диалог' : 'Закрепить диалог',
          svg: menu.item.pinned ? '/icons/unpin.svg' : '/icons/pin.svg',
          onClick: () => void setSettings(menu.item.user.id, { pinned: !menu.item.pinned }),
        },
        {
          label: menu.item.muted ? 'Включить звук' : 'Отключить звук',
          onClick: () => void setSettings(menu.item.user.id, { muted: !menu.item.muted }),
          svg: menu.item.muted ? '/icons/unmute.svg' : '/icons/mute (2).svg',
        },
        {
          label: menu.item.archived ? 'Вернуть из архива' : 'В архив',
          onClick: () => void setSettings(menu.item.user.id, { archived: !menu.item.archived }),
          svg: menu.item.archived ? '/icons/unarchive.svg' : '/icons/archive.svg',
        },
        {
          label: 'Удалить диалог',
          danger: true,
          onClick: () => ask({ id: menu.item.user.id, login: menu.item.user.login }),
          svg: '/icons/delete.svg',
        },
      ]
    : []

  return (
    <div className={`playground ${cl.listBox}`}>
      {modal}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />}
      <div className={cl.listHead}>
        {showArchive ? (
          <>
            <button type='button' className={cl.linkButton} onClick={() => setShowArchive(false)}>
              ← Назад
            </button>
            <span> Архив</span>
          </>
        ) : (
          'Сообщения'
        )}
      </div>
      {!showArchive && archivedCount > 0 && (
        <div className={cl.archiveRow} onClick={() => setShowArchive(true)}>
          <span>🗄 Архив</span>
          <span className={cl.previewText}>{archivedCount}</span>
          {archivedUnread > 0 && <span className={cl.badge}>{archivedUnread > 99 ? '99+' : archivedUnread}</span>}
        </div>
      )}
      {loading && conversations.length === 0 && <p className={cl.hint}>Загрузка…</p>}
      {!loading && conversations.length === 0 && (
        <p className={cl.hint}>Диалогов пока нет. Откройте профиль человека и нажмите «Написать»</p>
      )}
      {visible.map((c) => {
        const draft = activeId === c.user.id ? '' : myDrafts[c.user.id] ?? ''
        return (
          <Link
            key={c.user.id}
            to={`/messages/${c.user.id}`}
            className={`${cl.dialog} ${activeId === c.user.id ? cl.dialogActive : ''}`}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ x: e.clientX, y: e.clientY, item: c })
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0]
              pressTimer.current = window.setTimeout(
                () => setMenu({ x: touch.clientX, y: touch.clientY, item: c }),
                LONG_PRESS_MS,
              )
            }}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            onTouchCancel={cancelPress}
          >
            <Avatar src={c.user.avatar} />
            <div className={cl.dialogBody}>
              <div className={cl.dialogTop}>
                <span className={cl.login}>
                  {c.pinned ? '📌 ' : ''}
                  {c.user.login}
                  {c.muted ? ' 🔕' : ''}
                </span>
                <span className={cl.time}>{c.lastMessage ? formatShort(c.lastMessage.date) : ''}</span>
              </div>
              <div className={cl.dialogBottom}>
                <span className={cl.previewText}>
                  {draft ? (
                    <>
                      <span className={cl.draftLabel}>Черновик: </span>
                      {draft}
                    </>
                  ) : (
                    preview(c.lastMessage, myId)
                  )}
                </span>
                {c.unread > 0 && (
                  <span className={`${cl.badge} ${c.muted ? cl.badgeMuted : ''}`}>
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </div>
            </div>
            <img
              className={cl.removeDialog}
              src='/icons/delete.svg'
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
        )
      })}
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
        const queue = messages.flatMap((m) =>
          m.attachments.filter((a) => a.kind === 'audio').map((a) => toTrack(a, m.senderId)),
        )
        playOne(toTrack(attachment, senderId), queue)
      }}
    >
      <img className={cl.audioIcon} src={playing ? '/icons/pause.svg' : '/icons/play.svg'} alt='' />
      <span className={cl.fileName}>{attachment.name}</span>
      <span className={cl.fileSize}>{formatFileSize(attachment.size)}</span>
    </div>
  )
}

interface BubbleProps {
  message: ChatMessage
  mine: boolean
  /** Моё сообщение, которое собеседник уже прочитал. */
  read: boolean
  /** Включён режим выбора: клик по сообщению отмечает его. */
  selecting: boolean
  selected: boolean
  onToggle: () => void
  pinned: boolean
  myId: number
  /** Логин собеседника: подпись автора цитаты, когда это не вы. */
  peerLogin: string
  /** Прокрутить к сообщению по клику на цитату. */
  onJump: (id: number) => void
  /** Открыть меню действий в точке экрана (правая кнопка мыши или долгое нажатие). */
  onMenu: (x: number, y: number) => void
  /** Нажали на реакцию под сообщением: поставить такую же или снять свою. */
  onReact: (emoji: string) => void
}

/** Реакции под сообщением, сгруппированные по эмодзи: сколько и есть ли моя. */
const groupReactions = (reactions: Reaction[], myId: number) => {
  const groups = new Map<string, { emoji: string; count: number; mine: boolean }>()
  for (const r of reactions) {
    const group = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false }
    group.count += 1
    group.mine = group.mine || r.userId === myId
    groups.set(r.emoji, group)
  }
  return [...groups.values()]
}

const MessageBubble = ({
  message,
  mine,
  read,
  selecting,
  selected,
  onToggle,
  pinned,
  myId,
  peerLogin,
  onJump,
  onMenu,
  onReact,
}: BubbleProps) => {
  const images = message.attachments.filter((a) => a.kind === 'image')
  const others = message.attachments.filter((a) => a.kind !== 'image')
  // На телефоне правой кнопки нет: меню открывается долгим нажатием
  const pressTimer = useRef<number | undefined>(undefined)
  const cancelPress = () => window.clearTimeout(pressTimer.current)
  return (
    <div
      className={`${cl.row} ${mine ? cl.rowMine : ''} ${selecting ? cl.rowSelecting : ''} ${
        selected ? cl.rowSelected : ''
      }`}
      id={`msg-${message.id}`}
      onClick={selecting ? onToggle : undefined}
    >
      {selecting && <input type='checkbox' className={cl.selectBox} checked={selected} readOnly />}
      <div
        className={`${cl.bubble} ${mine ? cl.bubbleMine : ''}`}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!selecting) onMenu(e.clientX, e.clientY)
        }}
        onTouchStart={(e) => {
          if (selecting) return
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
            {images.map((a, index) => (
              <a
                key={a.id}
                href={`${storageUrl(a.file)}.webp`}
                target='_blank'
                rel='noreferrer'
                onClick={(e) => {
                  // Просмотр как в ВК: все фото сообщения, листание стрелками
                  e.preventDefault()
                  openPhotos(
                    images.map((img) => ({ src: `${storageUrl(img.file)}.webp`, name: img.name })),
                    index,
                  )
                }}
              >
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
        {message.text && (
          <div className={cl.text}>
            <RichText text={message.text} />
          </div>
        )}
        {message.reactions.length > 0 && (
          <div className={cl.reactions}>
            {groupReactions(message.reactions, myId).map((g) => (
              <span
                key={g.emoji}
                className={`${cl.reaction} ${g.mine ? cl.reactionMine : ''}`}
                title={g.mine ? 'Убрать реакцию' : 'Поставить такую же'}
                onClick={(e) => {
                  e.stopPropagation()
                  onReact(g.emoji)
                }}
              >
                {g.emoji} {g.count > 1 ? g.count : ''}
              </span>
            ))}
          </div>
        )}
        <div className={cl.stamp}>
          {pinned ? '📌 ' : ''}
          {formatDateTime(message.date)}
          {message.editedAt ? ' · изменено' : ''}
          {mine && (
            <span title={read ? 'Прочитано' : 'Доставлено'} className={read ? cl.checkRead : undefined}>
              {read ? ' ✓✓' : ' ✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Окно пересылки: выбор получателей (до 10) с поиском. Уже знакомые собеседники идут первыми. */
const ForwardModal = ({ messageIds, onClose }: { messageIds: number[]; onClose: () => void }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const conversations = useMessagesStore((s) => s.conversations)
  const forwardMessages = useMessagesStore((s) => s.forwardMessages)
  const [search, setSearch] = useState('')
  const [serverSearch, setServerSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setServerSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  const { data, loading } = useQuery(GET_USERS, {
    variables: { limit: 100, offset: 0, search: serverSearch || undefined },
  })
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
    const ok = await forwardMessages(messageIds, selected)
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
        <p className={cl.deleteHint}>
          Выбрано: {selected.length} из {MAX_FORWARD}
        </p>
        <ButtonUI disabled={!selected.length || busy} onClick={() => void submit()}>
          {busy ? 'Пересылка…' : 'Переслать'}
        </ButtonUI>
      </div>
    </Modal>
  )
}

/** Поле ввода: текст, выбор файлов и кнопка отправки. */
const Composer = ({ userId }: { userId: number }) => {
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
  const pinnedList = useMessagesStore((s) => s.pinnedList)
  const react = useMessagesStore((s) => s.react)
  const jumpTo = useMessagesStore((s) => s.jumpTo)
  const backToLatest = useMessagesStore((s) => s.backToLatest)
  const detached = useMessagesStore((s) => s.detached)
  const missedWhileDetached = useMessagesStore((s) => s.missedWhileDetached)
  const firstUnreadId = useMessagesStore((s) => s.firstUnreadId)
  const peerPresence = useMessagesStore((s) => s.peerPresence)
  const peerRead = useMessagesStore((s) => s.peerRead)
  const peerTyping = useMessagesStore((s) => s.peerTyping)
  const notice = useMessagesStore((s) => s.notice)
  const startEdit = useMessagesStore((s) => s.startEdit)
  const startReply = useMessagesStore((s) => s.startReply)
  const deleteMessage = useMessagesStore((s) => s.deleteMessage)
  const pinMessage = useMessagesStore((s) => s.pinMessage)
  const selection = useMessagesStore((s) => s.selection)
  const toggleSelect = useMessagesStore((s) => s.toggleSelect)
  const clearSelection = useMessagesStore((s) => s.clearSelection)
  const deleteMessages = useMessagesStore((s) => s.deleteMessages)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog(() => navigate('/messages'))
  // Меню действий над сообщением и окно пересылки
  const [menu, setMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const [forwardIds, setForwardIds] = useState<number[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  // Сколько новых сообщений пришло, пока список прокручен вверх
  const [unseen, setUnseen] = useState(0)
  const [farFromBottom, setFarFromBottom] = useState(false)
  const { socket, isConnected } = useSocket()
  // Раз в полминуты пересчитываем «был(а) N мин. назад»
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const closeMenu = useCallback(() => setMenu(null), [])
  const isPinned = (id: number) => pinnedList.some((m) => m.id === id)

  const menuItems: ContextMenuItem[] = menu
    ? [
        { label: 'Ответить', onClick: () => startReply(menu.message), svg: '/icons/reply.svg' },
        {
          label: 'Копировать текст',
          hidden: !menu.message.text,
          onClick: () => void copyText(menu.message.text),
          svg: '/icons/copy (2).svg',
        },
        {
          label: 'Редактировать',
          hidden: menu.message.senderId !== myId,
          onClick: () => startEdit(menu.message),
          svg: '/icons/edit.svg',
        },
        { label: 'Переслать', onClick: () => setForwardIds([menu.message.id]), svg: '/icons/forward.svg' },
        { label: 'Выбрать', onClick: () => toggleSelect(menu.message.id), svg: '/icons/select.svg' },
        {
          label: isPinned(menu.message.id) ? 'Открепить' : 'Закрепить',
          onClick: () => void pinMessage(menu.message.id, !isPinned(menu.message.id)),
          svg: isPinned(menu.message.id) ? '/icons/unpin.svg' : '/icons/pin.svg',
        },
        {
          label: 'Удалить у меня',
          danger: true,
          onClick: () => void deleteMessage(menu.message.id, false),
          svg: '/icons/delete.svg',
        },
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
          svg: '/icons/delete.svg',
        },
      ]
    : []

  // «Удалить у всех» доступно, только если все выбранные сообщения мои
  const allMineSelected = !!selection && selection.every((id) => messages.find((m) => m.id === id)?.senderId === myId)

  // Esc выходит из режима выбора
  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clearSelection()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, clearSelection])

  const scroller = useRef<HTMLDivElement>(null)
  /** Прокрутка к сообщению; если оно не загружено, подгружается кусок истории вокруг него. */
  const scrollToMessage = async (id: number) => {
    stickToBottom.current = false
    const wasLoaded = useMessagesStore.getState().messages.some((m) => m.id === id)
    if (!wasLoaded && !(await jumpTo(id))) return
    // Дожидаемся отрисовки подгруженного окна
    setTimeout(
      () => {
        const el = document.getElementById(`msg-${id}`)
        el?.scrollIntoView({ block: 'center', behavior: wasLoaded ? 'smooth' : 'auto' })
        // Короткая подсветка найденного сообщения
        el?.classList.add(cl.flash)
        setTimeout(() => el?.classList.remove(cl.flash), 1600)
      },
      wasLoaded ? 0 : 60,
    )
  }

  // Запоминаем высоту перед подгрузкой старых сообщений, чтобы список не «прыгал»
  const olderFrom = useRef<number | null>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    stickToBottom.current = true
    setUnseen(0)
    setSearchOpen(false)
    void openChat(userId)
    return () => closeChat()
  }, [userId, openChat, closeChat])

  // Подписка на «в сети» собеседника; после переподключения сокета подписываемся заново
  useEffect(() => {
    if (!socket || !isConnected) return
    socket.emit('watch', { userId })
    return () => {
      socket.emit('watch', { userId: null })
    }
  }, [socket, isConnected, userId])

  // Есть непрочитанные: показываем историю с первого из них
  useEffect(() => {
    if (firstUnreadId <= 0) return
    stickToBottom.current = false
    const t = setTimeout(() => document.getElementById('unread-sep')?.scrollIntoView({ block: 'start' }), 0)
    return () => clearTimeout(t)
  }, [firstUnreadId])

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

  const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0
  const lastIsMine = messages.length > 0 && messages[messages.length - 1].senderId === myId
  const prevLastId = useRef(0)
  useEffect(() => {
    // Пришло чужое сообщение, а мы смотрим старую историю: считаем непрочитанное для кнопки «вниз»
    if (lastId > prevLastId.current && prevLastId.current !== 0 && !lastIsMine && !stickToBottom.current && !detached) {
      setUnseen((n) => n + 1)
    }
    prevLastId.current = lastId
  }, [lastId, lastIsMine, detached])
  useEffect(() => {
    // Своё новое сообщение всегда показываем целиком
    if (lastIsMine) stickToBottom.current = true
  }, [lastIsMine, messages.length])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottom.current = distance < 80
    setFarFromBottom(distance > 300)
    if (distance < 80) setUnseen(0)
  }

  const goDown = () => {
    if (detached) {
      stickToBottom.current = true
      void backToLatest()
      return
    }
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setUnseen(0)
  }

  /** Копирует выбранные сообщения: «Автор, дата» и текст, в порядке переписки. */
  const copySelected = async () => {
    if (!selection) return
    const text = messages
      .filter((m) => selection.includes(m.id) && m.text)
      .map(
        (m) =>
          `${m.senderId === myId ? 'Вы' : activeUser?.login ?? 'Собеседник'}, ${formatDateTime(m.date)}\n${m.text}`,
      )
      .join('\n\n')
    if (text) await copyText(text)
    clearSelection()
  }

  const older = async () => {
    olderFrom.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null
    stickToBottom.current = false
    await loadOlder()
  }

  return (
    <div className={`playground ${cl.chatBox}`}>
      {modal}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={closeMenu}
          header={
            <ReactionBar
              current={menu.message.reactions.find((x) => x.userId === myId)?.emoji}
              onPick={(emoji) => {
                closeMenu()
                void react(menu.message.id, emoji)
              }}
            />
          }
        />
      )}
      {forwardIds !== null && <ForwardModal messageIds={forwardIds} onClose={() => setForwardIds(null)} />}
      <div className={cl.chatHead}>
        <Link to='/messages' className={cl.back} title='К диалогам'>
          ←
        </Link>
        {activeUser && (
          <Link to={`/profile/${activeUser.id}`} className={cl.chatUser}>
            <Avatar src={activeUser.avatar} />
            <span className={cl.userInfo}>
              <span className={cl.login}>{activeUser.login || 'Пользователь'}</span>
              {peerTyping ? (
                <span className={cl.typing}>печатает…</span>
              ) : (
                peerPresence && (
                  <span className={`${cl.status} ${peerPresence.online ? cl.statusOnline : ''}`}>
                    {formatLastSeen(peerPresence.online, peerPresence.lastSeenAt)}
                  </span>
                )
              )}
            </span>
          </Link>
        )}
        <span className={cl.spacer} />
        <button
          type='button'
          className={cl.iconButton}
          title='Поиск по сообщениям'
          onClick={() => setSearchOpen((open) => !open)}
        >
          <ImageLoading src={assetUrl('icons/search.svg')} />
        </button>
        {/* <ButtonUI onClick={() => ask({ id: userId, login: activeUser?.login ?? '' })}>Удалить диалог</ButtonUI> */}
      </div>
      {searchOpen && (
        <SearchPanel
          userId={userId}
          myId={myId}
          peerLogin={activeUser?.login ?? ''}
          onPick={(id) => void scrollToMessage(id)}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <PinnedBar
        pinned={pinnedList}
        myId={myId}
        onGo={(id) => void scrollToMessage(id)}
        onUnpin={(id) => void pinMessage(id, false)}
      />
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
        {messages.map((m, index) => (
          <Fragment key={m.id}>
            {(index === 0 || dayKey(messages[index - 1].date) !== dayKey(m.date)) && (
              <div className={cl.daySep}>
                <span>{formatDay(m.date)}</span>
              </div>
            )}
            {m.id === firstUnreadId && (
              <div className={cl.unreadSep} id='unread-sep'>
                Непрочитанные сообщения
              </div>
            )}
            <MessageBubble
              message={m}
              mine={m.senderId === myId}
              read={m.id <= peerRead}
              selecting={selection !== null}
              selected={!!selection?.includes(m.id)}
              onToggle={() => toggleSelect(m.id)}
              pinned={isPinned(m.id)}
              onReact={(emoji) => void react(m.id, emoji)}
              myId={myId}
              peerLogin={activeUser?.login ?? ''}
              onJump={(id) => void scrollToMessage(id)}
              onMenu={(x, y) => setMenu({ x, y, message: m })}
            />
          </Fragment>
        ))}
      </div>
      {(farFromBottom || detached) && (
        <button
          type='button'
          className={cl.downButton}
          onClick={goDown}
          title={detached ? 'К последним сообщениям' : 'Вниз'}
        >
          {detached ? '⤓' : '↓'}
          {(detached ? missedWhileDetached : unseen) > 0 && (
            <span className={cl.downBadge}>{detached ? missedWhileDetached : unseen}</span>
          )}
        </button>
      )}
      {error && <p className={cl.error}>{error}</p>}
      {notice && <p className={cl.notice}>{notice}</p>}
      {selection ? (
        <div className={cl.selectBar}>
          <span className={cl.selectCount}>Выбрано: {selection.length}</span>
          <span className={cl.spacer} />
          <ButtonUI onClick={() => setForwardIds(selection)}>Переслать</ButtonUI>
          <ButtonUI onClick={() => void copySelected()}>Копировать</ButtonUI>
          <ButtonUI onClick={() => void deleteMessages(selection, false)}>Удалить у меня</ButtonUI>
          {allMineSelected && (
            <ButtonUI
              onClick={() => {
                if (window.confirm(`Удалить выбранные сообщения (${selection.length}) у всех? Это нельзя отменить.`)) {
                  void deleteMessages(selection, true)
                }
              }}
            >
              Удалить у всех
            </ButtonUI>
          )}
          <ButtonUI onClick={clearSelection}>Отмена</ButtonUI>
        </div>
      ) : (
        <Composer key={userId} userId={userId} />
      )}
    </div>
  )
}
