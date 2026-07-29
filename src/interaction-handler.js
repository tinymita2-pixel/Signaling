import { PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";
import { addReport, getStore, updateGuild } from "./store.js";
import { connectGuildNow, endPair } from "./matcher.js";
import { updatePresence } from "./presence.js";
import { createDimensionalEmbed, themeColors } from "./theme.js";

const subcommandsAllowedBeforeSetup = new Set(["채널설정", "상태", "내프로필"]);
const managerOnlySubcommands = new Set(["채널설정", "연결설정", "즉시연결", "한줄메시지설정", "프로필공개", "신고"]);

function dateKeyInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function statusEmbed(guildId) {
  const store = getStore();
  const settings = store.guilds[guildId];
  const partnerId = store.pairs[guildId];

  return createDimensionalEmbed({
    title: "차원통신 콘솔",
    description: partnerId
      ? "현재 다른 서버와 차원 회선이 열려 있습니다."
      : "아직 연결된 상대 서버가 없습니다.",
    color: partnerId ? themeColors.success : themeColors.quiet,
  })
    .addFields(
      {
        name: "참여 상태",
        value: settings?.enabled ? "참여" : "중지",
        inline: true,
      },
      {
        name: "지정 채널",
        value: settings?.channelId ? `<#${settings.channelId}>` : "미설정",
        inline: true,
      },
      {
        name: "연결 상태",
        value: partnerId ? "상대 서버와 연결 중" : "연결 없음",
        inline: true,
      },
      {
        name: "레벨",
        value: `Lv. ${settings?.level ?? 1}`,
        inline: true,
      },
      {
        name: "경험치",
        value: `${settings?.xp ?? 0} XP`,
        inline: true,
      },
      {
        name: "신고 횟수",
        value: `${settings?.reportCount ?? 0}회`,
        inline: true,
      },
      {
        name: "오늘 신고 사용",
        value: settings?.lastReportDate === dateKeyInTimezone(new Date(), config.timezone) ? "사용함" : "사용 가능",
        inline: true,
      },
      {
        name: "프로필 공개",
        value: settings?.profilePublic === false ? "비공개" : "공개",
        inline: true,
      },
      {
        name: "한줄 메시지",
        value: settings?.profileMessage || "미설정",
        inline: false,
      },
    );
}

function selfProfileEmbed(interaction) {
  const store = getStore();
  const settings = store.guilds[interaction.guildId];
  const guild = interaction.guild;
  const iconUrl = guild.iconURL({ size: 256 });

  const embed = createDimensionalEmbed({
    title: `내 서버 신호 프로필: ${guild.name}`,
    description: settings?.profileMessage || "한줄 메시지가 아직 없습니다.",
    color: settings?.profilePublic === false ? themeColors.quiet : themeColors.sync,
    footer: "프로필 송신 미리보기",
  })
    .addFields(
      {
        name: "현재 인원",
        value: `${guild.memberCount.toLocaleString("ko-KR")}명`,
        inline: true,
      },
      {
        name: "레벨",
        value: `Lv. ${settings?.level ?? 1}`,
        inline: true,
      },
      {
        name: "경험치",
        value: `${settings?.xp ?? 0} XP`,
        inline: true,
      },
      {
        name: "신고 횟수",
        value: `${settings?.reportCount ?? 0}회`,
        inline: true,
      },
      {
        name: "프로필 공개",
        value: settings?.profilePublic === false ? "비공개" : "공개",
        inline: true,
      },
      {
        name: "상대에게 표시",
        value: settings?.profilePublic === false ? "프로필 비공개로 표시됩니다." : "위 정보가 상대 서버에 표시됩니다.",
        inline: false,
      },
    );

  if (iconUrl) {
    embed.setThumbnail(iconUrl);
  }

  return embed;
}

async function sendChannelConfiguredMessage(client, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = createDimensionalEmbed({
    title: "수신 채널 동기화 완료",
    description: "이 채널이 차원통신 수신 채널로 설정되었습니다.",
    color: themeColors.success,
  });

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}

export async function handleInteraction(interaction, client) {
  if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
  if (interaction.commandName !== "차원통신") return;

  const store = getStore();
  const guildId = interaction.guildId;
  const settings = store.guilds[guildId];
  const subcommand = interaction.options.getSubcommand();

  if (!settings?.channelId && !subcommandsAllowedBeforeSetup.has(subcommand)) {
    await interaction.reply({
      content: "아직 익명 채팅 채널이 설정되지 않았어요. 먼저 `/차원통신 채널설정`으로 채널을 지정해주세요.",
      ephemeral: true,
    });
    return;
  }

  if (managerOnlySubcommands.has(subcommand) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "이 명령어는 서버 관리 권한이 있는 사용자만 사용할 수 있어요.",
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "채널설정") {
    const channel = interaction.options.getChannel("채널", true);

    await updateGuild(guildId, {
      channelId: channel.id,
      guildName: interaction.guild.name,
    });
    updatePresence(client);

    await interaction.reply({
      content: `익명 채팅 채널을 ${channel}로 설정했어요. 다른 서버와 연결하려면 /차원통신 연결설정 상태:참여 를 사용해주세요.`,
      ephemeral: true,
    });

    await sendChannelConfiguredMessage(client, channel.id).catch((error) => {
      console.warn(`Failed to send channel configured message to ${channel.id}:`, error.message);
    });
    return;
  }

  if (subcommand === "연결설정") {
    const enabled = interaction.options.getString("상태", true) === "enabled";

    await updateGuild(guildId, {
      enabled,
      guildName: interaction.guild.name,
    });

    if (!enabled) {
      await endPair(client, guildId, "관리자가 다른 서버와의 연결 참여를 중지했습니다.");
    }
    updatePresence(client);

    await interaction.reply({
      content: enabled
        ? "다른 디스코드 서버와의 랜덤 연결에 참여하도록 설정했어요."
        : "다른 디스코드 서버와의 랜덤 연결 참여를 중지했어요.",
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "상태") {
    await interaction.reply({ embeds: [statusEmbed(guildId)], ephemeral: true });
    return;
  }

  if (subcommand === "내프로필") {
    await interaction.reply({ embeds: [selfProfileEmbed(interaction)], ephemeral: true });
    return;
  }

  if (subcommand === "즉시연결") {
    await interaction.deferReply({ ephemeral: true });

    await updateGuild(guildId, {
      guildName: interaction.guild.name,
    });

    const result = await connectGuildNow(client, guildId);
    updatePresence(client);

    if (result.status === "connected") {
      await interaction.editReply("대기 중인 상대 서버를 찾아 바로 연결했어요.");
      return;
    }

    if (result.status === "already_connected") {
      await interaction.editReply("이미 상대 서버와 연결되어 있어요.");
      return;
    }

    if (result.status === "not_ready") {
      await interaction.editReply("먼저 `/차원통신 채널설정`으로 채널을 지정하고 `/차원통신 연결설정 상태:참여`로 연결 참여를 켜주세요.");
      return;
    }

    if (result.status === "channel_missing") {
      await interaction.editReply("설정된 익명 채팅 채널을 찾지 못했어요. `/차원통신 채널설정`으로 채널을 다시 지정해주세요.");
      return;
    }

    await interaction.editReply("매칭되는 상대 채널을 찾지 못했어요. 다른 서버가 참여하면 다시 시도해주세요.");
    return;
  }

  if (subcommand === "한줄메시지설정") {
    const profileMessage = interaction.options.getString("메시지", true).trim();

    if (!profileMessage) {
      await interaction.reply({ content: "한줄 메시지는 비워둘 수 없어요.", ephemeral: true });
      return;
    }

    await updateGuild(guildId, {
      guildName: interaction.guild.name,
      profileMessage,
    });

    await interaction.reply({
      content: `한줄 메시지를 저장했어요: ${profileMessage}`,
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "프로필공개") {
    const profilePublic = interaction.options.getString("공개여부", true) === "public";

    await updateGuild(guildId, {
      guildName: interaction.guild.name,
      profilePublic,
    });

    await interaction.reply({
      content: `서버 프로필을 ${profilePublic ? "공개" : "비공개"}로 설정했어요.`,
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "신고") {
    const partnerId = store.pairs[guildId];
    const reason = interaction.options.getString("사유", true);
    const today = dateKeyInTimezone(new Date(), config.timezone);

    if (!partnerId) {
      await interaction.reply({ content: "현재 연결된 상대 서버가 없어요.", ephemeral: true });
      return;
    }

    if (settings?.lastReportDate === today) {
      await interaction.reply({
        content: "오늘은 이미 신고를 사용했어요. `/차원통신 신고`는 하루에 한 번만 사용할 수 있으니 내일 다시 사용해주세요.",
        ephemeral: true,
      });
      return;
    }

    await addReport({
      reporterGuildId: guildId,
      reportedGuildId: partnerId,
      reason,
      reportDate: today,
    });
    await endPair(client, guildId, "관리자가 상대 서버를 신고하고 연결을 종료했습니다.");
    updatePresence(client);
    await interaction.reply({ content: "신고를 기록했고, 상대 서버와의 연결도 즉시 종료했어요.", ephemeral: true });
  }
}
