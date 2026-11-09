import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { Track, useMusicStore } from '@/features/music/module'
import { storageUrl } from '@/shared/config'
import { openPhotos } from '@/shared/lib/photo-viewer'
import { formatDateTime, formatFileSize } from '@/shared/lib/time'
import { RichText } from '@/shared/ui/rich-text'

import { LONG_PRESS_MS, replyLabel } from './helpers'
import { Attachment, ChatMessage, Reaction, useMessagesStore } from './module'
import cl from './ui.module.css'

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

export const MessageBubble = ({
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
