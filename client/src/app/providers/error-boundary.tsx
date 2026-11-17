import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера и показывает понятный экран вместо белой страницы.
 * Сеть и GraphQL-ошибки сюда не попадают — их обрабатывают страницы и Apollo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // В консоли остаётся стек: по нему видно, какой компонент упал
    console.error('Ошибка интерфейса', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role='alert'
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: 'var(--bodyColor, #fff)',
          color: 'var(--textColor, #222)',
        }}
      >
        <h1 style={{ fontSize: 24 }}>Что-то пошло не так</h1>
        <p style={{ maxWidth: 420, lineHeight: 1.5 }}>
          Страница не смогла загрузиться. Обновите её — если ошибка повторится, попробуйте зайти позже.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type='button'
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'var(--accent, brown)',
              color: '#fff',
              fontSize: 15,
            }}
          >
            Обновить страницу
          </button>
          <a
            href='/'
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid currentColor',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            На главную
          </a>
        </div>
      </div>
    )
  }
}
