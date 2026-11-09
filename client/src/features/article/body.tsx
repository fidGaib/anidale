import { articleImageUrl } from '@/entities/article'
import { RichText } from '@/shared/ui/rich-text'

import { StoredBlock } from './model'
import cl from './reader.module.css'

/** Текст статьи: заголовки, абзацы, цитаты, списки и картинки с подписями. Ссылки в тексте кликабельны. */
export const ArticleBody = ({ blocks }: { blocks: StoredBlock[] }) => (
  <div className={cl.body}>
    {blocks.map((block, index) => {
      switch (block.type) {
        case 'h':
          return (
            <h2 key={index} className={cl.h}>
              <RichText text={block.text} />
            </h2>
          )
        case 'quote':
          return (
            <blockquote key={index} className={cl.quote}>
              <RichText text={block.text} />
            </blockquote>
          )
        case 'list':
          return (
            <ul key={index} className={cl.list}>
              {block.items.map((item, i) => (
                <li key={i}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          )
        case 'image':
          return (
            <figure key={index} className={cl.figure}>
              <img src={articleImageUrl(block.src)} alt={block.caption} loading='lazy' />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          )
        default:
          return (
            <p key={index} className={cl.p}>
              <RichText text={block.text} />
            </p>
          )
      }
    })}
  </div>
)
