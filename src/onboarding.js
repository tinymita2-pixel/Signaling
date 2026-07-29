import { PermissionFlagsBits } from "discord.js";
import { createDimensionalEmbed, themeColors } from "./theme.js";

function canSendIn(channel, guild) {
  if (!channel?.isTextBased()) return false;

  const me = guild.members.me;
  if (!me) return false;

  const permissions = channel.permissionsFor(me);
  return Boolean(
    permissions?.has(PermissionFlagsBits.ViewChannel) &&
      permissions?.has(PermissionFlagsBits.SendMessages) &&
      permissions?.has(PermissionFlagsBits.EmbedLinks),
  );
}

function findWelcomeChannel(guild) {
  if (canSendIn(guild.systemChannel, guild)) {
    return guild.systemChannel;
  }

  return guild.channels.cache.find((channel) => canSendIn(channel, guild));
}

export async function sendGuildJoinGuide(guild) {
  const channel = findWelcomeChannel(guild);
  if (!channel) {
    console.warn(`Could not find a welcome channel in ${guild.id}.`);
    return;
  }

  const embed = createDimensionalEmbed({
    title: "차원통신 초기 동기화",
    description: [
      "교신을 시작하려면 먼저 관리자가 수신 채널을 지정해야 합니다.",
      "차원통신은 다른 디스코드 서버와 익명으로 연결되는 기능입니다.",
    ].join("\n"),
    color: themeColors.signal,
  })
    .addFields(
      {
        name: "이용 전 확인",
        value: [
          "익명 연결 특성상 욕설, 스팸, 부적절한 콘텐츠, 개인정보 노출 등 문제가 발생할 수 있습니다.",
          "서버 관리자는 참여 여부와 채널을 신중하게 설정해야 하며, 이용 중 발생하는 대화와 서버 운영 책임은 해당 서버의 관리자와 사용자에게 있습니다.",
          "Discord 이용약관, 커뮤니티 가이드라인, 관련 법령을 위반하는 방식으로 사용하면 안 됩니다.",
        ].join("\n"),
      },
      {
        name: "1. 수신 채널",
        value: "`/차원통신 채널설정 채널:#채널명`",
      },
      {
        name: "2. 연결 참여",
        value: "`/차원통신 연결설정 상태:참여`",
      },
      {
        name: "3. 자정 교신",
        value: "설정이 끝나면 매일 자정에 참여 서버끼리 자동으로 상대 서버를 찾습니다.",
      },
    );

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}
