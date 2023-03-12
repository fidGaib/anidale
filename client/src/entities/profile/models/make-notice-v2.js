import axios from 'axios'
import { makeAutoObservable } from 'mobx'

class MakeNoticeController {
  textarea = ''
  error = ''
  images = []
  user_id
  url = 'http://localhost:5000/api/notice'
  flagSend = false
  constructor() {
    makeAutoObservable(this)
  }
  setTextarea(value) {
    this.textarea = value
    this.setError(`${this.textarea.length}/255`)
    if (!this.textarea) this.setError('')
  }
  setError(value) {
    this.error = value
  }
  setImages(object) {
    this.images.push(object)
  }
  delImages(img) {
    const arr = this.images.filter((e) => e !== img)
    this.images = []
    arr.forEach((child) => {
      this.setImages(child)
    })
  }
  async validateImages(file) {
    let re = /(\.jpg|\.jpeg|\.gif|\.png)$/i
    let size = file.size / 1024 / 1024
    let maxSize = 5
    if (!re.exec(file.name)) {
      this.setError('Загружать можно только арты.')
      return 0
    } else if (size > maxSize) {
      this.setError(`Размер изображения не должен привышать ${maxSize}мб`)
      return 0
    } else return 1
  }
  async addFiles(event) {
    let files = Array.from(event)
    if (files.length + this.images.length <= 9) {
      files.map(async (file) => {
        await this.validateImages(file).then(async (validate) => {
          if (validate) {
            this.setImages(file)
            return 1
          } else return 0
        })
      })
    } else {
      let empty = 9 - this.images.length
      let delCount = files.length - empty
      let newArrFiles = files.map((child) => {
        return child
      })
      for (let i = 0; i < delCount; i++) {
        newArrFiles.pop()
      }
      this.addFiles(newArrFiles)
      this.setError(`Последние ${delCount} файла не будут загружены, ограничение 9`)
    }
  }
  async validateTextarea() {
    if (makeNoticeController.images.length === 0 && !makeNoticeController.textarea.trim()) {
      return 0
    } else if (this.textarea.length > 255) {
      this.setError('Ограничение текста 255 символов')
      return 0
    } else return 1
  }
  async sendNotice() {
    if (makeNoticeController.flagSend) return
    makeNoticeController.flagSend = true
    const validate = await makeNoticeController.validateTextarea()
    if (validate) {
      try {
        makeNoticeController.setError('')
        const formData = new FormData()
        formData.append('user_id', makeNoticeController.user_id)
        formData.append('description', makeNoticeController.textarea)
        makeNoticeController.images.forEach((image) => {
          formData.append('likeness', image)
        })
        if (!makeNoticeController.error) {
          await axios({
            method: 'post',
            url: `${makeNoticeController.url}/create`,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          }).then((res) => {
            if (!res.data.error) {
              makeNoticeController.images = []
              makeNoticeController.textarea = ''
            } else makeNoticeController.error = res.data.error
            makeNoticeController.flagSend = false
          })
        } else return 0
      } catch (e) {
        makeNoticeController.setError(e?.response?.data?.message)
        console.log(e)
      }
    } else return 0
  }
}
export const makeNoticeController = new MakeNoticeController()
