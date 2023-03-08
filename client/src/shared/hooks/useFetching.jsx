import { useState } from "react";

export const useFetching = (callback) => {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetching = async () => {
    try {
      setLoading(true);
      await callback();
    } catch (e) {
      setError(`${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  return [fetching, isLoading, error];
};
