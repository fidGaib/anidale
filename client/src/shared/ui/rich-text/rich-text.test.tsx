import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText } from './index'

const html = (text: string) => renderToStaticMarkup(<RichText text={text} />)

describe('RichText: ссылки в тексте', () => {
  it('обычный текст остаётся текстом', () => {
    expect(html('просто текст')).toBe('просто текст')
  })

  it('http(s)-ссылка становится ссылкой, открывается в новой вкладке и без передачи referrer', () => {
    const out = html('смотри https://example.com/path?x=1 здесь')
    expect(out).toContain('<a href="https://example.com/path?x=1"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer nofollow"')
    expect(out.startsWith('смотри ')).toBe(true)
    expect(out.endsWith(' здесь')).toBe(true)
  })

  it('адрес вида www. получает https', () => {
    expect(html('www.example.com')).toContain('href="https://www.example.com"')
  })

  it('знаки препинания в конце не входят в ссылку', () => {
    const out = html('Заходи на https://example.com.')
    expect(out).toContain('href="https://example.com"')
    expect(out.endsWith('</a>.')).toBe(true)
    expect(html('(https://example.com)')).toContain('href="https://example.com"')
  })

  it('несколько ссылок в одном тексте', () => {
    const out = html('https://a.com и https://b.com')
    expect(out.match(/<a /g)).toHaveLength(2)
  })

  it('опасные схемы не становятся ссылками', () => {
    expect(html('javascript:alert(1)')).not.toContain('<a')
    expect(html('data:text/html,<script>1</script>')).not.toContain('<a')
    expect(html('ftp://example.com')).not.toContain('<a')
  })

  it('разметка в тексте экранируется', () => {
    const out = html('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })
})
