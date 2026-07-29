import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const defaultStore = {
  guilds: {},
  pairs: {},
  reports: [],
  lastMatchDate: null,
};

let store = structuredClone(defaultStore);
let writeQueue = Promise.resolve();

function defaultGuildSettings() {
  return {
    enabled: false,
    channelId: null,
    profileMessage: "안녕하세요! 오늘 잘 부탁드려요.",
    profilePublic: true,
    reportCount: 0,
    lastReportDate: null,
    xp: 0,
    level: 1,
    createdAt: new Date().toISOString(),
  };
}

function normalizeGuild(guild) {
  return {
    ...defaultGuildSettings(),
    ...guild,
  };
}

export async function loadStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    store = { ...structuredClone(defaultStore), ...JSON.parse(raw) };
    store.guilds ??= {};
    store.pairs ??= {};
    store.reports ??= [];

    for (const [guildId, guild] of Object.entries(store.guilds)) {
      store.guilds[guildId] = normalizeGuild(guild);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await saveStore();
  }

  return store;
}

export function getStore() {
  return store;
}

export async function saveStore() {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(store, null, 2);
  writeQueue = writeQueue.then(() => writeFile(STORE_PATH, payload, "utf8"));
  return writeQueue;
}

export async function updateGuild(guildId, updates) {
  const current = normalizeGuild(store.guilds[guildId]);

  store.guilds[guildId] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveStore();
  return store.guilds[guildId];
}

export async function removePair(guildId) {
  const partnerId = store.pairs[guildId];

  if (partnerId) {
    delete store.pairs[partnerId];
  }

  delete store.pairs[guildId];
  await saveStore();
  return partnerId;
}

export async function setPair(guildAId, guildBId) {
  store.pairs[guildAId] = guildBId;
  store.pairs[guildBId] = guildAId;
  await saveStore();
}

export async function addReport(report) {
  store.reports.push({
    ...report,
    createdAt: new Date().toISOString(),
  });

  const reporterGuild = normalizeGuild(store.guilds[report.reporterGuildId]);
  store.guilds[report.reporterGuildId] = {
    ...reporterGuild,
    lastReportDate: report.reportDate ?? reporterGuild.lastReportDate,
    updatedAt: new Date().toISOString(),
  };

  const reportedGuild = normalizeGuild(store.guilds[report.reportedGuildId]);
  store.guilds[report.reportedGuildId] = {
    ...reportedGuild,
    reportCount: (reportedGuild.reportCount ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveStore();
}

export async function awardNormalCompletion(guildIds) {
  for (const guildId of guildIds) {
    const guild = normalizeGuild(store.guilds[guildId]);
    const xp = (guild.xp ?? 0) + 100;

    store.guilds[guildId] = {
      ...guild,
      xp,
      level: Math.floor(xp / 100) + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  await saveStore();
}
