import { makeAutoObservable } from 'mobx'

class ProfileController {
  meshBlock
  changeActive = ['active', '', '', '', '', '']
  changeID = 0
  pageID
  constructor() {
    makeAutoObservable(this)
    this.meshBlock = [
      {
        meshId: 0,
        icon: 'feed',
        name: 'Ноты',
        active: '',
      },
      {
        meshId: 1,
        icon: 'art',
        name: 'Арты',
        active: '',
      },
      {
        meshId: 2,
        icon: 'video',
        name: 'Видео',
        active: '',
      },
      {
        meshId: 3,
        icon: 'music',
        name: 'Музыка',
        active: '',
      },
      {
        meshId: 4,
        icon: 'friends',
        name: 'Друзья',
        active: '',
      },
      {
        meshId: 5,
        icon: 'groups',
        name: 'Сообщества',
        active: '',
      },
    ]
  }
  handleMesh = (id) => {
    this.changeID = id
    this.changeActive = this.meshBlock.map((block) => {
      this.meshBlock[id].active = ''
      if (block.meshId === id) {
        return (this.meshBlock[id].active = 'active')
      }
    })
  }
}
export const profileController = new ProfileController()
