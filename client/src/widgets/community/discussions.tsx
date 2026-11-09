import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import {
  ADD_DISCUSSION_MESSAGE,
  CREATE_DISCUSSION_TOPIC,
  DISCUSSION_MESSAGES,
  DISCUSSION_TOPIC,
  DISCUSSION_TOPICS,
  REMOVE_DISCUSSION_MESSAGE,
  REMOVE_DISCUSSION_TOPIC,
  SET_DISCUSSION_TOPIC_FLAGS,
} from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { Btn } from '@/shared/ui/btn'
import { DeleteIcon } from '@/shared/ui/delete-icon'
import { Dialog } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Empty, FormError, Hint } from '@/shared/ui/notice'
import { RichText } from '@/shared/ui/rich-text'

import cl from './discussions.module.css'

const TOPICS_PAGE = 30
const MESSAGES_PAGE = 50

interface Props {
  communityId: number
  canModerate: boolean
  /** Участник может создавать темы и писать. */
  canWrite: boolean
}

const Avatar = ({ avatar }: { avatar?: string | null }) => (
  <img className={cl.avatar} src={useSrcAvatar(avatar || '')} alt='' />
)

const NewTopicDialog = ({
  communityId,
  onClose,
  onCreated,
}: {
  communityId: number
  onClose: () => void
  onCreated: (id: number) => void
}) => {
  const [create, { loading, error }] = useMutation(CREATE_DISCUSSION_TOPIC)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  const submit = async () => {
    if (!title.trim() || !text.trim() || loading) return
    try {
      const res = await create({ variables: { id: communityId, title, text } })
      onCreated(res.data?.createDiscussionTopic.id ?? 0)
    } catch {
      // Текст ошибки показывает состояние мутации
    }
  }

  return (
    <Dialog
      title='Новая тема'
      width={480}
      busy={loading}
      onClose={onClose}
      footer={
        <>
          <Hint>Тему увидят все участники</Hint>
          <Btn variant='primary' disabled={!title.trim() || !text.trim() || loading} onClick={() => void submit()}>
            {loading ? 'Создание…' : 'Создать'}
          </Btn>
        </>
      }
    >
      <Field label='Название' value={title} maxLength={120} autoFocus onChange={(e) => setTitle(e.target.value)} />
      <Field.Area
        label='Первое сообщение'
        value={text}
        maxLength={3000}
        rows={5}
        onChange={(e) => setText(e.target.value)}
      />
      <FormError>{error?.message}</FormError>
    </Dialog>
  )
}

