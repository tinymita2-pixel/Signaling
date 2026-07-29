import { REST, Routes } from "discord.js";
import { commandPayload } from "./commands.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

const guildIds = process.argv.slice(2).map((guildId) => guildId.trim()).filter(Boolean);

if (guildIds.length === 0) {
  throw new Error("Usage: npm run register-guild -- <guild_id> [guild_id...]");
}

const rest = new REST({ version: "10" }).setToken(config.token);

for (const guildId of guildIds) {
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, guildId),
    { body: commandPayload },
  );
  console.log(`Registered ${commandPayload.length} guild commands to ${guildId}.`);
}
