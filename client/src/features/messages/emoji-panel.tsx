import { useEffect, useRef, useState } from 'react'

import cl from './ui.module.css'

/** Небольшой набор эмодзи по категориям: панель без внешних пакетов. */
const CATEGORIES: { icon: string; title: string; items: string[] }[] = [
  {
    icon: '😀',
    title: 'Смайлы',
    items: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖'.split(' '),
  },
  {
    icon: '👍',
    title: 'Жесты',
    items: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤝 🙏 ✍️ 💪 👏 🙌 👐 🤲 🫶 🫡 🤌 🤏 🖕 ✊ 👊 🤛 🤜'.split(' '),
  },
  {
    icon: '❤️',
    title: 'Сердца',
    items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💋 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊'.split(' '),
  },
  {
    icon: '🐱',
    title: 'Животные',
    items: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦆 🦉 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🐬 🐳 🦈 🐘 🦒'.split(' '),
  },
  {
    icon: '🍕',
    title: 'Еда',
    items: '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥕 🌽 🍞 🧀 🍳 🥞 🥓 🍔 🍟 🍕 🌭 🌮 🍣 🍜 🍝 🍰 🎂 🍩 🍪 🍫 🍬 🍭 ☕ 🍵 🍺 🍷 🥂'.split(' '),
  },
  {
    icon: '⚽',
    title: 'Разное',
    items: '⚽ 🏀 🏈 🎾 🏐 🎱 🎮 🎲 🎯 🎵 🎶 🎤 🎧 🎸 🎹 🎬 📷 📱 💻 ⌚ 💡 📚 ✏️ 📌 🔒 🔑 🎁 🏆 🚗 ✈️ 🚀 🌍 ⛅ ☀️ 🌙 🌈 ❄️ 🌸 🌹 🍀 ✅ ❌ ❓ ❗'.split(' '),
  },
]

interface Props {
  onPick: (emoji: string) => void
  onClose: () => void
}

/** Выпадающая панель эмодзи над полем ввода. Закрывается кликом снаружи и Escape. */
export const EmojiPanel = ({ onPick, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [category, setCategory] = useState(0)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className={`playground ${cl.emojiPanel}`}>
      <div className={cl.emojiTabs}>
        {CATEGORIES.map((c, index) => (
          <button
            key={c.title}
            type='button'
            title={c.title}
            className={`${cl.emojiTab} ${index === category ? cl.emojiTabActive : ''}`}
            onClick={() => setCategory(index)}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className={cl.emojiGrid}>
        {CATEGORIES[category].items.map((emoji) => (
          <button key={emoji} type='button' className={cl.emojiItem} onClick={() => onPick(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
