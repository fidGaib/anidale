import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: calibri;
}
.playground {
    background: ${({ theme }) => theme.playground};
}
.input {
    background: ${({ theme }) => theme.input}
}
`
