import Content from "../../shared/content/ui";
import { observer } from "mobx-react-lite";
import useTitlePage from "../../shared/hooks/useTitlePage";
import { Suspense } from "react";
import Plug from "../../shared/notice/plug";
import Notices from "../../entities/notices/Notices";
const Feed = () => {
  useTitlePage("AniDale - Лента");
  return (
    <Content>
      <Suspense fallback={<Plug />}>
        <Notices id="feed" />
      </Suspense>
    </Content>
  );
};

export default observer(Feed);
