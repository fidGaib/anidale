import { makeExecutableSchema } from '@graphql-tools/schema'
import { Plugin, createYoga } from 'graphql-yoga'

import { validationRules } from './depth-limit'
import { Resolvers } from './resolvers-types'

const resolvers = import.meta.glob('./**/*resolvers.ts', { import: 'default', eager: true })

const schemasRaw = import.meta.glob('./**/*schema.graphql', { eager: true, query: '?raw', import: 'default' })

const executableSchema = makeExecutableSchema({
  typeDefs: Object.values(schemasRaw),
  resolvers: Object.values(resolvers) as Resolvers,
})

const isProduction = process.env.NODE_ENV === 'production'

const depthPlugin: Plugin = {
  onValidate({ addValidationRule }) {
    // В продакшене схему по запросу не выдаём: так чужому труднее изучать API
    for (const rule of validationRules(isProduction)) addValidationRule(rule)
  },
}

export const yoga = createYoga({
  schema: executableSchema,
  // Запросы глубже 10 вложенных полей отклоняются: так нельзя заставить сервер собирать гигантский ответ
  plugins: [depthPlugin],
  graphqlEndpoint: '/graphql',
  // Страница-песочница нужна только при разработке
  graphiql: !isProduction,
  landingPage: !isProduction,
  // CORS задаётся в src/handlers/cors.ts, здесь отключён, чтобы не дублировать заголовки
  cors: false,
  // По умолчанию Yoga режет тело запроса на 25 МБ, а сообщения несут до 100 МБ вложений.
  // Совпадает с client_max_body_size в nginx; точный потолок вложений проверяет MessageController.
  maxRequestBodySize: 110 * 1024 * 1024,
})
