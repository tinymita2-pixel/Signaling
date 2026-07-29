import { REST, Routes } from "discord.js";
import { commandPayload } from "./commands.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationCommands(config.clientId),
  { body: commandPayload },
);

console.log(`Registered ${commandPayload.length} global commands.`);
