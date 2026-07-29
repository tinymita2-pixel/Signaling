import "dotenv/config";

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  botOwnerId: process.env.BOT_OWNER_ID,
  testGuildId: process.env.TEST_GUILD_ID,
  testGuildIds: (process.env.TEST_GUILD_ID ?? "")
    .split(",")
    .map((guildId) => guildId.trim())
    .filter(Boolean),
  timezone: process.env.TIMEZONE || "Asia/Seoul",
  connectingGifUrl: process.env.CONNECTING_GIF_URL,
};

export function assertRuntimeConfig() {
  const missing = [];

  if (!config.token) missing.push("DISCORD_TOKEN");
  if (!config.clientId) missing.push("DISCORD_CLIENT_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment values: ${missing.join(", ")}`);
  }
}
