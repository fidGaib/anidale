import { NoSchemaIntrospectionCustomRule, ValidationRule } from 'graphql'
import {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLError,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  ValidationContext,
} from 'graphql'

/** Служебные поля интроспекции в глубину запроса не считаются: их запросы устроены глубоко сами по себе. */
const isIntrospection = (name: string) => name.startsWith('__')

/** Глубина набора полей с учётом фрагментов. Циклы фрагментов отсекаются (их ловит отдельное правило GraphQL). */
export const selectionDepth = (
  selectionSet: SelectionSetNode | undefined,
  fragments: Map<string, FragmentDefinitionNode>,
  seen: string[] = [],
): number => {
  if (!selectionSet) return 0
  let deepest = 0
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (isIntrospection(selection.name.value)) continue
      deepest = Math.max(deepest, 1 + selectionDepth(selection.selectionSet, fragments, seen))
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      deepest = Math.max(deepest, selectionDepth(selection.selectionSet, fragments, seen))
    } else {
      const name = selection.name.value
      const fragment = fragments.get(name)
      if (fragment && !seen.includes(name)) {
        deepest = Math.max(deepest, selectionDepth(fragment.selectionSet, fragments, [...seen, name]))
      }
    }
  }
  return deepest
}

/**
 * Правило валидации: запрос глубже `max` вложенных полей отклоняется.
 * Защищает от запросов вида «пользователь → друзья → друзья → …», которые заставляют сервер собирать огромные ответы.
 */
export const depthLimit = (max: number) => (context: ValidationContext) => ({
  Document(document: DocumentNode) {
    const fragments = new Map<string, FragmentDefinitionNode>()
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments.set(definition.name.value, definition)
    }
    for (const definition of document.definitions) {
      if (definition.kind !== Kind.OPERATION_DEFINITION) continue
      const operation: OperationDefinitionNode = definition
      const depth = selectionDepth(operation.selectionSet, fragments)
      if (depth > max) {
        context.reportError(new GraphQLError(`Запрос слишком глубокий: ${depth} уровней, допустимо не больше ${max}`))
      }
    }
  },
})

/** Правила проверки запросов: глубина всегда, а в продакшене ещё и запрет на интроспекцию схемы. */
export const validationRules = (production: boolean): ValidationRule[] => [
  depthLimit(10) as ValidationRule,
  ...(production ? [NoSchemaIntrospectionCustomRule] : []),
]
