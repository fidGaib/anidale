import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { articleImageUrl } from '@/entities/article'
import { CREATE_ARTICLE, EDIT_ARTICLE, GET_ARTICLE } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { UploadProgress } from '@/shared/ui/progress'

import { EditorBlockView } from './editor-block'
import cl from './editor.module.css'
import {
  EditorBlock,
  MAX_TITLE,
  TextType,
  emptyBlock,
  fromStored,
  hasContent,
  insertAfter,
  moveBlock,
  nextId,
  removeBlock,
  serializeArticle,
  updateBlock,
  validateImage,
} from './model'

const INSERT_OPTIONS: { type: TextType | 'image'; label: string }[] = [
  { type: 'p', label: 'Текст' },
  { type: 'h', label: 'Заголовок' },
  { type: 'quote', label: 'Цитата' },
  { type: 'list', label: 'Список' },
  { type: 'image', label: 'Фото' },
]

interface Cover {
  file?: File
  preview: string
}

/** Редактор статьи на весь экран: создание (`/article/new`) и правка (`/article/:id/edit`). */
export const ArticleEditor = () => {
  const articleId = parseInt(useParams().id || '') || null
  const navigate = useNavigate()
  // /article/new?community=ID — статья на стене сообщества (нужны права администратора)
  const communityId = parseInt(useSearchParams()[0].get('community') || '') || undefined
  const me = useRefreshStore((s) => s.refreshData)
  const avatar = useSrcAvatar(me.avatar || '')

  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<EditorBlock[]>([emptyBlock([])])
  const [cover, setCover] = useState<Cover | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [error, setError] = useState('')
  const [percent, setPercent] = useState<number | null>(null)
  // Блок, после которого открыто меню «＋», и блок, на который нужно перевести фокус
  const [menuAfter, setMenuAfter] = useState<number | null | undefined>(undefined)
  const [focusId, setFocusId] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const fields = useRef<Record<number, HTMLTextAreaElement | null>>({})
  const photoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const insertAfterId = useRef<number | null>(null)
  const loaded = useRef(false)

  const [createArticle, createState] = useMutation(CREATE_ARTICLE)
  const [editArticle, editState] = useMutation(EDIT_ARTICLE)
  const saving = createState.loading || editState.loading

  const existing = useQuery(GET_ARTICLE, {
    variables: { id: articleId ?? 0 },
    skip: !articleId,
    fetchPolicy: 'network-only',
  })

  // Правка: один раз подставляем сохранённую статью, чтобы повторный запрос не затёр набранное
  useEffect(() => {
    const article = existing.data?.getArticle
    if (!article || loaded.current) return
    loaded.current = true
    setTitle(article.title)
    const restored = fromStored(article.content, articleImageUrl)
    setBlocks(restored.length ? restored : [emptyBlock([])])
    if (article.cover) setCover({ preview: articleImageUrl(article.cover) })
  }, [existing.data])

  useEffect(() => {
    if (focusId === null) return
    fields.current[focusId]?.focus()
    setFocusId(null)
  }, [focusId, blocks])

  // Закрытие вкладки с несохранённым текстом
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const edit = <T,>(setter: (value: T) => void, value: T) => {
    setDirty(true)
    setter(value)
  }

  const add = (after: number | null, type: TextType | 'image') => {
    setMenuAfter(undefined)
    if (type === 'image') {
      insertAfterId.current = after
      photoInput.current?.click()
      return
    }
    const block = emptyBlock(blocks, type)
    edit(setBlocks, insertAfter(blocks, after, block))
    setFocusId(block.id)
  }

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return
    let next = blocks
    let after = insertAfterId.current
    const problems: string[] = []
    for (const file of Array.from(files)) {
      const problem = validateImage(file)
      if (problem) {
        problems.push(problem)
        continue
      }
      const block: EditorBlock = {
        id: nextId(next),
        type: 'image',
        caption: '',
        file,
        preview: URL.createObjectURL(file),
      }
      next = insertAfter(next, after, block)
      after = block.id
    }
    setError(problems.join('\n'))
    edit(setBlocks, next)
  }

  const pickCover = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const problem = validateImage(file)
    if (problem) return setError(problem)
    setError('')
    setDirty(true)
    setCover({ file, preview: URL.createObjectURL(file) })
    setCoverRemoved(false)
  }

  const removeCover = () => {
    setDirty(true)
    setCover(null)
    setCoverRemoved(true)
  }

  const close = () => {
    if (dirty && hasContent(blocks) && !window.confirm('Закрыть редактор? Несохранённые изменения пропадут.')) return
    navigate(articleId ? `/article/${articleId}` : communityId ? `/community/${communityId}` : `/profile/${me.id}`)
  }

  const publish = async () => {
    setError('')
    if (!title.trim()) return setError('Введите заголовок статьи')
    if (!hasContent(blocks)) return setError('Напишите хоть что-нибудь')
    const { content, images } = serializeArticle(blocks)
    const context = {
      fetchOptions: { onProgress: (event: UploadProgressEvent) => setPercent(toPercent(event)) },
    }
    try {
      setPercent(0)
      setDirty(false)
      if (articleId) {
        await editArticle({
          variables: {
            article: { id: articleId, title, content, images, cover: cover?.file, removeCover: coverRemoved },
          },
          context,
        })
        navigate(`/article/${articleId}`)
      } else {
        const result = await createArticle({
          variables: { article: { title, content, images, cover: cover?.file, communityId } },
          context,
        })
        const id = result.data?.createArticle?.article?.id
        navigate(id ? `/article/${id}` : communityId ? `/community/${communityId}` : `/profile/${me.id}`)
      }
    } catch (e) {
      setDirty(true)
      setError(e instanceof Error ? e.message : 'Не удалось сохранить статью')
    } finally {
      setPercent(null)
    }
  }

  if (articleId && existing.loading && !loaded.current) return <div className={`playground ${cl.page}`}>Загрузка…</div>
  if (articleId && !existing.loading && !existing.data?.getArticle) {
    return <div className={`playground ${cl.page}`}>{existing.error?.message || 'Статья не найдена'}</div>
  }

  const insertMenu = (after: number | null) => (
    <div className={cl.insert}>
      {menuAfter === after ? (
        <div className={cl.insertOptions}>
          {INSERT_OPTIONS.map((option) => (
            <button key={option.type} type='button' onClick={() => add(after, option.type)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <button type='button' className={cl.plus} title='Добавить блок' onClick={() => setMenuAfter(after)}>
          ＋
        </button>
      )}
    </div>
  )

  return (
    <div className={`playground ${cl.page}`}>
      <header className={cl.bar}>
        <div className={cl.who}>
          <img className={cl.avatar} src={avatar} alt='' />
          <div>
            <div className={cl.name}>{me.login}</div>
            <div className={cl.sub}>
              {articleId ? 'Редактирование статьи' : communityId ? 'Новая статья сообщества' : 'Новая статья'}
            </div>
          </div>
        </div>
        <div className={cl.barActions}>
          <button type='button' className={cl.publish} disabled={saving} onClick={() => void publish()}>
            {saving ? 'Сохранение…' : articleId ? 'Сохранить' : 'Опубликовать'}
          </button>
          <button type='button' className={cl.close} aria-label='Закрыть' disabled={saving} onClick={close}>
            ×
          </button>
        </div>
      </header>

      <main className={cl.main}>
        {percent !== null && <UploadProgress percent={percent} label='Сохранение статьи' />}
        {error && <p className={cl.error}>{error}</p>}

        {cover ? (
          <div className={cl.coverWrap}>
            <img src={cover.preview} alt='' />
            <div className={cl.coverButtons}>
              <button type='button' onClick={() => coverInput.current?.click()}>
                Заменить
              </button>
              <button type='button' onClick={removeCover}>
                Убрать
              </button>
            </div>
          </div>
        ) : (
          <button type='button' className={cl.addCover} onClick={() => coverInput.current?.click()}>
            ＋ Добавить обложку
          </button>
        )}

        <input
          className={cl.title}
          value={title}
          maxLength={MAX_TITLE}
          placeholder='Хотите что-то написать?'
          onChange={(e) => edit(setTitle, e.target.value)}
        />

        {insertMenu(null)}
        {blocks.map((block, index) => (
          <div key={block.id}>
            <EditorBlockView
              block={block}
              first={index === 0}
              last={index === blocks.length - 1}
              fieldRefs={fields}
              onChange={(patch) => edit(setBlocks, updateBlock(blocks, block.id, patch))}
              onRemove={() => edit(setBlocks, removeBlock(blocks, block.id))}
              onMove={(delta) => edit(setBlocks, moveBlock(blocks, block.id, delta))}
              onEnter={() => add(block.id, 'p')}
              onBackspaceEmpty={() => {
                if (blocks.length <= 1) return
                const before = blocks[index - 1] ?? blocks[index + 1]
                edit(setBlocks, removeBlock(blocks, block.id))
                if (before) setFocusId(before.id)
              }}
            />
            {insertMenu(block.id)}
          </div>
        ))}
      </main>

      <input
        ref={photoInput}
        type='file'
        accept='image/*'
        multiple
        hidden
        onChange={(e) => {
          addPhotos(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={coverInput}
        type='file'
        accept='image/*'
        hidden
        onChange={(e) => {
          pickCover(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
