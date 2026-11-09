import { Link } from 'react-router-dom'

import { storageUrl } from '@/shared/config'

import cl from './ui.module.css'

export interface ArticleCardData {
  id: number
  title: string
  cover: string
  excerpt: string
}

/** Адрес картинки статьи (обложка или картинка в тексте): в базе лежит путь без расширения. */
export const articleImageUrl = (path: string) => (path ? storageUrl(`${path}.webp`) : '')

/** Карточка статьи вместо обычного содержимого поста: обложка, название, начало и ссылка «Читать». */
export const ArticleCard = ({ article }: { article: ArticleCardData }) => (
  <Link to={`/article/${article.id}`} className={cl.card}>
    {article.cover && <img className={cl.cover} src={articleImageUrl(article.cover)} alt='' loading='lazy' />}
    <div className={cl.body}>
      <span className={cl.label}>Статья</span>
      <h3 className={cl.title}>{article.title}</h3>
      {article.excerpt && <p className={cl.excerpt}>{article.excerpt}</p>}
      <span className={cl.read}>Читать статью →</span>
    </div>
  </Link>
)
