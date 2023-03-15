import Content from '../../shared/content'
import GetUsers from '../../shared/graphql/query/user/findAll'

const Friends = () => {
  return (
    <Content>
      <GetUsers />
    </Content>
  )
}

export default Friends
