export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JWT_ACCESS_SECRET: string
      JWT_REFRESH_SECRET: string
    }
  }
}
