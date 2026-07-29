import { awardNormalCompletion, getStore, removePair, saveStore, setPair } from "./store.js";
import { createConnectingVisualEmbed, createDimensionalEmbed, themeColors } from "./theme.js";

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function canPair(store, guildAId, guildBId) {
  const guildA = store.guilds[guildAId];
  const guildB = store.guilds[guildBId];

  if (!guildA?.enabled || !guildB?.enabled) return false;
  if (!guildA.channelId || !guildB.channelId) return false;

  return true;
}

async function buildGuildProfileEmbed(client, viewerGuildId, profileGuildId) {
  const store = getStore();
  const profile = store.guilds[profileGuildId];

  if (!profile?.profilePublic) {
    return createDimensionalEmbed({
      title: "비공개 차원",
      description: "상대 서버가 프로필 송신을 비공개로 설정했습니다.",
      color: themeColors.quiet,
      footer: "상대 서버 프로필",
    }).addFields({
      name: "신고 횟수",
      value: `${profile?.reportCount ?? 0}회`,
      inline: true,
    });
  }

  const guild = await client.guilds.fetch(profileGuildId).catch(() => null);
  const cachedGuild = client.guilds.cache.get(profileGuildId);
  const displayGuild = guild ?? cachedGuild;
  const memberCount = displayGuild?.memberCount;
  const iconUrl = displayGuild?.iconURL({ size: 256 });

  const embed = createDimensionalEmbed({
    title: `상대 차원 프로필: ${displayGuild?.name ?? "이름 미확인"}`,
    description: profile.profileMessage || "한줄 메시지가 아직 없습니다.",
    color: themeColors.sync,
    footer: "수신된 서버 프로필",
  })
    .addFields(
      {
        name: "현재 인원",
        value: typeof memberCount === "number" ? `${memberCount.toLocaleString("ko-KR")}명` : "확인 불가",
        inline: true,
      },
      {
        name: "레벨",
        value: `Lv. ${profile.level ?? 1}`,
        inline: true,
      },
      {
        name: "경험치",
        value: `${profile.xp ?? 0} XP`,
        inline: true,
      },
      {
        name: "신고 횟수",
        value: `${profile.reportCount ?? 0}회`,
        inline: true,
      },
    );

  if (iconUrl) {
    embed.setThumbnail(iconUrl);
  }

  const viewer = store.guilds[viewerGuildId];
  if (!viewer?.profilePublic) {
    embed.setFooter({ text: "수신된 서버 프로필 // 내 서버 프로필은 비공개 상태" });
  }

  return embed;
}

async function sendSystemMessage(client, guildId, description, embeds = [], options = {}) {
  const store = getStore();
  const channelId = store.guilds[guildId]?.channelId;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const embed = createDimensionalEmbed({
      title: options.title ?? "차원통신",
      description,
      color: options.color ?? themeColors.signal,
    });

    await channel.send({ embeds: [embed, ...embeds], allowedMentions: { parse: [] } });
  } catch (error) {
    console.warn(`Failed to send system message to ${guildId}:`, error.message);
  }
}

async function sendConnectingVisual(client, guildId, availableCount) {
  const store = getStore();
  const channelId = store.guilds[guildId]?.channelId;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    const { embed, files } = createConnectingVisualEmbed({ availableCount });
    await channel.send({ embeds: [embed], files, allowedMentions: { parse: [] } });
  } catch (error) {
    console.warn(`Failed to send connecting visual to ${guildId}:`, error.message);
  }
}

async function hasUsableRelayChannel(client, guildId) {
  const store = getStore();
  const channelId = store.guilds[guildId]?.channelId;
  if (!channelId) return false;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  return Boolean(channel?.isTextBased());
}

async function sendPairStarted(client, guildId, partnerId, reason, availableCount) {
  await sendConnectingVisual(client, guildId, availableCount);
  const profileEmbed = await buildGuildProfileEmbed(client, guildId, partnerId);
  await sendSystemMessage(
    client,
    guildId,
    `${reason}\n상대 서버와의 회선이 안정화되었습니다.`,
    [profileEmbed],
    { title: "차원 회선 연결 완료", color: themeColors.success },
  );
}

export async function endPair(client, guildId, reason = "연결이 종료되었습니다.") {
  const partnerId = await removePair(guildId);

  if (!partnerId) {
    return { ended: false, partnerId: null };
  }

  await Promise.all([
    sendSystemMessage(client, guildId, reason),
    sendSystemMessage(client, partnerId, "상대 서버와의 차원 회선이 종료되었습니다."),
  ]);

  return { ended: true, partnerId };
}

