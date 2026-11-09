import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { copyText } from '@/shared/lib/clipboard'
import ButtonUI from '@/shared/ui/button'
import { Dialog } from '@/shared/ui/dialog'
import Dropdown from '@/shared/ui/dropdown'

import { REPORT_REASONS, postActions } from './post-actions'
import { postLink } from './post-link'
import cl from './ui.module.css'

const MAX_DESCRIPTION = 2000

/** Данные поста, нужные меню. */
export interface MenuPost {
  id: number
  ownerId: number
  description: string
  pinned: boolean
  archived: boolean
  bookmarked: boolean
  /** Пост — статья: правится в редакторе статей, а не текстом. */
  articleId?: number
  /** Просматривающий управляет записью как администратор сообщества. */
  canManage?: boolean
}

const EditDialog = ({ post, onClose }: { post: MenuPost; onClose: () => void }) => {
  const [text, setText] = useState(post.description)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true)
    const result = await postActions.edit(post.id, text)
    setBusy(false)
    if (result.ok) onClose()
    else setError(result.error)
  }
  return (
    <Dialog title='Редактирование поста' onClose={onClose}>
      <textarea
        autoFocus
        className={cl.dialogText}
        value={text}
        maxLength={MAX_DESCRIPTION}
        rows={6}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className={cl.dialogError}>{error}</p>}
      <div className={cl.dialogButtons}>
        <ButtonUI disabled={busy} onClick={() => void save()}>
          Сохранить
        </ButtonUI>
        <ButtonUI disabled={busy} onClick={onClose}>
          Отмена
        </ButtonUI>
      </div>
    </Dialog>
  )
}

const ReportDialog = ({ post, onClose }: { post: MenuPost; onClose: () => void }) => {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const send = async () => {
    setBusy(true)
    const result = await postActions.report(post.id, reason)
    setBusy(false)
    if (result.ok) setSent(true)
    else setError(result.error)
  }
  return (
    <Dialog title='Пожаловаться на пост' onClose={onClose}>
      {sent ? (
        <>
          <p className={cl.dialogHint}>Спасибо, жалоба отправлена.</p>
          <div className={cl.dialogButtons}>
            <ButtonUI onClick={onClose}>Закрыть</ButtonUI>
          </div>
        </>
      ) : (
        <>
          {REPORT_REASONS.map((r) => (
            <label key={r.key} className={cl.reason}>
              <input type='radio' name='report' checked={reason === r.key} onChange={() => setReason(r.key)} />
              {r.title}
            </label>
          ))}
          {error && <p className={cl.dialogError}>{error}</p>}
          <div className={cl.dialogButtons}>
            <ButtonUI disabled={!reason || busy} onClick={() => void send()}>
              Отправить
            </ButtonUI>
            <ButtonUI disabled={busy} onClick={onClose}>
              Отмена
            </ButtonUI>
          </div>
        </>
      )}
    </Dialog>
  )
}

/** Меню «⋯» поста, как в ВК: свои посты — править, закрепить, архив, удалить; чужие — закладки и жалоба. */
export const PostMenu = ({ post, onRemoved }: { post: MenuPost; onRemoved?: () => void }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'edit' | 'report' | null>(null)
  const [error, setError] = useState('')
  const mine = (myId > 0 && myId === post.ownerId) || !!post.canManage
  const close = () => setDialog(null)

  const act = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
    const result = await action()
    if (!result.ok) {
      setError(result.error ?? 'Не удалось выполнить действие')
      setTimeout(() => setError(''), 4000)
    }
    return result.ok
  }

  return (
    <>
      <Dropdown className={cl.menuWrap}>
        <Dropdown.Header>
          <ImageLoading className={cl.menuIcon} src={assetUrl('icons/menu_post.svg')} />
        </Dropdown.Header>
        <Dropdown.Body className={cl.wrapBody}>
          {mine && (
            <li onClick={() => (post.articleId ? navigate(`/article/${post.articleId}/edit`) : setDialog('edit'))}>
              {' '}
              <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/edit.svg')} />
              Редактировать
            </li>
          )}
          {mine && !post.archived && (
            <li onClick={() => void act(() => postActions.pin(post.id, !post.pinned))}>
              {post.pinned ? (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/unpin.svg')} />
                  Открепить от страницы
                </>
              ) : (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/pin.svg')} /> Закрепить на странице
                </>
              )}
            </li>
          )}
          {mine && (
            <li onClick={() => void act(() => postActions.archive(post.id, !post.archived))}>
              {post.archived ? (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/unarchive.svg')} /> Убрать из архива
                </>
              ) : (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/archive.svg')} /> Архивировать запись
                </>
              )}
            </li>
          )}
          {myId > 0 && (
            <li onClick={() => void act(() => postActions.bookmark(post.id, !post.bookmarked))}>
              {post.bookmarked ? (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/remove-bookmark.svg')} /> Убрать из
                  закладок
                </>
              ) : (
                <>
                  <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/bookmark.svg')} /> Сохранить в закладках
                </>
              )}
            </li>
          )}
          <li onClick={() => void copyText(postLink(post.id))}>
            <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/copy (2).svg')} />
            Скопировать ссылку
          </li>
          {myId > 0 && !mine && <li onClick={() => setDialog('report')}>Пожаловаться</li>}
          {mine && (
            <li
              onClick={() => {
                if (!window.confirm('Удалить пост? Это нельзя отменить.')) return
                void act(() => postActions.remove(post.id)).then((ok) => ok && onRemoved?.())
              }}
            >
              <ImageLoading className={cl.dropIcon} src={assetUrl('/icons/delete.svg')} />
              Удалить
            </li>
          )}
        </Dropdown.Body>
      </Dropdown>
      {error && <p className={cl.menuError}>{error}</p>}
      {dialog === 'edit' && <EditDialog post={post} onClose={close} />}
      {dialog === 'report' && <ReportDialog post={post} onClose={close} />}
    </>
  )
}
