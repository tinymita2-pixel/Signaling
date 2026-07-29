import { REST, Routes } from "discord.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

if (config.testGuildIds.length === 0) {
  console.log("No TEST_GUILD_ID values found. Nothing to clear.");
  process.exit(0);
}

const rest = new REST({ version: "10" }).setToken(config.token);

for (const guildId of config.testGuildIds) {
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, guildId),
    { body: [] },
  );
  console.log(`Cleared guild commands from ${guildId}.`);
}
