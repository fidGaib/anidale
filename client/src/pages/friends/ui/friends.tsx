import Content from '@/shared/content'
import GetUsers from '@/shared/graphql/query/user/findAll'

export const Friends = () => {
  return (
    <Content>
      <GetUsers />
    </Content>
  )
}
