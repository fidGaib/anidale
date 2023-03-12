import { useState } from 'react'

import { profileController } from '../../pages/profile/model'
import Icon from '../../shared/icons/icon'
import cl from './styles/mexh-block.module.css'

const MeshBlock = () => {
  const [mesh, setMesh] = useState(profileController.changeActive)
  const handle = () => {
    setMesh(profileController.changeActive)
  }
  return (
    <div className={cl.funcBlock}>
      {profileController.meshBlock.map((block) => (
        <div
          onClick={() => {
            if (block.meshId != profileController.changeID) {
              profileController.handleMesh(block.meshId)
              handle()
            }
          }}
          key={block.meshId}
          className={cl.childFuncBlock}
        >
          <Icon id={block.icon} className={cl.childFuncBlockSvg} />
          <p id={mesh[block.meshId] ? cl.activeFunc : ''}>{block.name}</p>
        </div>
      ))}
    </div>
  )
}

export default MeshBlock
