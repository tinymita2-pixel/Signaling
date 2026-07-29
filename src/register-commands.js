import { REST, Routes } from "discord.js";
import { commandPayload } from "./commands.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

const rest = new REST({ version: "10" }).setToken(config.token);

if (config.testGuildIds.length > 0) {
  for (const guildId of config.testGuildIds) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, guildId),
      { body: commandPayload },
    );
    console.log(`Registered ${commandPayload.length} guild commands to ${guildId}.`);
  }
} else {
  await rest.put(
    Routes.applicationCommands(config.clientId),
    { body: commandPayload },
  );
  console.log(`Registered ${commandPayload.length} global commands.`);
}