export async function connectGuildNow(client, guildId) {
  const store = getStore();
  const settings = store.guilds[guildId];

  if (!settings?.enabled || !settings.channelId) {
    return { status: "not_ready", partnerId: null };
  }

  if (!(await hasUsableRelayChannel(client, guildId))) {
    return { status: "channel_missing", partnerId: null };
  }

  if (store.pairs[guildId]) {
    return { status: "already_connected", partnerId: store.pairs[guildId] };
  }

  const candidateIds = shuffle(
    Object.entries(store.guilds)
      .filter(([candidateId, guild]) => {
        return (
          candidateId !== guildId &&
          guild.enabled &&
          guild.channelId &&
          !store.pairs[candidateId] &&
          canPair(store, guildId, candidateId)
        );
      })
      .map(([candidateId]) => candidateId),
  );

  const usableCandidateIds = [];

  for (const candidateId of candidateIds) {
    if (await hasUsableRelayChannel(client, candidateId)) {
      usableCandidateIds.push(candidateId);
    }
  }

  const availableCount = usableCandidateIds.length;
  let partnerId = null;

  partnerId = usableCandidateIds[0] ?? null;

  if (!partnerId) {
    return { status: "no_partner", partnerId: null };
  }

  await setPair(guildId, partnerId);

  await Promise.all([
    sendPairStarted(client, guildId, partnerId, "관리자가 즉시 연결을 실행했습니다.", availableCount),
    sendPairStarted(client, partnerId, guildId, "상대 서버가 즉시 연결을 실행했습니다.", availableCount),
  ]);

  return { status: "connected", partnerId };
}

async function awardCompletedPairs(client, completedGuildIds) {
  if (completedGuildIds.length === 0) return;

  await awardNormalCompletion(completedGuildIds);

  const store = getStore();
  await Promise.all(
    completedGuildIds.map((guildId) => {
      const guild = store.guilds[guildId];
      return sendSystemMessage(
        client,
        guildId,
        `이전 익명 대화가 정상 종료되어 경험치가 올랐습니다.\n현재 레벨: Lv. ${guild?.level ?? 1} / 경험치: ${guild?.xp ?? 0} XP`,
        [],
        { title: "교신 완료 보상", color: themeColors.success },
      );
    }),
  );
}

export async function runDailyMatching(
  client,
  reason = "오늘의 익명 연결이 시작되었습니다.",
  options = {},
) {
  const { awardCompletions = true, announceStart = true } = options;
  const store = getStore();
  const completedGuildIds = [...new Set(Object.keys(store.pairs))];

  if (awardCompletions) {
    await awardCompletedPairs(client, completedGuildIds);
  }

  for (const guildId of Object.keys(store.pairs)) {
    await removePair(guildId);
  }

  const configuredGuildIds = Object.entries(store.guilds)
    .filter(([, guild]) => guild.enabled && guild.channelId)
    .map(([guildId]) => guildId);

  const usableGuildIds = [];

  for (const guildId of configuredGuildIds) {
    if (await hasUsableRelayChannel(client, guildId)) {
      usableGuildIds.push(guildId);
    }
  }

  const candidates = shuffle(usableGuildIds);
  const dailyAvailableCount = Math.max(candidates.length - 1, 0);

  if (announceStart) {
    await Promise.all(
      candidates.map((guildId) => {
        return sendSystemMessage(
          client,
          guildId,
          "새로운 랜덤 매칭을 시작합니다.\n연결 가능한 차원 좌표를 탐색하는 중입니다.",
          [],
          { title: "자정 교신 개시", color: themeColors.signal },
        );
      }),
    );
  }

  const pairs = [];
  const unmatched = [];
  const used = new Set();

  for (const guildId of candidates) {
    if (used.has(guildId)) continue;

    const partnerId = candidates.find((candidateId) => {
      return candidateId !== guildId && !used.has(candidateId) && canPair(store, guildId, candidateId);
    });

    if (!partnerId) {
      unmatched.push(guildId);
      used.add(guildId);
      continue;
    }

    await setPair(guildId, partnerId);
    used.add(guildId);
    used.add(partnerId);
    pairs.push([guildId, partnerId]);
  }

  store.lastMatchDate = new Date().toISOString();
  await saveStore();

  await Promise.all(
    pairs.flatMap(([guildAId, guildBId]) => [
      sendPairStarted(client, guildAId, guildBId, reason, dailyAvailableCount),
      sendPairStarted(client, guildBId, guildAId, reason, dailyAvailableCount),
    ]),
  );

  await Promise.all(
    unmatched.map((guildId) => {
      return sendSystemMessage(
        client,
        guildId,
        "매칭되는 상대 채널을 찾지 못했습니다.\n다른 서버가 참여하면 `/차원통신 즉시연결`로 다시 시도할 수 있습니다.",
        [],
        { title: "수신 좌표 없음", color: themeColors.warning },
      );
    }),
  );

  return { pairCount: pairs.length, unmatchedCount: unmatched.length };
}
