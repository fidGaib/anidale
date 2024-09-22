import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: calibri;
    transition: all 0.50s linear;
}
.playground {
    background: ${({ theme }) => theme.playground};
}
`
