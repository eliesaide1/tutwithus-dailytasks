import { config } from "./Infrastructure/Config/config";
import { connectDb } from "./Infrastructure/Database/database";
import { createApp } from "./Controller/app";

const conn = await connectDb();
console.log(`MongoDB connected: ${conn.host}:${conn.port}/${conn.name}`);

createApp().listen(config.port, () => {
  console.log(`TutWithUs API listening on http://localhost:${config.port} (${config.env})`);
});
