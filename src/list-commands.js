import { REST, Routes } from "discord.js";
import { assertRuntimeConfig, config } from "./config.js";

assertRuntimeConfig();

const rest = new REST({ version: "10" }).setToken(config.token);

const globalCommands = await rest.get(Routes.applicationCommands(config.clientId));
console.log(`Global commands: ${globalCommands.length}`);
for (const command of globalCommands) {
  console.log(`- ${command.name} (${command.id})`);
}

for (const guildId of config.testGuildIds) {
  const guildCommands = await rest.get(Routes.applicationGuildCommands(config.clientId, guildId));
  console.log(`Guild ${guildId} commands: ${guildCommands.length}`);
  for (const command of guildCommands) {
    console.log(`- ${command.name} (${command.id})`);
  }
}
