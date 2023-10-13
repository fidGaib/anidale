import handlers from "./handlers";
import { config } from "dotenv";
import express from "express";
import type { Server } from "http";

config();
const app = express();

handlers.forEach((h: any) => {
  if (h.path) app.use(h.path, h.func);
  else app.use(h);
});

const stopApplication = (server: Server) => {
  server.close();
  return new Promise((resolve) => {
    server.on("close", () => {
      resolve(0);
    });
  });
};

const onHotReload = async (server: Server) => {
  const hotContext = import.meta.hot;
  if (hotContext) {
    await hotContext.data.stopping;

    hotContext.on("vite:beforeFullReload", async () => {
      console.log("\nPerforming an HMR reload...");
      hotContext.data.stopping = stopApplication(server);
    });
  }
};

const start = async () => {
  try {
    if (import.meta.hot) await import.meta.hot.data.stopping;
    const server = app.listen(process.env.PORT, () =>
      console.log(`Server started on port ${process.env.PORT}`)
    );
    onHotReload(server);
  } catch (e) {
    console.error(e);
  }
};
start();
