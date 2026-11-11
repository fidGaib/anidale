import 'styled-components'

// Тема сайта: новые версии styled-components не угадывают её поля, поэтому описываем их здесь
declare module 'styled-components' {
  export interface DefaultTheme {
    body: string
    text: string
    playground: string
    input: string
  }
}
