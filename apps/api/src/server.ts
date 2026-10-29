import { env } from "@kidstoys/db";
import { createApp } from "./app";

const app = createApp();

app.listen(env.apiPort, () => {
  console.log(`KidsToys API listening on http://127.0.0.1:${env.apiPort}`);
});