/** Одна тема: сообщения, ответ, удаление, закрепление и закрытие (администратор). */
const Topic = ({
  topicId,
  canModerate,
  canWrite,
  onBack,
}: {
  topicId: number
  canModerate: boolean
  canWrite: boolean
  onBack: () => void
}) => {
  const me = useRefreshStore((s) => s.refreshData.id) ?? 0
  const topicQuery = useQuery(DISCUSSION_TOPIC, { variables: { topicId }, fetchPolicy: 'network-only' })
  const { data, loading, error, fetchMore, refetch } = useQuery(DISCUSSION_MESSAGES, {
    variables: { topicId, limit: MESSAGES_PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [add, addState] = useMutation(ADD_DISCUSSION_MESSAGE)
  const [removeMessage] = useMutation(REMOVE_DISCUSSION_MESSAGE)
  const [removeTopic] = useMutation(REMOVE_DISCUSSION_TOPIC)
  const [setFlags] = useMutation(SET_DISCUSSION_TOPIC_FLAGS)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const topic = topicQuery.data?.getDiscussionTopic
  const messages = data?.getDiscussionMessages ?? []

  if (topicQuery.loading && !topic) return <Empty>Загрузка…</Empty>
  if (!topic) return <Empty>Тема не найдена</Empty>

  const canReply = canWrite && (!topic.closed || canModerate)
  const canDelete = canModerate || topic.author.id === me

  const send = async () => {
    if (!text.trim() || addState.loading) return
    try {
      await add({ variables: { topicId, text } })
      setText('')
      await refetch()
    } catch {
      // Текст ошибки показывает состояние мутации
    }
  }

  const flag = async (patch: { pinned?: boolean; closed?: boolean }) => {
    await setFlags({ variables: { topicId, ...patch } })
    await topicQuery.refetch()
  }

  return (
    <div className={`playground ${cl.wrap}`}>
      <div className={cl.head}>
        <Btn variant='ghost' onClick={onBack}>
          ← К темам
        </Btn>
        <div className={cl.headActions}>
          {canModerate && (
            <>
              <Btn variant='secondary' onClick={() => void flag({ pinned: !topic.pinned })}>
                {topic.pinned ? 'Открепить' : 'Закрепить'}
              </Btn>
              <Btn variant='secondary' onClick={() => void flag({ closed: !topic.closed })}>
                {topic.closed ? 'Открыть' : 'Закрыть'}
              </Btn>
            </>
          )}
          {canDelete && (
            <Btn
              variant='danger'
              onClick={async () => {
                if (!window.confirm('Удалить тему со всеми сообщениями?')) return
                await removeTopic({ variables: { topicId } })
                onBack()
              }}
            >
              Удалить тему
            </Btn>
          )}
        </div>
      </div>
      <h3 className={cl.title}>
        {topic.pinned && '📌 '}
        {topic.closed && '🔒 '}
        {topic.title}
      </h3>

      <FormError>{error?.message}</FormError>
      {!loading && messages.length === 0 && <Empty>Сообщений пока нет</Empty>}
      {messages.map((message) => (
        <div key={message.id} className={cl.message}>
          <Avatar avatar={message.author.avatar} />
          <div className={cl.body}>
            <div className={cl.meta}>
              <Link to={`/profile/${message.author.id}`}>{message.author.login}</Link>
              <span>{formatDateTime(toTimestamp(message.date))}</span>
              {(canModerate || message.author.id === me) && (
                <button
                  type='button'
                  className={cl.remove}
                  title='Удалить сообщение'
                  onClick={async () => {
                    await removeMessage({ variables: { messageId: message.id } })
                    await refetch()
                  }}
                >
                  <DeleteIcon />
                </button>
              )}
            </div>
            <p className={cl.text}>
              <RichText text={message.text} />
            </p>
          </div>
        </div>
      ))}
      {messages.length >= MESSAGES_PAGE && !done && (
        <Btn
          onClick={async () => {
            const res = await fetchMore({ variables: { offset: messages.length } })
            if ((res.data?.getDiscussionMessages?.length ?? 0) < MESSAGES_PAGE) setDone(true)
          }}
        >
          Показать ещё
        </Btn>
      )}

      {canReply ? (
        <div className={cl.reply}>
          <Field.Area
            label='Ваш ответ'
            value={text}
            maxLength={3000}
            rows={3}
            onChange={(e) => setText(e.target.value)}
          />
          <FormError>{addState.error?.message}</FormError>
          <Btn variant='primary' disabled={!text.trim() || addState.loading} onClick={() => void send()}>
            {addState.loading ? 'Отправка…' : 'Отправить'}
          </Btn>
        </div>
      ) : (
        <Hint>{topic.closed ? 'Тема закрыта' : 'Писать могут только участники сообщества'}</Hint>
      )}
    </div>
  )
}

/** Вкладка «Обсуждения»: список тем и просмотр выбранной темы. */
export const Discussions = ({ communityId, canModerate, canWrite }: Props) => {
  const [topicId, setTopicId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, loading, error, fetchMore, refetch } = useQuery(DISCUSSION_TOPICS, {
    variables: { id: communityId, limit: TOPICS_PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [done, setDone] = useState(false)
  const topics = data?.getDiscussionTopics ?? []

  if (topicId !== null) {
    return (
      <Topic
        topicId={topicId}
        canModerate={canModerate}
        canWrite={canWrite}
        onBack={() => {
          setTopicId(null)
          void refetch()
        }}
      />
    )
  }

  return (
    <div className={`playground ${cl.wrap}`}>
      {canWrite && (
        <div className={cl.head}>
          <Btn variant='primary' onClick={() => setCreating(true)}>
            ＋ Новая тема
          </Btn>
        </div>
      )}
      <FormError>{error?.message}</FormError>
      {!loading && topics.length === 0 && <Empty>Обсуждений пока нет</Empty>}
      {topics.map((topic) => (
        <button key={topic.id} type='button' className={cl.topic} onClick={() => setTopicId(topic.id)}>
          <Avatar avatar={topic.author.avatar} />
          <span className={cl.topicText}>
            <span className={cl.topicTitle}>
              {topic.pinned && '📌 '}
              {topic.closed && '🔒 '}
              {topic.title}
            </span>
            <span className={cl.topicSub}>{topic.lastText}</span>
          </span>
          <span className={cl.topicCount}>{topic.messagesCount}</span>
        </button>
      ))}
      {topics.length >= TOPICS_PAGE && !done && (
        <Btn
          onClick={async () => {
            const res = await fetchMore({ variables: { offset: topics.length } })
            if ((res.data?.getDiscussionTopics?.length ?? 0) < TOPICS_PAGE) setDone(true)
          }}
        >
          Показать ещё
        </Btn>
      )}
      {creating && (
        <NewTopicDialog
          communityId={communityId}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setTopicId(id)
          }}
        />
      )}
    </div>
  )
}
