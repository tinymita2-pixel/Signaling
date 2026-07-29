import { EmbedBuilder } from "discord.js";
import { getStore } from "./store.js";
import { themeColors } from "./theme.js";

const recentWarnings = new Map();

async function warnUser(message, reason) {
  const key = `${message.guild.id}:${message.author.id}:${reason}`;
  const now = Date.now();
  const last = recentWarnings.get(key) ?? 0;

  if (now - last < 10_000) return;

  recentWarnings.set(key, now);

  try {
    const warning = await message.reply({
      content: reason,
      allowedMentions: { repliedUser: false, parse: [] },
    });

    setTimeout(() => warning.delete().catch(() => {}), 6000);
  } catch {
    // Nothing useful to do if the bot cannot reply or delete.
  }
}

function buildAttachmentList(message) {
  return [...message.attachments.values()].map((attachment) => {
    return `[${attachment.name ?? "attachment"}](${attachment.url})`;
  });
}

function escapeMentions(content) {
  return content.replace(/@/g, "@\u200b");
}

export async function handleRelayMessage(message) {
  if (!message.inGuild() || message.author.bot || message.webhookId) return;

  const store = getStore();
  const settings = store.guilds[message.guild.id];
  if (!settings?.enabled || settings.channelId !== message.channelId) return;

  const partnerGuildId = store.pairs[message.guild.id];
  if (!partnerGuildId) return;

  const partner = store.guilds[partnerGuildId];
  if (!partner?.enabled || !partner.channelId) return;

  const targetChannel = await message.client.channels.fetch(partner.channelId).catch(() => null);
  if (!targetChannel?.isTextBased()) {
    await warnUser(message, "상대 서버 채널에 메시지를 전달할 수 없습니다. 관리자에게 알려주세요.");
    return;
  }

  const attachments = buildAttachmentList(message);
  const descriptionParts = [];

  if (message.content.trim()) {
    descriptionParts.push(escapeMentions(message.content));
  }

  if (attachments.length > 0) {
    descriptionParts.push(`첨부파일:\n${attachments.join("\n")}`);
  }

  const embed = new EmbedBuilder()
    .setColor(themeColors.night)
    .setDescription(descriptionParts.join("\n\n") || "첨부파일을 보냈습니다.")
    .setFooter({ text: "상대 서버에서 보낸 익명신호" })
    .setTimestamp(message.createdAt);

  const firstImage = [...message.attachments.values()].find((attachment) => {
    return attachment.contentType?.startsWith("image/");
  });

  if (firstImage) {
    embed.setImage(firstImage.url);
  }

  try {
    await targetChannel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.warn("Failed to relay message:", error.message);
    await warnUser(message, "메시지 전달에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}
