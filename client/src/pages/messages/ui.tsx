import { useParams } from 'react-router-dom'

import { Chat, ConversationList } from '@/features/messages'

import cl from './ui.module.css'

export const Messages = () => {
  document.title = 'AniDale - Сообщения'
  const { userId } = useParams()
  const parsed = userId ? parseInt(userId) : NaN
  const activeId = Number.isFinite(parsed) ? parsed : null

  return (
    <div className={cl.page}>
      {/* На узких экранах показываем либо список, либо чат */}
      <div className={`${cl.list} ${activeId !== null ? cl.hideOnMobile : ''}`}>
        <ConversationList activeId={activeId} />
      </div>
      <div className={`${cl.chat} ${activeId === null ? cl.hideOnMobile : ''}`}>
        {activeId !== null ? (
          <Chat userId={activeId} />
        ) : (
          <div className={`playground ${cl.empty}`}>Выберите диалог или откройте профиль и нажмите «Написать»</div>
        )}
      </div>
    </div>
  )
}
