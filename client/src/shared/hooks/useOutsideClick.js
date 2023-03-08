import { useEffect } from "react";

const useOutsideClick = (ref, handler, notOutRef) => {
  useEffect(() => {
    document.addEventListener("mousedown", (e) => {
      const el = ref?.current;
      const notOut = notOutRef?.current;
      if (
        !el ||
        el.contains(e.target) ||
        !notOut ||
        notOut.contains(e.target)
      ) {
        return;
      }
      handler(e);
    });
    return () => {
      document.removeEventListener("mousedown", handler, true);
    };
  }, [ref, handler]);
};
export default useOutsideClick;

export const useOutsideClickModal = (ref, handler) => {
  useEffect(() => {
    document.addEventListener("mousedown", (e) => {
      const el = ref?.current;
      if (!el || el.contains(e.target)) {
        return;
      }
      handler(e);
    });
    return () => {
      document.removeEventListener("mousedown", handler, true);
    };
  }, [ref, handler]);
};
