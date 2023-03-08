import Content from "../../shared/content/ui";
import { useParams } from "react-router-dom";
import { profileController } from "./model";
import { observer } from "mobx-react-lite";
import ArtWork from "../../entities/profile/art-work";
import MeshBlock from "../../entities/profile/mesh-block";
import LoadArt from "../../entities/profile/load-art";
import Fiends from "../../entities/profile/fiends";
import Notices from "../../entities/notices/Notices";
import { Suspense } from "react";
import Plug from "../../shared/notice/plug";
import MakeBoticeV2 from "../../entities/profile/make-notice-v2";
const Profile = () => {
  const { id } = useParams();
  profileController.pageID = parseInt(id);
  return (
    <Content>
      <ArtWork />
      <MeshBlock />
      <MakeBoticeV2 />
      {profileController.changeID === 0 ? (
        <Suspense fallback={<Plug />}>
          <Notices id={profileController.pageID} />
        </Suspense>
      ) : (
        ""
      )}
      {profileController.changeID === 1 ? <LoadArt /> : ""}
      {profileController.changeID === 4 ? <Fiends /> : ""}
    </Content>
  );
};
export default observer(Profile);
