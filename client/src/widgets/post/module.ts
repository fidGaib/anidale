// export const scrollHandler = ({ fetching, hasMore, fetchMore, limit, posts, setHasMore, id }: any) => {
//   if (!fetching.current && hasMore) {
//     fetching.current = true
//     fetchMore({
//       variables: { limit, page: posts.length },
//       updateQuery: (prev: any, { fetchMoreResult }: any) => {
//         fetching.current = false
//         if (!fetchMoreResult) {
//           setHasMore(false)
//           return prev
//         }
//         if (id) {
//           return {
//             ...prev,
//             getPostsByUser: [...prev.getPostsByUser, ...fetchMoreResult.getPostsByUser],
//           }
//         }
//         return {
//           ...prev,
//           getPosts: [...prev.getPosts, ...fetchMoreResult.getPosts],
//         }
//       },
//     })
//   }
// }
