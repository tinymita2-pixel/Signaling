import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export const themeColors = {
  signal: 0x8b5cf6,
  sync: 0x22d3ee,
  success: 0x34d399,
  warning: 0xf59e0b,
  danger: 0xfb7185,
  quiet: 0x64748b,
  night: 0x111827,
};

const localConnectingGif = path.resolve("assets", "dimension-link.gif");

export function createDimensionalEmbed({
  title,
  description,
  color = themeColors.signal,
  footer = "차원통신 // DIMENSION LINK",
} = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp(new Date());

  if (description) {
    embed.setDescription(description);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

export function createConnectingVisualEmbed({ availableCount } = {}) {
  const lines = [
    "수신 좌표를 맞추는 중입니다.",
    typeof availableCount === "number"
      ? `현재 연결 가능한 디스코드 방 수: ${availableCount.toLocaleString("ko-KR")}개`
      : "현재 연결 가능한 디스코드 방 수를 확인하는 중입니다.",
    "잠시 후 연결된 서버의 프로필이 도착합니다.",
  ];

  const embed = createDimensionalEmbed({
    title: "차원 신호 조율 중",
    description: lines.join("\n"),
    color: themeColors.signal,
  });
  const files = [];

  if (config.connectingGifUrl) {
    embed.setImage(config.connectingGifUrl);
  } else if (existsSync(localConnectingGif)) {
    embed.setImage("attachment://dimension-link.gif");
    files.push(new AttachmentBuilder(localConnectingGif, { name: "dimension-link.gif" }));
  }

  return { embed, files };
}
