import axios from 'axios'

class NoticeService {
  async fetchAll(limit, page) {
    const { data } = await axios.get(`http://localhost:5000/api/notice/fetch-all/?limit=${limit}&page=${page}`)
    return data
  }
  async fetchByUser(id, limit, page) {
    const { data } = await axios.get(
      `http://localhost:5000/api/notice/fetch-chunk/?id=${id}&limit=${limit}&page=${page}`,
    )
    return data
  }
  async remove(norice_id, user_id) {
    const { data } = await axios.post(`http://localhost:5000/api/notice/remove`, {
      norice_id,
      user_id,
    })
    return data
  }
}
export const noticeService = new NoticeService()
