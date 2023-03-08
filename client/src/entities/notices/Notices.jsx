import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import Wrapper from "../../shared/notice/wrapper";
import { nController } from "./model";
import AvtorInfo from "../../shared/notice/avtor-info";
import Menu from "../../features/notice/menu";
import Description from "../../shared/notice/description";
import RaitingNotice from "../../shared/notice/raiting-notice";
import Plug from "../../shared/notice/plug";
import { useFetching } from "../../shared/hooks/useFetching";
import "./style.css";
import NoticeImages from "../../shared/notice/notice-images-v3";

const Notices = ({ id }) => {
  const [fetching, isLoading, error] = useFetching(async () => {
    await nController.fetchNotices(id);
  });
  useEffect(() => {
    if (nController.fetch) {
      fetching();
    }
    return () => {
      nController.cleanNotice();
    };
  }, [id]);
  useEffect(() => {
    if (nController.lazyload) fetching();
  }, [nController.lazyload]);
  useEffect(() => {
    document.addEventListener("scroll", nController.scrollHandler);
    return function () {
      document.removeEventListener("scroll", nController.scrollHandler);
    };
  }, [nController.count, nController.notices, nController.page]);
  return (
    <>
      {error ? <h1 className={"h1Error"}>{error}</h1> : ""}
      {nController.isLoading && !error ? <Plug /> : ""}
      {nController.notices.map((notice, index) => (
        <Wrapper
          key={notice.id}
          id={nController.delId == notice.id ? "delShow" : ""}
        >
          <AvtorInfo avtor={nController.avtors[index]} notice={notice} />
          <Menu
            index={index}
            notId={notice.id}
            userId={nController.avtors[index].id}
          />
          {notice?.notice_images[0]?.id ? (
            <NoticeImages images={notice.notice_images} />
          ) : (
            ""
          )}
          {notice.description ? (
            <Description description={notice.description} />
          ) : (
            ""
          )}
          <RaitingNotice />
        </Wrapper>
      ))}
    </>
  );
};

export default observer(Notices);
