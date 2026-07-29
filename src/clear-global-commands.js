import { REST, Routes } from "discord.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationCommands(config.clientId),
  { body: [] },
);

console.log("Cleared all global commands.");
