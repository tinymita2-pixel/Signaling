import { Client, Events, GatewayIntentBits } from "discord.js";
import cron from "node-cron";
import { assertRuntimeConfig, config } from "./config.js";
import { handleInteraction } from "./interaction-handler.js";
import { loadStore } from "./store.js";
import { runDailyMatching } from "./matcher.js";
import { sendGuildJoinGuide } from "./onboarding.js";
import { updatePresence } from "./presence.js";
import { handleRelayMessage } from "./relay.js";

assertRuntimeConfig();
await loadStore();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
  console.log(`Daily matching timezone: ${config.timezone}`);
  updatePresence(client);

  setInterval(() => {
    updatePresence(client);
  }, 60_000);

  cron.schedule(
    "0 0 * * *",
    () => {
      runDailyMatching(client)
        .then(() => updatePresence(client))
        .catch((error) => {
          console.error("Daily matching failed:", error);
        });
    },
    { timezone: config.timezone },
  );
});

client.on(Events.InteractionCreate, (interaction) => {
  handleInteraction(interaction, client).catch((error) => {
    console.error("Interaction failed:", error);

    const payload = {
      content: "명령어 처리 중 오류가 발생했습니다.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(payload).catch(() => {});
    } else {
      interaction.reply(payload).catch(() => {});
    }
  });
});

client.on(Events.GuildCreate, (guild) => {
  sendGuildJoinGuide(guild).catch((error) => {
    console.error("Failed to send guild join guide:", error);
  });
});

client.on(Events.MessageCreate, (message) => {
  handleRelayMessage(message).catch((error) => {
    console.error("Relay failed:", error);
  });
});

client.login(config.token);
