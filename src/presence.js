import { ActivityType } from "discord.js";
import { getStore } from "./store.js";

function getPresenceStats() {
  const store = getStore();
  const matchedServerIds = new Set(Object.keys(store.pairs));

  const waitingServerCount = Object.entries(store.guilds).filter(([guildId, guild]) => {
    return guild.enabled && guild.channelId && !matchedServerIds.has(guildId);
  }).length;

  return {
    matchedServerCount: matchedServerIds.size,
    waitingServerCount,
  };
}

export function updatePresence(client) {
  if (!client.user) return;

  const { matchedServerCount, waitingServerCount } = getPresenceStats();

  client.user.setPresence({
    activities: [
      {
        name: `매칭 ${matchedServerCount}서버 | 대기 ${waitingServerCount}서버`,
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
}
