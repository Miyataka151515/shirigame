const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const rankForm = document.getElementById("rankForm");
const rankName = document.getElementById("rankName");
const rankSkip = document.getElementById("rankSkip");

const W = canvas.width;
const H = canvas.height;
const playerBuffer = document.createElement("canvas");
const playerBufferCtx = playerBuffer.getContext("2d");
const RANK_KEY = "skyTapRunRanking";
const DUEL_RANK_KEY = "shiriDuelRanking";
const SUPABASE_URL = "https://lrifberimtqrzkbioxzu.supabase.co";
const SUPABASE_KEY = "sb_publishable_iFLP9EMbLR2NVKSZMHVqTg__sc3IKVs";
const SCORES_ENDPOINT = `${SUPABASE_URL}/rest/v1/scores`;
const DUEL_SCORES_ENDPOINT = `${SUPABASE_URL}/rest/v1/duel_scores`;
const DASH_CAT_UNLOCK_DISTANCE = 75;
const RANK_LIMIT = 5;
const RANK_FETCH_LIMIT = 100;
const RUNNER_TITLE_VISIBLE_RANK_ROWS = 8;
const RUNNER_OVER_VISIBLE_RANK_ROWS = 8;
const DUEL_TITLE_VISIBLE_RANK_ROWS = 7;
const DUEL_ENEMIES = ["octopus", "dashCat", "duelStage3", "duelBeaver", "duelGhost", "duelMouse", "duelRedOctopus", "duelShieru", "duelReaper"];
const DUEL_MAX_STAGE = DUEL_ENEMIES.length;
const helpButton = { x: 138, y: 616, w: 114, h: 36 };
const helpCloseButton = { x: 128, y: 772, w: 134, h: 38 };
const duelHelpCloseButton = { x: 128, y: 562, w: 134, h: 38 };
const runnerButton = { x: 74, y: 520, w: 242, h: 38 };
const duelButton = { x: 74, y: 566, w: 242, h: 38 };
const titleSwitchButton = { x: 260, y: 616, w: 86, h: 36 };
const runnerTitleHelpButton = { x: 74, y: 724, w: 132, h: 36 };
const runnerTitleSwitchButton = { x: 218, y: 724, w: 98, h: 36 };
const duelTitleHelpButton = { x: 74, y: 780, w: 132, h: 36 };
const duelTitleSwitchButton = { x: 218, y: 780, w: 98, h: 36 };
const assets = {};
const assetList = {
  player: "assets/player.png",
  runnerExploder: "assets/runner-exploder.png",
  squirrel: "assets/squirrel.png",
  octopus: "assets/octopus.png",
  dashCat: "assets/cat.png",
  beer: "assets/beer.png",
  yakitori: "assets/yakitori.png",
  pudding: "assets/pudding.png",
  bomb: "assets/bomb.png",
  peach: "assets/peach.png",
  goldenPeach: "assets/golden-peach.png",
  microphone: "assets/microphone.png",
  duelBackgrounds: "assets/duel-backgrounds.png",
  duelStage3: "assets/duel-stage3.png",
  duelGhost: "assets/duel-ghost.png",
  duelMouse: "assets/duel-mouse.png",
  duelRedOctopus: "assets/duel-red-octopus.png",
  duelBeaver: "assets/duel-beaver.png",
  duelShieru: "assets/duel-shieru.png",
  duelReaper: "assets/duel-reaper.png",
};

const voiceClipList = {
  damageIte: "assets/audio/voice-damage-ite.mp4",
  damageUwa: "assets/audio/voice-damage-uwa.mp4",
  damageMoo: "assets/audio/voice-damage-moo.mp4",
  scoreBad: "assets/audio/voice-score-bad.mp4",
  scoreWorse: "assets/audio/voice-score-worse.mp4",
  scoreOkay: "assets/audio/voice-score-okay.mp4",
  scoreGood: "assets/audio/voice-score-good.mp4",
  scoreGreat: "assets/audio/voice-score-great.mp4",
  scoreMarriage: "assets/audio/voice-score-marriage.mp4",
  itemBeer: "assets/audio/voice-item-beer.mp4",
  itemYakitori: "assets/audio/voice-item-yakitori.mp4",
  itemPudding: "assets/audio/voice-item-pudding.mp4",
  itemBomb: "assets/audio/voice-item-bomb.mp4",
  itemPeach: "assets/audio/voice-item-peach.mp4",
  itemRare: "assets/audio/voice-item-rare.mp4",
  itemMic: "assets/audio/voice-item-mic.mp4",
  invincibleKill: "assets/audio/voice-invincible-kill.mp4",
  deathScream: "assets/audio/voice-death-scream.mp4",
  duelKill: "assets/audio/voice-duel-kill.mp4",
  duelStage3Laugh: "assets/audio/voice-duel-stage3-laugh.mp4",
};

const itemKinds = {
  beer: { size: 46, score: 0 },
  yakitori: { size: 44, score: 0 },
  pudding: { size: 44, score: 0 },
  bomb: { size: 48, score: 0 },
  peach: { size: 42, score: 100 },
  goldenPeach: { size: 46, score: 1000 },
  microphone: { size: 44, score: 250 },
};

let state;
let lastTime = 0;
let rafId = 0;
let rankings = loadLocalRankings();
let duelRankings = loadLocalDuelRankings();
let duelPlayerName = localStorage.getItem("shiriDuelPlayerName") || "";
let helpDrag = null;
let rankDrag = null;
const audioState = {
  ctx: null,
  enabled: false,
  clips: {},
  clipsReady: false,
  clipsUnlocked: false,
  nextNoteAt: 0,
  noteIndex: 0,
  mode: "",
};
refreshRankings();
refreshDuelRankings();

function initialRoute() {
  const params = new URLSearchParams(window.location.search);
  const game = params.get("game") || window.location.hash.replace("#", "");
  if (game === "runner" || game === "fuwafuwa") return { mode: "runnerTitle", appMode: "runner" };
  if (game === "duel" || game === "shirigoro") return { mode: "duelName", appMode: "duel" };
  return {};
}

function loadAssets() {
  return Promise.all(Object.entries(assetList).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      assets[key] = img;
      resolve();
    };
    img.src = src;
  })));
}

function resetGame(options = {}) {
  state = {
    mode: options.mode || "ready",
    appMode: options.appMode || "runner",
    time: 0,
    modeTime: 0,
    distance: 0,
    displayedScore: 0,
    enemyScore: 0,
    peachCount: 0,
    goldenPeachCount: 0,
    microphoneCount: 0,
    yakitoriCount: 0,
    lives: 3,
    maxLives: 5,
    invincible: 0,
    damageCooldown: 0,
    spawnEnemy: 0.8,
    spawnItem: 1.4,
    dashCatCooldown: 7,
    sparkleTimer: 0,
    sparkleCooldown: 12,
    sootTimer: 0,
    speed: 185,
    shake: 0,
    player: {
      x: 82,
      y: H * 0.52,
      vy: 0,
      w: 96,
      h: 86,
      angle: 0,
    },
    enemies: [],
    dashCats: [],
    items: [],
    particles: [],
    scorePops: [],
    sparkles: [],
    lastEnemyY: H * 0.5,
    rankPrompted: false,
    pendingRankScore: options.pendingRankScore || 0,
    titleRankIn: Boolean(options.titleRankIn),
    showHelp: false,
    helpScroll: 0,
    runnerRankScroll: 0,
    duelRankScroll: 0,
    duel: null,
    clouds: Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * W,
      y: i * 84 + Math.random() * 42,
      s: 0.7 + Math.random() * 0.7,
      speed: 22 + Math.random() * 22,
    })),
  };
}

function tap() {
  if (!rankForm.hidden) return;
  if (state.showHelp) return;
  if (state.appMode === "duel") {
    tapDuel();
    return;
  }
  if (state.mode === "over") {
    if (state.modeTime < 1) return;
    const finalScore = score();
    const shouldRank = state.rankPrompted || isRankIn(finalScore);
    resetGame({
      mode: "runnerTitle",
      appMode: "runner",
      pendingRankScore: finalScore,
      titleRankIn: shouldRank,
    });
    if (finalScore >= 0) {
      window.setTimeout(() => showRankForm(finalScore, true), 120);
    }
    return;
  }
  if (state.mode === "runnerTitle") {
    state.mode = "play";
  }
  if (state.mode === "ready") {
    return;
  }
  if (state.mode !== "play") return;
  state.player.vy = -365;
  addParticles(state.player.x + 18, state.player.y + state.player.h - 8, "#ffffff", 8);
  playJumpSound();
}

function loadLocalRankings() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANK_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((r) => r && typeof r.name === "string" && Number.isFinite(r.score)).slice(0, RANK_FETCH_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function saveLocalRankings() {
  localStorage.setItem(RANK_KEY, JSON.stringify(rankings.slice(0, RANK_FETCH_LIMIT)));
}

function loadLocalDuelRankings() {
  try {
    const saved = JSON.parse(localStorage.getItem(DUEL_RANK_KEY) || "[]");
    return Array.isArray(saved)
      ? saved
        .filter((r) => r && typeof r.name === "string" && Number.isFinite(r.score))
        .map(normalizeDuelRank)
        .slice(0, RANK_FETCH_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function saveLocalDuelRankings() {
  localStorage.setItem(DUEL_RANK_KEY, JSON.stringify(duelRankings.slice(0, RANK_FETCH_LIMIT)));
}

async function refreshRankings() {
  try {
    const response = await fetch(`${SCORES_ENDPOINT}?select=name,score&order=score.desc,created_at.asc&limit=${RANK_FETCH_LIMIT}`, {
      headers: supabaseHeaders(),
    });
    if (!response.ok) throw new Error(`Ranking fetch failed: ${response.status}`);
    const rows = await response.json();
    rankings = rows
      .filter((r) => r && typeof r.name === "string" && Number.isFinite(r.score))
      .slice(0, RANK_FETCH_LIMIT);
    saveLocalRankings();
  } catch (error) {
    console.warn(error);
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

async function refreshDuelRankings() {
  try {
    const response = await fetch(`${DUEL_SCORES_ENDPOINT}?select=name,score,stage,best_time&order=score.desc,stage.desc,best_time.asc,updated_at.asc&limit=${RANK_FETCH_LIMIT}`, {
      headers: supabaseHeaders(),
    });
    if (!response.ok) throw new Error(`Duel ranking fetch failed: ${response.status}`);
    const rows = await response.json();
    duelRankings = rows
      .filter((r) => r && typeof r.name === "string" && Number.isFinite(r.score))
      .map(normalizeDuelRank)
      .slice(0, RANK_FETCH_LIMIT);
    saveLocalDuelRankings();
  } catch (error) {
    console.warn(error);
  }
}

function normalizeDuelRank(rank) {
  return {
    name: rank.name,
    score: rank.score,
    stage: rank.stage,
    bestTime: Number.isFinite(rank.bestTime) ? rank.bestTime : rank.best_time,
  };
}

function betterDuelResult(score, bestTime, current) {
  if (!current) return true;
  if (score > (current.score ?? -1)) return true;
  return score === current.score && Number.isFinite(bestTime) && (!Number.isFinite(current.bestTime) || bestTime < current.bestTime);
}

async function saveDuelBest(name, value, stage, bestTime) {
  const cleanName = (name || "PLAYER").trim().slice(0, 10) || "PLAYER";
  const cleanScore = Math.max(0, Math.min(999999, Math.floor(value)));
  const cleanStage = Math.max(1, Math.floor(stage));
  const cleanBestTime = Number.isFinite(bestTime) ? Math.max(0, Number(bestTime.toFixed(3))) : null;
  let rankIn = false;

  try {
    const existingResponse = await fetch(`${DUEL_SCORES_ENDPOINT}?select=score,best_time&name=eq.${encodeURIComponent(cleanName)}&limit=1`, {
      headers: supabaseHeaders(),
    });
    if (!existingResponse.ok) throw new Error(`Duel ranking lookup failed: ${existingResponse.status}`);
    const existing = await existingResponse.json();
    const currentBest = existing[0] ? normalizeDuelRank(existing[0]) : null;
    if (!betterDuelResult(cleanScore, cleanBestTime, currentBest)) {
      await refreshDuelRankings();
      return false;
    }

    const method = existing.length ? "PATCH" : "POST";
    const url = existing.length ? `${DUEL_SCORES_ENDPOINT}?name=eq.${encodeURIComponent(cleanName)}` : DUEL_SCORES_ENDPOINT;
    const response = await fetch(url, {
      method,
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ name: cleanName, score: cleanScore, stage: cleanStage, best_time: cleanBestTime }),
    });
    if (!response.ok) throw new Error(`Duel ranking save failed: ${response.status}`);
    await refreshDuelRankings();
    rankIn = duelRankings.some((rank, index) => index < RANK_LIMIT && rank.name === cleanName && rank.score === cleanScore);
  } catch (error) {
    console.warn(error);
    const previous = duelRankings.find((rank) => rank.name === cleanName);
    if (betterDuelResult(cleanScore, cleanBestTime, previous)) {
      duelRankings = duelRankings.filter((rank) => rank.name !== cleanName);
      duelRankings.push({ name: cleanName, score: cleanScore, stage: cleanStage, bestTime: cleanBestTime });
      duelRankings.sort((a, b) => b.score - a.score || (b.stage || 0) - (a.stage || 0) || ((a.bestTime ?? 999) - (b.bestTime ?? 999)));
      duelRankings = duelRankings.slice(0, RANK_FETCH_LIMIT);
      saveLocalDuelRankings();
      rankIn = duelRankings.some((rank, index) => index < RANK_LIMIT && rank.name === cleanName && rank.score === cleanScore);
    }
  }
  return rankIn;
}

function isRankIn(value) {
  const topRanks = rankings.slice(0, RANK_LIMIT);
  return value > 0 && (topRanks.length < RANK_LIMIT || value > topRanks[topRanks.length - 1].score);
}

async function addRanking(name, value) {
  const cleanName = (name || "PLAYER").trim().slice(0, 10) || "PLAYER";
  const cleanScore = Math.max(0, Math.min(999999, Math.floor(value)));
  try {
    const response = await fetch(SCORES_ENDPOINT, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ name: cleanName, score: cleanScore }),
    });
    if (!response.ok) throw new Error(`Ranking insert failed: ${response.status}`);
    await refreshRankings();
  } catch (error) {
    console.warn(error);
    rankings.push({ name: cleanName, score: cleanScore });
    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, RANK_FETCH_LIMIT);
    saveLocalRankings();
  }
}

function showRankForm(value, onTitle = false) {
  rankForm.querySelector("label").textContent = isRankIn(value) ? `RANK IN! ${value}` : `SCORE ${value}`;
  rankForm.hidden = false;
  rankSkip.hidden = false;
  rankForm.dataset.purpose = "runnerRank";
  rankForm.dataset.score = String(value);
  rankForm.classList.toggle("title-rank-form", onTitle);
  rankName.value = "";
  window.setTimeout(() => rankName.focus(), 0);
}

function hideRankForm() {
  rankForm.hidden = true;
  rankForm.dataset.purpose = "";
  rankForm.dataset.score = "";
  rankForm.classList.remove("title-rank-form");
  rankSkip.hidden = false;
  rankName.setCustomValidity("");
  canvas.focus();
}

function skipRankForm() {
  hideRankForm();
  state.titleRankIn = false;
  state.pendingRankScore = 0;
}

function spawnEnemy() {
  const roll = Math.random();
  const type = roll < 0.18 ? "runnerExploder" : roll < 0.48 ? "octopus" : "squirrel";
  const difficulty = difficultyLevel();
  const size = type === "octopus"
    ? 54 + Math.random() * 18
    : type === "runnerExploder"
      ? 70 + Math.random() * 14
      : 58 + Math.random() * 20 + difficulty * 18;
  const aspect = type === "runnerExploder" ? 1.65 : 1;
  const y = chooseEnemyY(size);
  state.enemies.push({
    type,
    x: W + 82,
    y,
    w: size * aspect,
    h: size,
    drift: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
    baseY: 0,
    wildness: 1 + difficulty * 1.6,
  });
  state.enemies[state.enemies.length - 1].baseY = state.enemies[state.enemies.length - 1].y;
  state.lastEnemyY = y;
}

function chooseEnemyY(size) {
  const top = 96;
  const bottom = H - 126 - size;
  const existing = state.enemies.filter((enemy) => enemy.x > W - 60);
  let bestY = top + Math.random() * Math.max(1, bottom - top);
  let bestScore = -Infinity;
  for (let i = 0; i < 10; i++) {
    const candidate = top + Math.random() * Math.max(1, bottom - top);
    const nearestGap = existing.reduce((minGap, enemy) => {
      const gap = Math.abs((enemy.y + enemy.h * 0.5) - (candidate + size * 0.5));
      return Math.min(minGap, gap);
    }, 999);
    const lastGap = Math.abs((state.lastEnemyY || H * 0.5) - candidate);
    const playerGap = Math.abs((state.player.y + state.player.h * 0.5) - (candidate + size * 0.5));
    const score = nearestGap * 1.4 + lastGap * 0.7 + playerGap * 0.25;
    if (score > bestScore) {
      bestScore = score;
      bestY = candidate;
    }
  }
  return bestY;
}

function spawnItem() {
  const roll = Math.random();
  let kind = "peach";
  if (state.sparkleTimer > 0) {
    if (roll < 0.16) kind = "goldenPeach";
    else if (roll < 0.48) kind = "peach";
    else if (roll < 0.74) kind = "microphone";
    else if (roll < 0.84) kind = "beer";
    else if (roll < 0.92) kind = "pudding";
    else kind = "yakitori";
  } else {
    if (roll < 0.04) kind = "goldenPeach";
    else if (roll < 0.14) kind = "beer";
    else if (roll < 0.30) kind = "yakitori";
    else if (roll < 0.44) kind = "pudding";
    else if (roll < 0.54) kind = "bomb";
    else if (roll < 0.68) kind = "microphone";
  }

  const item = itemKinds[kind];
  state.items.push({
    kind,
    x: W + 52,
    y: 96 + Math.random() * (H - 210),
    w: item.size,
    h: item.size,
    bob: Math.random() * Math.PI * 2,
  });
}

function update(dt) {
  state.modeTime += dt;
  updateMusic();
  if (state.appMode === "duel") {
    updateClouds(dt);
    updateDuel(dt);
    return;
  }
  if (state.mode !== "play") {
    state.shake = Math.max(0, state.shake - dt * 30);
    updateClouds(dt);
    return;
  }

  state.time += dt;
  state.distance += dt * state.speed * 0.08;
  state.speed = Math.min(330, state.speed + dt * 4);
  state.invincible = Math.max(0, state.invincible - dt);
  state.damageCooldown = Math.max(0, state.damageCooldown - dt);
  state.sparkleTimer = Math.max(0, state.sparkleTimer - dt);
  state.sootTimer = Math.max(0, state.sootTimer - dt);
  if (state.sootTimer > 0 && Math.random() < dt * 18) {
    addSmokeParticles(state.player.x + state.player.w * 0.5, state.player.y + 18, 1);
  }
  state.shake = Math.max(0, state.shake - dt * 30);
  state.displayedScore += (score() - state.displayedScore) * Math.min(1, dt * 8);

  updateClouds(dt);
  updatePlayer(dt);
  updateSpawns(dt);
  updateEnemies(dt);
  updateDashCat(dt);
  updateItems(dt);
  updateParticles(dt);
  updateScorePops(dt);
  updateSparkles(dt);
}

function updateClouds(dt) {
  for (const cloud of state.clouds) {
    cloud.x -= cloud.speed * dt;
    if (cloud.x < -140) {
      cloud.x = W + 80 + Math.random() * 80;
      cloud.y = Math.random() * H;
      cloud.s = 0.7 + Math.random() * 0.7;
    }
  }
}

function updatePlayer(dt) {
  const p = state.player;
  p.vy += 780 * dt;
  p.y += p.vy * dt;
  p.angle = Math.max(-0.22, Math.min(0.28, p.vy / 850));

  if (p.y < 42) {
    p.y = 42;
    p.vy = 18;
  }

  if (p.y > H - p.h - 22) {
    p.y = H - p.h - 22;
    instantDeath();
  }
}

function updateSpawns(dt) {
  state.spawnEnemy -= dt;
  state.spawnItem -= dt;
  if (state.sparkleTimer <= 0) {
    state.sparkleCooldown -= dt;
  }
  if (state.distance > DASH_CAT_UNLOCK_DISTANCE && state.dashCats.length === 0) {
    state.dashCatCooldown -= dt;
  }

  if (state.spawnEnemy <= 0) {
    spawnEnemy();
    state.spawnEnemy = Math.max(0.94, 1.55 - state.time * 0.01) + Math.random() * 0.68;
  }

  if (state.spawnItem <= 0) {
    spawnItem();
    state.spawnItem = state.sparkleTimer > 0 ? 0.46 + Math.random() * 0.28 : 1.08 + Math.random() * 0.85;
  }

  if (state.sparkleCooldown <= 0) {
    startSparkleTime();
  }

  if (state.dashCatCooldown <= 0) {
    spawnDashCatWarning();
    state.dashCatCooldown = 8.5 + Math.random() * 3;
  }
}

function startSparkleTime() {
  state.sparkleTimer = 7;
  state.sparkleCooldown = 18 + Math.random() * 8;
  state.spawnItem = Math.min(state.spawnItem, 0.25);
  addTextPop(W * 0.5, H * 0.22, "キラキラタイム!", "#ffb72e");
  addParticles(W * 0.5, H * 0.22, "#ffd85a", 28);
}

function spawnDashCatWarning() {
  const count = dashCatCount();
  const lanes = [
    H * 0.22,
    H * 0.5,
    H * 0.78,
    state.player.y + state.player.h * 0.5,
  ].map((y) => Math.max(108, Math.min(H - 118, y)));
  const uniqueLanes = [];
  for (const y of lanes) {
    if (!uniqueLanes.some((other) => Math.abs(other - y) < 142)) uniqueLanes.push(y);
  }

  state.dashCats = uniqueLanes.slice(0, count).map((y, index) => ({
    phase: "warn",
    timer: 1.05,
    x: W + 132 + index * 28,
    y,
    w: 132,
    h: 62,
    speed: 650 + difficultyLevel() * 80,
  }));
}

function updateEnemies(dt) {
  const pBox = playerHitbox();
  for (const enemy of state.enemies) {
    const previousX = enemy.x;
    if (enemy.type === "octopus") {
      enemy.x -= (state.speed * 0.86 + Math.sin(state.time * 5.4 + enemy.phase) * 58 * enemy.wildness) * dt;
      enemy.baseY += Math.sin(state.time * 2.2 + enemy.drift) * 20 * enemy.wildness * dt;
      enemy.y = enemy.baseY
        + Math.sin(state.time * 7.2 + enemy.phase) * 34 * enemy.wildness
        + Math.sin(state.time * 13 + enemy.phase) * 9 * enemy.wildness;
    } else if (enemy.type === "runnerExploder") {
      enemy.x -= (state.speed * 1.08 + 30) * dt;
      enemy.y = enemy.baseY + Math.sin(state.time * 4.8 + enemy.phase) * 18;
    } else {
      enemy.x -= state.speed * dt;
      const targetY = state.player.y + state.player.h * 0.5 - enemy.h * 0.5;
      const chase = Math.min(92, 34 + difficultyLevel() * 28);
      enemy.y += Math.sign(targetY - enemy.y) * Math.min(Math.abs(targetY - enemy.y), chase * dt);
      enemy.y += Math.sin(state.time * 2.5 + enemy.drift) * 18 * dt;
    }
    if (previousX > W && enemy.x <= W) {
      enforceEntryGap(enemy);
    }
    if (intersects(pBox, enemy)) {
      if (state.invincible > 0) {
        enemy.dead = true;
        addEnemyScore(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        addParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ffd76c", 14);
        playVoiceClip("invincibleKill");
      } else {
        if (enemy.type === "runnerExploder") {
          explodeRunnerEnemy(enemy);
        } else {
          takeDamage();
        }
      }
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead && enemy.x > -100);
}

function enforceEntryGap(enemy) {
  for (const other of state.enemies) {
    if (other === enemy || other.dead) continue;
    const xGap = Math.abs((other.x + other.w * 0.5) - (enemy.x + enemy.w * 0.5));
    const yGap = Math.abs((other.y + other.h * 0.5) - (enemy.y + enemy.h * 0.5));
    if (xGap < 170 && yGap < 118) {
      enemy.y += enemy.y < H * 0.5 ? -126 : 126;
      enemy.y = Math.max(92, Math.min(H - enemy.h - 94, enemy.y));
      enemy.baseY = enemy.y;
      break;
    }
  }
}

function updateDashCat(dt) {
  for (const cat of state.dashCats) {
    if (cat.phase === "warn") {
      cat.timer -= dt;
      if (cat.timer <= 0) {
        cat.phase = "dash";
        cat.x = W + 132;
      }
      continue;
    }

    cat.x -= cat.speed * dt;
    const catBox = {
      x: cat.x + 12,
      y: cat.y - cat.h / 2 + 9,
      w: cat.w - 18,
      h: cat.h - 18,
    };

    if (intersects(playerHitbox(), catBox)) {
      if (state.invincible > 0) {
        addEnemyScore(cat.x + cat.w / 2, cat.y, 2);
        addParticles(cat.x + cat.w / 2, cat.y, "#ffd76c", 24);
        cat.dead = true;
        playVoiceClip("invincibleKill");
        continue;
      }
      takeDamage();
    }

    if (cat.x < -180) {
      cat.dead = true;
    }
  }
  state.dashCats = state.dashCats.filter((cat) => !cat.dead);
}

function updateItems(dt) {
  const pBox = playerHitbox();
  for (const item of state.items) {
    item.x -= (state.speed + 16) * dt;
    item.y += Math.sin(state.time * 4 + item.bob) * 18 * dt;
    if (intersects(pBox, item)) {
      collectItem(item.kind, item.x + item.w / 2, item.y + item.h / 2);
      item.dead = true;
    }
  }
  state.items = state.items.filter((item) => !item.dead && item.x > -80);
}

function collectItem(kind, x, y) {
  if (kind === "beer") {
    state.invincible = 5;
    addTextPop(x, y, "無敵!", "#f4a62a");
    addParticles(x, y, "#ffe28a", 18);
    playPowerSound();
    playVoiceClip("itemBeer");
  } else if (kind === "yakitori") {
    state.yakitoriCount += 1;
    if (state.yakitoriCount % 3 === 0) heal(1);
    addTextPop(x, y, state.yakitoriCount % 3 === 0 ? "回復!" : `${state.yakitoriCount % 3}/3`, "#d97832");
    addParticles(x, y, "#f4a04e", 10);
    playItemSound();
    playVoiceClip("itemYakitori");
  } else if (kind === "pudding") {
    heal(1);
    addTextPop(x, y, "回復!", "#d8a22c");
    addParticles(x, y, "#fff0a4", 12);
    playPowerSound();
    playVoiceClip("itemPudding");
  } else if (kind === "bomb") {
    const defeated = state.enemies.length;
    state.enemies = [];
    const dashCatDefeated = state.dashCats.length * 2;
    state.dashCats = [];
    if (defeated + dashCatDefeated > 0) {
      addEnemyScore(W * 0.5, H * 0.48, defeated + dashCatDefeated);
    }
    state.shake = 10;
    addTextPop(x, y, "爆破!", "#ff6048");
    addParticles(W * 0.5, H * 0.48, "#ff6b4a", 36);
    playExplosionSound();
    playVoiceClip("itemBomb");
  } else if (kind === "peach") {
    state.peachCount += 1;
    addScorePop(x, y, 100, "#ff668a");
    addParticles(x, y, "#ffb1b8", 12);
    playItemSound();
    playVoiceClip("itemPeach");
  } else if (kind === "goldenPeach") {
    state.goldenPeachCount += 1;
    addScorePop(x, y, 1000, "#f4a62a");
    addTextPop(x, y - 24, "激レア!", "#ffcf33");
    addParticles(x, y, "#ffd85a", 24);
    playPowerSound();
    playVoiceClip("itemRare");
  } else if (kind === "microphone") {
    state.microphoneCount += 1;
    addScorePop(x, y, 250, "#7b68ff");
    addParticles(x, y, "#d9d7ee", 14);
    addParticles(x, y, "#ffd05c", 8);
    playItemSound();
    playVoiceClip("itemMic");
  }
}

function heal(amount) {
  state.lives = Math.min(state.maxLives, state.lives + amount);
}

function takeDamage() {
  if (state.damageCooldown > 0 || state.invincible > 0) return;
  state.lives -= 1;
  state.damageCooldown = 1.1;
  state.shake = 7;
  addDamageVoiceWithAudio();
  addParticles(state.player.x + 32, state.player.y + 34, "#ff6580", 18);
  playDamageSound();
  if (state.lives <= 0) {
    setGameOver();
  }
}

function explodeRunnerEnemy(enemy) {
  if (state.damageCooldown > 0) return;
  enemy.dead = true;
  state.sootTimer = 1.4;
  state.shake = 13;
  addTextPop(state.player.x + state.player.w * 0.5, state.player.y + 4, "爆発!", "#ff6048");
  addParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, "#ff6b4a", 34);
  addParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, "#3e3e3e", 20);
  addSmokeParticles(state.player.x + state.player.w * 0.5, state.player.y + 28, 18);
  playExplosionSound();
  takeDamage();
}

function addDamageVoice() {
  const voices = ["いて", "うわ", "もお！"];
  const text = voices[Math.floor(Math.random() * voices.length)];
  addTextPop(state.player.x + state.player.w * 0.7, state.player.y + 8, text, "#ff5b7a");
}

function addDamageVoiceWithAudio() {
  const voices = [
    { text: "\u3044\u3066", clip: "damageIte" },
    { text: "\u3046\u308f", clip: "damageUwa" },
    { text: "\u3082\u304a\uff01", clip: "damageMoo" },
  ];
  const voice = voices[Math.floor(Math.random() * voices.length)];
  addTextPop(state.player.x + state.player.w * 0.7, state.player.y + 8, voice.text, "#ff5b7a");
  playVoiceClip(voice.clip);
}

function instantDeath() {
  if (state.mode !== "play") return;
  state.lives = 0;
  state.damageCooldown = 1.1;
  state.shake = 12;
  addParticles(state.player.x + 32, H - 30, "#ff6580", 28);
  setGameOver();
}

function setGameOver() {
  if (state.mode === "over") return;
  state.mode = "over";
  state.modeTime = 0;
  playLoseSound();
  playVoiceClip("deathScream");
  const finalScore = score();
  window.setTimeout(() => playVoiceClip(scoreVoiceClipForScore(finalScore)), 1200);
  if (!state.rankPrompted && isRankIn(finalScore)) {
    state.rankPrompted = true;
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    if (particle.smoke) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 20 * dt;
      particle.size += 16 * dt;
    } else {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 210 * dt;
    }
    particle.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function updateScorePops(dt) {
  for (const pop of state.scorePops) {
    pop.y -= 42 * dt;
    pop.life -= dt;
    pop.scale += dt * 0.9;
  }
  state.scorePops = state.scorePops.filter((pop) => pop.life > 0);
}

function updateSparkles(dt) {
  if (state.sparkleTimer > 0 && Math.random() < dt * 52) {
    state.sparkles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 5 + Math.random() * 10,
      life: 0.9 + Math.random() * 0.9,
      twinkle: Math.random() * Math.PI * 2,
      color: Math.random() < 0.55 ? "#fff5a8" : "#ffd1ec",
    });
  }

  for (const sparkle of state.sparkles) {
    sparkle.life -= dt;
  }
  state.sparkles = state.sparkles.filter((sparkle) => sparkle.life > 0);
}

function addParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 45 + Math.random() * 150;
    const life = 0.35 + Math.random() * 0.45;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      size: 3 + Math.random() * 5,
      life,
      maxLife: life,
    });
  }
}

function addSmokeParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const s = 28 + Math.random() * 62;
    const life = 0.65 + Math.random() * 0.55;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(a) * s + (Math.random() - 0.5) * 24,
      vy: Math.sin(a) * s,
      color: Math.random() < 0.45 ? "#1e1e1e" : "#5c5c5c",
      size: 8 + Math.random() * 12,
      life,
      maxLife: life,
      smoke: true,
    });
  }
}

function addScorePop(x, y, points, color) {
  state.scorePops.push({
    x,
    y,
    text: `+${points}!`,
    color,
    life: 0.95,
    scale: 1,
  });
}

function addTextPop(x, y, text, color) {
  state.scorePops.push({
    x,
    y,
    text,
    color,
    life: 0.9,
    scale: 1,
  });
}

function addEnemyScore(x, y, count = 1) {
  const points = count * 150;
  state.enemyScore += points;
  addScorePop(x, y, points, "#ff9b45");
}

function ensureAudio() {
  initVoiceClips();
  if (audioState.ctx) {
    if (audioState.ctx.state === "suspended") audioState.ctx.resume();
    audioState.enabled = true;
    unlockVoiceClips();
    return audioState.ctx;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  audioState.ctx = new AudioCtor();
  audioState.enabled = true;
  audioState.nextNoteAt = audioState.ctx.currentTime + 0.08;
  unlockVoiceClips();
  return audioState.ctx;
}

function initVoiceClips() {
  if (audioState.clipsReady) return;
  audioState.clipsReady = true;
  Object.entries(voiceClipList).forEach(([key, src]) => {
    const clip = document.createElement("video");
    clip.src = src;
    clip.preload = "auto";
    clip.playsInline = true;
    clip.setAttribute("playsinline", "");
    clip.setAttribute("webkit-playsinline", "");
    clip.volume = 0.92;
    clip.style.position = "fixed";
    clip.style.left = "-9999px";
    clip.style.top = "0";
    clip.style.width = "1px";
    clip.style.height = "1px";
    clip.style.opacity = "0";
    document.body.appendChild(clip);
    clip.load();
    audioState.clips[key] = clip;
  });
}

function unlockVoiceClips() {
  if (audioState.clipsUnlocked) return;
  audioState.clipsUnlocked = true;
  Object.values(audioState.clips).forEach((clip) => clip.load());
}

function playVoiceClip(key) {
  if (!audioState.enabled) return;
  initVoiceClips();
  const clip = audioState.clips[key];
  if (!clip) return;
  const player = clip.cloneNode(true);
  player.volume = clip.volume;
  player.playsInline = true;
  player.setAttribute("playsinline", "");
  player.setAttribute("webkit-playsinline", "");
  player.style.position = "fixed";
  player.style.left = "-9999px";
  player.style.top = "0";
  player.style.width = "1px";
  player.style.height = "1px";
  player.style.opacity = "0";
  player.currentTime = 0;
  document.body.appendChild(player);
  const cleanup = () => player.remove();
  player.addEventListener("ended", cleanup, { once: true });
  player.addEventListener("error", cleanup, { once: true });
  const promise = player.play();
  if (promise?.catch) promise.catch(cleanup);
}

function playTone(freq, start, duration, type = "sine", volume = 0.05, endFreq = null) {
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctxAudio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playNoise(start, duration, volume = 0.08, tone = 900) {
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const sampleRate = ctxAudio.sampleRate;
  const buffer = ctxAudio.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctxAudio.createBufferSource();
  const filter = ctxAudio.createBiquadFilter();
  const gain = ctxAudio.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(tone, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctxAudio.destination);
  source.start(start);
  source.stop(start + duration);
}

function updateMusic() {
  if (!audioState.enabled || !audioState.ctx) return;
  const ctxAudio = audioState.ctx;
  const mode = state?.appMode === "duel" ? "duel" : "runner";
  if (audioState.mode !== mode) {
    audioState.mode = mode;
    audioState.noteIndex = 0;
    audioState.nextNoteAt = ctxAudio.currentTime + 0.08;
  }
  const runnerNotes = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 1567.98, 1318.51, 1174.66];
  const duelNotes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];
  const notes = mode === "duel" ? duelNotes : runnerNotes;
  const step = mode === "duel" ? 0.34 : 0.54;
  while (audioState.nextNoteAt < ctxAudio.currentTime + 0.18) {
    const note = notes[audioState.noteIndex % notes.length];
    if (mode === "runner") {
      playTone(note, audioState.nextNoteAt, step * 0.32, "sine", 0.018);
      playTone(note * 1.5, audioState.nextNoteAt + 0.015, step * 0.2, "triangle", 0.004);
      if (audioState.noteIndex % 8 === 0) {
        playTone(523.25, audioState.nextNoteAt, step * 1.4, "sine", 0.004);
      }
    } else {
      playTone(note, audioState.nextNoteAt, step * 0.62, "triangle", 0.026);
      if (audioState.noteIndex % 2 === 0) {
        playTone(note / 2, audioState.nextNoteAt, step * 0.9, "triangle", 0.014);
      }
    }
    audioState.noteIndex += 1;
    audioState.nextNoteAt += step;
  }
}

function audioNow() {
  const ctxAudio = ensureAudio();
  return ctxAudio ? ctxAudio.currentTime : 0;
}

function playJumpSound() {
  const t = audioNow();
  if (!t) return;
  playTone(360, t, 0.12, "sine", 0.055, 720);
}

function playItemSound() {
  const t = audioNow();
  if (!t) return;
  playTone(660, t, 0.08, "sine", 0.045);
  playTone(990, t + 0.055, 0.1, "sine", 0.04);
}

function playPowerSound() {
  const t = audioNow();
  if (!t) return;
  playTone(523, t, 0.12, "triangle", 0.05);
  playTone(784, t + 0.08, 0.13, "triangle", 0.05);
  playTone(1046, t + 0.16, 0.16, "triangle", 0.045);
}

function playDamageSound() {
  const t = audioNow();
  if (!t) return;
  playTone(260, t, 0.18, "sawtooth", 0.045, 120);
}

function playExplosionSound() {
  const t = audioNow();
  if (!t) return;
  playNoise(t, 0.42, 0.12, 520);
  playTone(110, t, 0.32, "sawtooth", 0.05, 55);
}

function playCueSound() {
  const t = audioNow();
  if (!t) return;
  playTone(880, t, 0.08, "square", 0.045);
  playTone(1320, t + 0.08, 0.08, "square", 0.04);
}

function playFakeCueSound() {
  playCueSound();
}

function playWinSound() {
  const t = audioNow();
  if (!t) return;
  [523, 659, 784, 1046].forEach((freq, i) => playTone(freq, t + i * 0.07, 0.16, "triangle", 0.05));
}

function playLoseSound() {
  const t = audioNow();
  if (!t) return;
  playTone(330, t, 0.18, "triangle", 0.05, 220);
  playTone(220, t + 0.15, 0.28, "triangle", 0.045, 110);
}

function playerHitbox() {
  const p = state.player;
  return {
    x: p.x + 14,
    y: p.y + 10,
    w: p.w - 24,
    h: p.h - 20,
  };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function score() {
  return Math.floor(state.distance)
    + state.peachCount * 100
    + state.goldenPeachCount * 1000
    + state.microphoneCount * 250
    + state.enemyScore;
}

function gameOverComment(value) {
  if (value < 80) return "...え？下手くそですか？";
  if (value < 700) return "ふーん、やるじゃん";
  return "すっごーい！";
}

function difficultyLevel() {
  return Math.min(1.8, state.distance / 260);
}

function shiriCommentForScore(value) {
  if (value <= 3000) return "\u002e\u002e\u002e\u3048\u0021\u003f\u4e0b\u624b\u3059\u304e\u003f\u003f";
  if (value <= 5000) return "\u308f\u305f\u3057\u3088\u308a\u4e0b\u624b\u3060\u306d";
  if (value <= 7000) return "\u3075\u3046\u3093\u3002\u307e\u3042\u307e\u3042\u306d";
  if (value <= 10000) return "\u3084\u308b\u3058\u3083\u3093\uff01";
  if (value <= 15000) return "\u3059\u3001\u3001\u3059\u3063\u3054\uff5e\u3044\uff01";
  return "\u7d50\u5a5a\u3057\u307e\u3057\u3087\u3046";
}

function scoreVoiceClipForScore(value) {
  if (value <= 3000) return "scoreBad";
  if (value <= 5000) return "scoreWorse";
  if (value <= 7000) return "scoreOkay";
  if (value <= 10000) return "scoreGood";
  if (value <= 15000) return "scoreGreat";
  return "scoreMarriage";
}

function dashCatCount() {
  if (state.distance > 420) return 3;
  if (state.distance > 220) return 2;
  return 1;
}

function startDuelNameEntry() {
  state.appMode = "duel";
  state.mode = "duelName";
  state.modeTime = 0;
  state.showHelp = false;
  showDuelNameForm();
}

function showDuelNameForm() {
  const label = rankForm.querySelector("label");
  label.textContent = "NAME";
  rankName.value = duelPlayerName;
  rankName.setCustomValidity("");
  rankForm.dataset.purpose = "duelName";
  rankForm.hidden = false;
  rankSkip.hidden = true;
  window.setTimeout(() => rankName.focus(), 0);
}

function startDuelRun() {
  state.appMode = "duel";
  state.mode = "duel";
  state.modeTime = 0;
  state.duel = createDuelState();
}

function createDuelState() {
  return {
    stage: 1,
    score: 0,
    phase: "intro",
    phaseTime: 0,
    message: "START!",
    detail: "",
    cueWindow: 0.62,
    fakeTimer: 0.65,
    nextFake: 0.8 + Math.random() * 0.8,
    cueDelay: 1.8 + Math.random() * 1.6,
    cueColor: "#31475d",
    messageX: W / 2,
    messageY: 174,
    enemy: DUEL_ENEMIES[0],
    resultSaved: false,
    rankIn: false,
    savingResult: false,
    bestReaction: null,
    slash: 0,
  };
}

function setupDuelStage() {
  const duel = state.duel;
  duel.enemy = DUEL_ENEMIES[(duel.stage - 1) % DUEL_MAX_STAGE];
  duel.phase = "intro";
  duel.phaseTime = 0;
  duel.message = `STAGE ${duel.stage}`;
  duel.detail = "";
  duel.cueWindow = Math.max(0.25, 0.62 * Math.pow(0.88, duel.stage - 1));
  duel.fakeTimer = 0;
  duel.nextFake = randomNextFakeDelay(duel.stage);
  duel.cueDelay = randomCueDelay(duel.stage);
  duel.cueColor = randomDuelTextColor();
  setRandomDuelMessagePosition();
  duel.slash = 0;
}

function randomCueDelay(stage) {
  const roll = Math.random();
  const pressure = Math.min(stage, 18);
  const baseMax = Math.max(1.2, 5.2 - pressure * 0.08);
  if (roll < 0.16) return 0.45 + Math.random() * 0.7;
  if (roll < 0.46) return 1.2 + Math.random() * baseMax;
  if (roll < 0.82) return 3.6 + Math.random() * 4.8;
  return 8.2 + Math.random() * 4.8;
}

function randomNextFakeDelay(stage) {
  const roll = Math.random();
  if (roll < 0.24) return 0.18 + Math.random() * 0.45;
  if (roll < 0.62) return 0.7 + Math.random() * 1.8;
  return 2.4 + Math.random() * (2.8 + Math.min(stage, 12) * 0.08);
}

function randomFakeDisplayDuration() {
  return Math.random() < 0.18 ? 0.75 + Math.random() * 0.5 : 0.28 + Math.random() * 0.5;
}

function randomFakeCueMessage() {
  const fakes = [
    "\u4eca\u3058\u3083\u306a\u3044!!!",
    "\u307e\u3060!!",
    "\u5f85\u3066!!",
    "\u3044\u307e...\u3058\u3083\u306a\u3044!",
    "\u4eca\u304b\u3082?",
    "\u4eca...?",
    "\u4eca\u304b!?",
    "\u4eca\u306a\u306e!?",
    "\u3044\u307e\u3058\u3083\u306a\u3044?",
    "\u3044\u307e\u3060\u306b\u65e9\u3044!",
    "\u30bf\u30c3\u30d7!?\u3057\u306a\u3044!",
  ];
  return fakes[Math.floor(Math.random() * fakes.length)];
}

function isDuelClearStage(stage) {
  return false;
}

function randomDuelTextColor() {
  const colors = ["#31475d", "#ff4e6a", "#3b8f72", "#7b68ff", "#c7771d"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function setRandomDuelMessagePosition() {
  const duel = state.duel;
  const slots = [
    { x: W * 0.5, y: 142 },
    { x: W * 0.34, y: 188 },
    { x: W * 0.66, y: 188 },
    { x: W * 0.5, y: 238 },
    { x: W * 0.28, y: 252 },
    { x: W * 0.72, y: 252 },
  ];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  duel.messageX = slot.x;
  duel.messageY = slot.y;
}

function updateDuel(dt) {
  const duel = state.duel;
  if (!duel) return;
  duel.phaseTime += dt;
  duel.slash = Math.max(0, duel.slash - dt * 3);

  if (duel.phase === "intro" && duel.phaseTime > 0.9) {
    duel.phase = "wait";
    duel.phaseTime = 0;
    duel.message = "";
    return;
  }

  if (duel.phase === "wait") {
    duel.cueDelay -= dt;
    duel.nextFake -= dt;
    duel.fakeTimer = Math.max(0, duel.fakeTimer - dt);
    if (duel.fakeTimer <= 0) {
      duel.message = "";
      duel.cueColor = "#31475d";
    }
    if (duel.nextFake <= 0 && duel.cueDelay > 0.35) {
      duel.message = randomFakeCueMessage();
      duel.cueColor = randomDuelTextColor();
      setRandomDuelMessagePosition();
      playFakeCueSound();
      duel.fakeTimer = randomFakeDisplayDuration();
      if (Math.random() < 0.44 && duel.cueDelay < 6.5) {
        duel.cueDelay += 0.65 + Math.random() * 3.6;
      }
      duel.nextFake = randomNextFakeDelay(duel.stage);
    }
    if (duel.cueDelay <= 0) {
      duel.phase = "cue";
      duel.phaseTime = 0;
      duel.message = "今だ!!";
      duel.cueColor = randomDuelTextColor();
      setRandomDuelMessagePosition();
      playCueSound();
    }
    return;
  }

  if (duel.phase === "cue" && duel.phaseTime > duel.cueWindow) {
    loseDuel("遅い!");
    return;
  }

  if (duel.phase === "win" && duel.phaseTime > 0.95) {
    if (isDuelClearStage(duel.stage) && !duel.resultSaved) {
      duel.resultSaved = true;
      duel.savingResult = true;
      saveDuelBest(duelPlayerName, duel.score, duel.stage, duel.bestReaction).then((rankIn) => {
        if (state.duel === duel) {
          duel.rankIn = rankIn;
          duel.savingResult = false;
        }
      });
    }
    return;
  }

  if (duel.phase === "lose" && !duel.resultSaved) {
    duel.resultSaved = true;
    duel.savingResult = true;
    saveDuelBest(duelPlayerName, duel.score, Math.max(1, duel.stage - 1), duel.bestReaction).then((rankIn) => {
      if (state.duel === duel) {
        duel.rankIn = rankIn;
        duel.savingResult = false;
      }
    });
  }
}

function tapDuel() {
  const duel = state.duel;
  if (!duel) return;
  if (duel.phase === "lose") {
    if (duel.phaseTime < 1) return;
    if (duel.savingResult) return;
    resetGame({ mode: "duelName", appMode: "duel", titleRankIn: duel.rankIn });
    showDuelNameForm();
    return;
  }
  if (duel.phase === "win") {
    if (duel.phaseTime < 0.95) return;
    if (duel.savingResult) return;
    if (isDuelClearStage(duel.stage)) {
      resetGame({ mode: "duelName", appMode: "duel", titleRankIn: duel.rankIn });
      showDuelNameForm();
      return;
    }
    duel.stage += 1;
    setupDuelStage();
    return;
  }
  if (duel.phase === "win" || duel.phase === "intro") return;
  if (duel.phase === "cue") {
    winDuel();
    return;
  }
  loseDuel("今じゃない!!!");
}

function winDuel() {
  const duel = state.duel;
  const reaction = duel.phaseTime;
  const bonus = Math.max(0, Math.floor((1 - reaction / duel.cueWindow) * 1000));
  duel.bestReaction = duel.bestReaction === null ? reaction : Math.min(duel.bestReaction, reaction);
  duel.score += 1000 + bonus;
  duel.phase = "win";
  duel.phaseTime = 0;
  duel.message = isDuelClearStage(duel.stage) ? "完全制覇!" : "しり殺!";
  duel.detail = `${reaction.toFixed(3)}秒  +${1000 + bonus}`;
  duel.slash = 1;
  playWinSound();
  playVoiceClip("duelKill");
}

function loseDuel(message) {
  const duel = state.duel;
  duel.phase = "lose";
  duel.phaseTime = 0;
  duel.message = message;
  duel.detail = `SCORE ${duel.score}`;
  duel.slash = 1;
  playLoseSound();
  if (duel.enemy === "duelStage3") playVoiceClip("duelStage3Laugh");
}

function draw() {
  syncPageTheme();
  ctx.save();
  if (state.shake > 0 && (state.mode === "play" || state.modeTime < 1)) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  if (state.appMode === "duel") {
    drawDuel();
    ctx.restore();
    return;
  }
  drawBackground();
  drawSparkles();
  drawItems();
  drawEnemies();
  drawDashCat();
  drawPlayer();
  drawParticles();
  drawScorePops();
  drawHud();
  drawOverlay();
  ctx.restore();
}

function syncPageTheme() {
  document.body.classList.toggle("duel-mode", state?.appMode === "duel");
}

function drawDuel() {
  const duel = state.duel;
  drawDuelStageBackdrop(duel?.stage || 1);
  drawHudDuel();

  if (!duel) {
    drawDuelTitle();
    return;
  }

  ctx.save();
  const floorY = H * 0.72;
  const baseY = floorY + 6;
  const shiriX = duel.phase === "win" ? 306 : duel.phase === "lose" ? 214 : 58;
  const enemyX = duel.phase === "win" ? 178 : duel.phase === "lose" ? 72 : 256;
  if (duel.phase === "lose") {
    ctx.save();
    ctx.translate(shiriX + 52, baseY - 30);
    ctx.rotate(1.25);
    drawImageCover(assets.player, -52, -47, 104, 94);
    ctx.restore();
  } else {
    drawImageCover(assets.player, shiriX, baseY - 78, 104, 94);
  }

  ctx.save();
  if (duel.phase === "win") {
    drawDuelEnemy(duel.enemy, enemyX, baseY + 8, true);
  } else {
    drawDuelEnemy(duel.enemy, enemyX, baseY + 8, false);
  }
  ctx.restore();

  if (duel.slash > 0) {
    ctx.globalAlpha = duel.slash;
    ctx.strokeStyle = duel.phase === "lose" ? "#ff5b7a" : "#fff4a8";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(75, baseY - 96);
    ctx.lineTo(318, baseY + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#31475d";
  ctx.font = "900 34px system-ui, sans-serif";
  ctx.fillStyle = duel.cueColor || "#31475d";
  if (duel.message) drawDuelCallout(duel);
  if (duel.detail) {
    drawDuelDetailLabel(duel.detail, W / 2, duel.phase === "lose" ? 112 : 232);
  }
  if (duel.phase === "win" && duel.phaseTime > 0.95) {
    ctx.globalAlpha = 0.35 + Math.sin(state.time * 8) * 0.32 + 0.32;
    drawDuelGuideLabel(isDuelClearStage(duel.stage) ? "タップでタイトルへ" : "タップで次へ", W / 2, H * 0.76, "#31475d");
    ctx.globalAlpha = 1;
  }

  if (duel.phase === "win" && isDuelClearStage(duel.stage)) {
    drawDuelClearComment(W / 2, H * 0.82);
  }

  if (duel.phase === "wait") {
    drawDuelGuideLabel("合図を待て...", W / 2, 94, "#52677d");
  }

  if (duel.phase === "lose") {
    drawDuelGuideLabel("タップでタイトルへ", W / 2, 286, "#52677d");
  }

  ctx.restore();
}

function duelEnemySize(key) {
  const sizes = {
    squirrel: [84, 74],
    octopus: [84, 74],
    dashCat: [94, 64],
    duelStage3: [74, 120],
    duelGhost: [122, 118],
    duelMouse: [92, 90],
    duelRedOctopus: [58, 106],
    duelBeaver: [84, 92],
    duelShieru: [88, 122],
    duelReaper: [106, 136],
  };
  const [w, h] = sizes[key] || [84, 74];
  return { w, h };
}

function drawDuelEnemy(key, x, bottomY, fallen) {
  const img = assets[key];
  if (!img) return;
  const size = duelEnemySize(key);
  if (fallen) {
    ctx.save();
    ctx.translate(x + size.w * 0.42, bottomY - size.h * 0.18);
    ctx.rotate(1.55);
    drawImageCover(img, -size.w / 2, -size.h / 2, size.w, size.h);
    ctx.restore();
    return;
  }
  drawImageCover(img, x, bottomY - size.h, size.w, size.h);
}

function drawDuelDetailLabel(text, x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 20px system-ui, sans-serif";
  const width = Math.min(W - 64, Math.max(156, ctx.measureText(text).width + 34));
  const height = 38;

  ctx.shadowColor = "rgba(24, 31, 48, 0.22)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(255, 107, 127, 0.82)";
  ctx.lineWidth = 2;
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.fillStyle = "#ff4f6d";
  ctx.strokeText(text, x, y + 1);
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawDuelRankInLabel(x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 24px system-ui, sans-serif";
  const text = "RANK IN!";
  const width = ctx.measureText(text).width + 46;
  const height = 42;

  ctx.shadowColor = "rgba(24, 31, 48, 0.2)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(255, 247, 184, 0.96)";
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(255, 120, 151, 0.62)";
  ctx.lineWidth = 3;
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.stroke();

  ctx.fillStyle = "#ff5b7a";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawTitleRankInLabel(x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 22px system-ui, sans-serif";
  const text = "RANK IN!";
  const width = Math.max(156, ctx.measureText(text).width + 54);
  const height = 46;

  ctx.shadowColor = "rgba(41, 86, 119, 0.24)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(147, 215, 242, 0.92)";
  ctx.lineWidth = 2;
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.stroke();

  ctx.fillStyle = "#31475d";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawDuelGuideLabel(text, x, y, color) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 23px system-ui, sans-serif";
  const width = Math.min(W - 68, Math.max(172, ctx.measureText(text).width + 38));
  const height = 42;

  ctx.shadowColor = "rgba(24, 31, 48, 0.2)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(49, 71, 93, 0.48)";
  ctx.lineWidth = 2;
  roundRect(x - width / 2, y - height / 2, width, height, 8);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y + 1);
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawDuelClearComment(cx, y) {
  ctx.save();
  const portraitSize = 48;
  const portraitX = cx - 132;
  const portraitY = y - 32;
  const bubbleX = portraitX + portraitSize + 2;
  const bubbleY = y - 34;
  const bubbleW = 202;
  const bubbleH = 44;

  drawImageCover(assets.player, portraitX, portraitY, portraitSize, portraitSize);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bubbleX + 4, bubbleY + 28);
  ctx.lineTo(bubbleX - 13, bubbleY + 35);
  ctx.lineTo(bubbleX + 9, bubbleY + 36);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 107, 127, 0.5)";
  ctx.lineWidth = 2;
  roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
  ctx.stroke();

  ctx.fillStyle = "#ff4f6d";
  ctx.textAlign = "left";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText("きゃー！すてき！", bubbleX + 16, bubbleY + 28);
  ctx.restore();
}

function drawDuelCallout(duel) {
  const text = duel.message;
  const isCue = duel.phase === "cue";
  const isWin = duel.phase === "win";
  const isLose = duel.phase === "lose";
  const x = isWin || isLose ? W / 2 : duel.messageX || W / 2;
  const y = isWin ? 164 : isLose ? 194 : duel.messageY || 174;
  const accent = isLose ? "#ff5b7a" : isWin ? "#f3b33f" : duel.cueColor || "#31475d";
  const fontSize = isCue || isWin ? 40 : 29;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + (isCue ? Math.sin(state.time * 15) * 0.035 : 0), 1);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
  const width = Math.min(W - 44, Math.max(150, ctx.measureText(text).width + 58));
  const height = isCue || isWin ? 74 : 58;

  if (isCue || isWin || isLose) {
    ctx.save();
    ctx.globalAlpha = isCue ? 0.75 : 0.48;
    ctx.strokeStyle = accent;
    ctx.lineWidth = isCue ? 4 : 3;
    for (let i = 0; i < 22; i++) {
      const a = (Math.PI * 2 * i) / 22 + state.time * 0.15;
      const inner = width * 0.4 + (i % 2) * 8;
      const outer = width * 0.63 + (i % 3) * 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * height * 0.35);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * height * 0.58);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.shadowColor = "rgba(25, 35, 58, 0.24)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "rgba(255, 252, 236, 0.94)";
  ctx.beginPath();
  ctx.moveTo(-width / 2 + 14, -height / 2 + 4);
  ctx.lineTo(-width / 2 + width * 0.36, -height / 2 - 5);
  ctx.lineTo(width / 2 - 18, -height / 2 + 2);
  ctx.lineTo(width / 2 + 8, -4);
  ctx.lineTo(width / 2 - 10, height / 2 - 2);
  ctx.lineTo(width / 2 - width * 0.32, height / 2 + 6);
  ctx.lineTo(-width / 2 + 20, height / 2 - 1);
  ctx.lineTo(-width / 2 - 8, 3);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = accent;
  roundRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 8);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineJoin = "round";
  ctx.lineWidth = isCue ? 9 : 7;
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.strokeText(text, 0, 0);
  ctx.lineWidth = isCue ? 3 : 2;
  ctx.strokeStyle = accent;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = isCue ? "#222f46" : "#31475d";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawDuelStageBackdrop(stage) {
  const theme = (stage - 1) % 4;
  const floorY = H * 0.62;
  ctx.save();
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#182039");
  base.addColorStop(0.46, "#51314a");
  base.addColorStop(1, "#17121f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  if (assets.duelBackgrounds) {
    const img = assets.duelBackgrounds;
    const sw = img.width / 2;
    const sh = img.height / 2;
    const sx = (theme % 2) * sw;
    const sy = Math.floor(theme / 2) * sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    const vignette = ctx.createLinearGradient(0, 0, 0, H);
    vignette.addColorStop(0, "rgba(255,255,255,0.03)");
    vignette.addColorStop(0.48, "rgba(255,255,255,0)");
    vignette.addColorStop(1, "rgba(12, 18, 34, 0.16)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (theme === 0) {
    const glow = ctx.createLinearGradient(0, 130, 0, floorY);
    glow.addColorStop(0, "rgba(255, 244, 196, 0.10)");
    glow.addColorStop(1, "rgba(255, 171, 105, 0.26)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 92, W, floorY - 92);
    ctx.fillStyle = "rgba(255, 160, 96, 0.26)";
    ctx.beginPath();
    ctx.arc(306, 154, 34, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 1) {
    const night = ctx.createLinearGradient(0, 0, 0, floorY);
    night.addColorStop(0, "rgba(28, 42, 92, 0.42)");
    night.addColorStop(1, "rgba(86, 78, 142, 0.16)");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, W, floorY);
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    for (let i = 0; i < 18; i++) {
      const x = (i * 47 + stage * 19) % W;
      const y = 98 + ((i * 31 + stage * 13) % 210);
      ctx.fillRect(x, y, 3, 3);
    }
  } else if (theme === 2) {
    ctx.fillStyle = "rgba(82, 163, 120, 0.18)";
    ctx.fillRect(0, 130, W, floorY - 130);
    ctx.fillStyle = "rgba(230, 74, 91, 0.48)";
    for (const x of [38, W - 62]) {
      ctx.fillRect(x, floorY - 168, 16, 168);
      ctx.fillRect(x - 12, floorY - 174, 40, 12);
    }
  } else {
    ctx.fillStyle = "rgba(112, 83, 208, 0.18)";
    ctx.fillRect(0, 90, W, floorY - 90);
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 2;
    for (let y = floorY - 154; y < floorY; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y - 12);
      ctx.stroke();
    }
  }

  drawDuelFloor(stage, floorY);
  ctx.restore();
}

function drawDuelFloor(stage, y) {
  const theme = (stage - 1) % 4;
  const colors = [
    ["#d99555", "#f0bd78", "#b86e42"],
    ["#53617f", "#7588a5", "#3e4763"],
    ["#5ea86f", "#87c685", "#3d7a54"],
    ["#6860b7", "#9586e8", "#4a438f"],
  ][theme];
  const floor = ctx.createLinearGradient(0, y, 0, H);
  floor.addColorStop(0, colors[1]);
  floor.addColorStop(1, colors[0]);
  ctx.fillStyle = floor;
  ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, y, W, 8);
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 2;
  for (let x = -40; x < W + 60; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 28, H);
    ctx.stroke();
  }
  for (let row = 0; row < 7; row++) {
    const yy = y + 32 + row * 38;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(W, yy);
    ctx.stroke();
  }
}

function drawHudDuel() {
  const duel = state.duel;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(14, 14, 178, 58, 8);
  ctx.fill();
  ctx.fillStyle = "#36475f";
  ctx.textAlign = "left";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText("DUEL SCORE", 28, 32);
  ctx.font = "800 23px system-ui, sans-serif";
  ctx.fillText(String(duel?.score || 0).padStart(5, "0"), 28, 58);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(W - 122, 14, 108, 58, 8);
  ctx.fill();
  ctx.fillStyle = "#36475f";
  ctx.textAlign = "right";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText("STAGE", W - 28, 32);
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText(String(duel?.stage || 1), W - 28, 58);
  ctx.restore();
}

function drawDuelTitle() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  roundRect(42, 120, W - 84, 462, 8);
  ctx.fill();
  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  ctx.font = "900 28px system-ui, sans-serif";
  ctx.fillText("しり殺", W / 2, 172);
  drawTitleShiri(192, 0.68);
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.fillText("名前を入れて決闘開始", W / 2, 318);
  drawDuelRanking(W / 2, 358);
  if (state.titleRankIn) {
    drawTitleRankInLabel(W / 2, 548);
  }
  drawHelpButton(duelTitleHelpButton, "操作説明");
  drawSmallSwitchButton(duelTitleSwitchButton, "ふわふわ");
  ctx.restore();

  if (state.showHelp) {
    drawDuelHelpPanel();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#7fd8ff");
  sky.addColorStop(0.55, "#c9f2ff");
  sky.addColorStop(1, "#fff0b5");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  for (const cloud of state.clouds) drawCloud(cloud.x, cloud.y, cloud.s);

  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 7; i++) {
    const x = (i * 84 - (state.distance * 2.2) % 84);
    ctx.fillStyle = i % 2 ? "#f8c9dc" : "#fff5b7";
    ctx.fillRect(x, 92 + (i % 3) * 126, 8, 8);
    ctx.fillRect(x + 3, 89 + (i % 3) * 126, 2, 14);
    ctx.fillRect(x - 3, 95 + (i % 3) * 126, 14, 2);
  }
  ctx.globalAlpha = 1;
}

function drawCloud(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(24, 26, 18, 0, Math.PI * 2);
  ctx.arc(48, 18, 24, 0, Math.PI * 2);
  ctx.arc(76, 28, 18, 0, Math.PI * 2);
  ctx.rect(22, 26, 58, 24);
  ctx.fill();
  ctx.restore();
}

function drawSparkles() {
  ctx.save();
  for (const sparkle of state.sparkles) {
    const twinkle = 0.55 + Math.sin(state.time * 9 + sparkle.twinkle) * 0.35;
    ctx.globalAlpha = Math.max(0, Math.min(1, sparkle.life * 1.2)) * twinkle;
    ctx.fillStyle = sparkle.color;
    const s = sparkle.size;
    ctx.beginPath();
    ctx.moveTo(sparkle.x, sparkle.y - s);
    ctx.lineTo(sparkle.x + s * 0.22, sparkle.y - s * 0.22);
    ctx.lineTo(sparkle.x + s, sparkle.y);
    ctx.lineTo(sparkle.x + s * 0.22, sparkle.y + s * 0.22);
    ctx.lineTo(sparkle.x, sparkle.y + s);
    ctx.lineTo(sparkle.x - s * 0.22, sparkle.y + s * 0.22);
    ctx.lineTo(sparkle.x - s, sparkle.y);
    ctx.lineTo(sparkle.x - s * 0.22, sparkle.y - s * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = sparkle.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sparkle.x - s * 1.35, sparkle.y);
    ctx.lineTo(sparkle.x + s * 1.35, sparkle.y);
    ctx.moveTo(sparkle.x, sparkle.y - s * 1.35);
    ctx.lineTo(sparkle.x, sparkle.y + s * 1.35);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate(p.angle);
  if (state.damageCooldown > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  if (state.invincible > 0) {
    ctx.strokeStyle = "rgba(255, 231, 105, 0.88)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 52 + Math.sin(state.time * 10) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawPlayerSprite(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
}

function drawPlayerSprite(x, y, w, h) {
  if (!assets.player) return;
  if (state.sootTimer <= 0) {
    drawImageCover(assets.player, x, y, w, h);
    return;
  }

  const soot = Math.min(0.72, 0.36 + state.sootTimer * 0.24);
  if (playerBuffer.width !== Math.ceil(w) || playerBuffer.height !== Math.ceil(h)) {
    playerBuffer.width = Math.ceil(w);
    playerBuffer.height = Math.ceil(h);
  }
  playerBufferCtx.clearRect(0, 0, playerBuffer.width, playerBuffer.height);
  playerBufferCtx.drawImage(assets.player, 0, 0, playerBuffer.width, playerBuffer.height);
  playerBufferCtx.globalCompositeOperation = "source-atop";
  playerBufferCtx.globalAlpha = soot;
  playerBufferCtx.fillStyle = "#111111";
  playerBufferCtx.fillRect(0, 0, playerBuffer.width, playerBuffer.height);
  playerBufferCtx.globalAlpha = 1;
  playerBufferCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(playerBuffer, x, y, w, h);
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    drawImageCover(assets[enemy.type], enemy.x, enemy.y, enemy.w, enemy.h);
  }
}

function drawDashCat() {
  for (const cat of state.dashCats) {
    ctx.save();
    if (cat.phase === "warn") {
      const flash = Math.floor(state.time * 10) % 2 === 0;
      ctx.globalAlpha = flash ? 0.92 : 0.5;
      ctx.fillStyle = "rgba(255, 76, 90, 0.22)";
      ctx.fillRect(0, cat.y - 28, W, 56);
      ctx.fillStyle = "#ff4c5a";
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("!", W - 22, cat.y + 10);
      ctx.fillText("!", W - 46, cat.y + 10);
      ctx.textAlign = "left";
    } else {
      drawImageCover(assets.dashCat, cat.x, cat.y - cat.h / 2, cat.w, cat.h);
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillRect(cat.x + cat.w - 12, cat.y - 18, 18, 6);
      ctx.fillRect(cat.x + cat.w - 22, cat.y + 4, 24, 6);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawItems() {
  for (const item of state.items) {
    const pulse = 1 + Math.sin(state.time * 6 + item.bob) * 0.06;
    const w = item.w * pulse;
    const h = item.h * pulse;
    drawImageCover(assets[item.kind], item.x - (w - item.w) / 2, item.y - (h - item.h) / 2, w, h);
  }
}

function drawImageCover(img, x, y, w, h) {
  if (!img) return;
  ctx.drawImage(img, x, y, w, h);
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / (p.maxLife || 0.7));
    ctx.globalAlpha = p.smoke ? alpha * 0.55 : alpha;
    ctx.fillStyle = p.color;
    if (p.smoke) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawScorePops() {
  ctx.save();
  ctx.textAlign = "center";
  for (const pop of state.scorePops) {
    const alpha = Math.min(1, pop.life * 1.6);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${Math.round(20 * pop.scale)}px system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.fillStyle = pop.color;
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(14, 14, 166, 58, 8);
  ctx.fill();
  ctx.fillStyle = "#36475f";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText("SCORE", 28, 32);
  ctx.font = "800 23px system-ui, sans-serif";
  ctx.fillText(String(Math.floor(state.displayedScore)).padStart(5, "0"), 28, 58);

  for (let i = 0; i < state.maxLives; i++) {
    drawHeart(W - 24 - i * 23, 34, i < state.lives ? "#ff5b7a" : "rgba(93,101,118,0.28)");
  }

  if (state.invincible > 0) {
    ctx.fillStyle = "rgba(255, 238, 135, 0.9)";
    roundRect(14, 76, 118, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#6f4a19";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillText(`無敵 ${state.invincible.toFixed(1)}s`, 28, 95);
  }
  if (state.sparkleTimer > 0) {
    const y = state.invincible > 0 ? 110 : 76;
    ctx.fillStyle = "rgba(255, 242, 148, 0.92)";
    roundRect(14, y, 146, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#7b4b11";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillText(`キラキラ ${state.sparkleTimer.toFixed(1)}s`, 28, y + 19);
  }
  ctx.restore();
}

function drawHeart(x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.bezierCurveTo(x - 12, y - 6, x - 25, y + 9, x, y + 24);
  ctx.bezierCurveTo(x + 25, y + 9, x + 12, y - 6, x, y + 8);
  ctx.fill();
  ctx.restore();
}

function drawOverlay() {
  if (state.mode === "play") return;
  if (state.mode === "ready") {
    drawModeSelectOverlay();
    return;
  }
  if (state.mode === "runnerTitle") {
    drawRunnerTitleOverlay();
    return;
  }

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(42, H * 0.25, W - 84, 382, 8);
  ctx.fill();
  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  drawOverlayTitle(state.mode === "over" ? "GAME OVER" : "しりちゃんのふわふわ大冒険", W / 2, H * 0.25 + 48);
  ctx.font = "700 17px system-ui, sans-serif";
  drawGameOverScore(W / 2, H * 0.25 + 83);
  drawRanking(W / 2, H * 0.25 + 136, RUNNER_OVER_VISIBLE_RANK_ROWS);
  ctx.textAlign = "left";

  drawShiriComment(W / 2, H * 0.25 + 430, shiriCommentForScore(score()));

  if (state.showHelp) {
    drawHelpPanel();
  }
}

function drawRunnerTitleOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(42, H * 0.25, W - 84, 340, 8);
  ctx.fill();
  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  drawOverlayTitle("しりちゃんのふわふわ大冒険", W / 2, H * 0.25 + 48);
  ctx.font = "700 17px system-ui, sans-serif";
  ctx.globalAlpha = 0.35 + Math.abs(Math.sin(state.modeTime * 4.2)) * 0.65;
  ctx.fillText("TAP TO JUMP", W / 2, H * 0.25 + 83);
  ctx.globalAlpha = 1;
  drawRanking(W / 2, H * 0.25 + 124);
  if (state.titleRankIn) {
    drawTitleRankInLabel(W / 2, 650);
  }
  drawHelpButton(runnerTitleHelpButton, "\u64cd\u4f5c\u8aac\u660e");
  drawSmallSwitchButton(runnerTitleSwitchButton, "\u3057\u308a\u6bba\u3078");
  drawTitleShiri(H * 0.25 + 354, 0.82);
  ctx.restore();

  if (state.showHelp) {
    drawHelpPanel();
  }
}

function drawModeSelectOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  roundRect(42, 124, W - 84, 520, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(101, 150, 176, 0.22)";
  ctx.lineWidth = 2;
  roundRect(42, 124, W - 84, 520, 8);
  ctx.stroke();

  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  drawOverlayTitle("\u3057\u308a\u3061\u3083\u3093\u30b2\u30fc\u30e0", W / 2, 182);
  ctx.font = "800 16px system-ui, sans-serif";
  ctx.fillText("\u904a\u3076\u30b2\u30fc\u30e0\u3092\u9078\u3093\u3067\u306d", W / 2, 216);
  drawTitleShiri();
  drawModeButtons();
  ctx.restore();
}

function drawModeButtons() {
  drawMenuButton(runnerButton, "\u3075\u308f\u3075\u308f\u5927\u5192\u967a", "#ffd76c");
  drawMenuButton(duelButton, "\u3057\u308a\u6bba", "#ffc2d3");
}

function drawMenuButton(rect, text, color) {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(107, 73, 31, 0.24)";
  ctx.lineWidth = 2;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#4e3b27";
  ctx.textAlign = "center";
  ctx.font = "900 15px system-ui, sans-serif";
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + 25);
  ctx.restore();
}

function drawOverlayTitle(text, cx, y) {
  const maxWidth = W - 116;
  let size = state.mode === "over" ? 30 : 24;
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 1;
    ctx.font = `800 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, cx, y);
}

function drawGameOverScore(cx, y) {
  const value = String(score());
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 17px system-ui, sans-serif";
  ctx.fillStyle = "#31475d";
  ctx.fillText("SCORE", cx - 18, y);
  ctx.fillStyle = "#ff6b7f";
  ctx.font = "900 20px system-ui, sans-serif";
  ctx.fillText(value, cx + 38, y + 1);
  ctx.restore();
}

function drawTitleShiri(y = 286, scale = 1) {
  ctx.save();
  const w = 138 * scale;
  const h = 124 * scale;
  const x = W * 0.5 - w * 0.5;
  ctx.globalAlpha = 1;
  drawImageCover(assets.player, x, y, w, h);
  ctx.restore();
}

function drawHelpButton(rect = helpButton, text = "\u64cd\u4f5c\u8aac\u660e") {
  ctx.save();
  ctx.fillStyle = "rgba(255, 215, 108, 0.95)";
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(107, 73, 31, 0.28)";
  ctx.lineWidth = 2;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#5b4122";
  ctx.textAlign = "center";
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + 24);
  ctx.restore();
}

function drawSmallSwitchButton(rect, text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(101, 150, 176, 0.42)";
  ctx.lineWidth = 2;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + 23);
  ctx.restore();
}

function drawHelpPanel() {
  ctx.save();
  ctx.fillStyle = "rgba(68, 103, 130, 0.45)";
  ctx.fillRect(0, 0, W, H);

  const panelX = 28;
  const panelY = 78;
  const panelW = W - 56;
  const panelH = 662;
  const contentTop = 128;
  const contentBottom = 726;
  const contentHeight = 672;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(101, 150, 176, 0.35)";
  ctx.lineWidth = 2;
  roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.stroke();

  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText("\u64cd\u4f5c\u8aac\u660e", W / 2, 112);

  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX + 8, contentTop, panelW - 16, contentBottom - contentTop);
  ctx.clip();
  ctx.translate(0, -state.helpScroll);

  ctx.textAlign = "left";
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText("\u30bf\u30c3\u30d7\u3059\u308b\u305f\u3073\u306b\u30b8\u30e3\u30f3\u30d7", 56, 144);
  ctx.fillText("\u7a7a\u4e2d\u3067\u3082\u4f55\u56de\u3067\u3082\u30b8\u30e3\u30f3\u30d7\u3067\u304d\u308b", 56, 166);
  ctx.fillText("\u6575\u3092\u907f\u3051\u3066\u30a2\u30a4\u30c6\u30e0\u3092\u96c6\u3081\u3088\u3046", 56, 188);
  ctx.fillText("\u4e0b\u306b\u843d\u3061\u308b\u3068\u30b2\u30fc\u30e0\u30aa\u30fc\u30d0\u30fc", 56, 210);

  ctx.font = "900 17px system-ui, sans-serif";
  ctx.fillText("\u30a2\u30a4\u30c6\u30e0", 54, 248);
  drawHelpItem("beer", "\u30d3\u30fc\u30eb", "\u4e00\u5b9a\u6642\u9593\u7121\u6575", 56, 281);
  drawHelpItem("yakitori", "\u713c\u304d\u9ce5", "3\u3064\u3067\u4f53\u529b1\u56de\u5fa9", 56, 321);
  drawHelpItem("pudding", "\u30d7\u30ea\u30f3", "\u4f53\u529b1\u56de\u5fa9", 56, 361);
  drawHelpItem("bomb", "\u7206\u5f3e", "\u6575\u3092\u307e\u3068\u3081\u3066\u5012\u3059", 56, 401);
  drawHelpItem("peach", "\u6843", "+100\u70b9", 56, 441);
  drawHelpItem("goldenPeach", "\u91d1\u306e\u6843", "\u6fc0\u30ec\u30a2! +1000\u70b9", 56, 481);
  drawHelpItem("microphone", "\u30de\u30a4\u30af", "+250\u70b9", 56, 521);

  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText("\u30ad\u30e9\u30ad\u30e9\u30bf\u30a4\u30e0\u4e2d\u306f\u30b9\u30b3\u30a2\u30a2\u30a4\u30c6\u30e0\u304c\u591a\u3081", 56, 561);

  ctx.font = "900 17px system-ui, sans-serif";
  ctx.fillText("\u6575", 54, 604);
  drawHelpItem("squirrel", "\u30ea\u30b9", "\u3057\u308a\u3061\u3083\u3093\u306b\u8fd1\u3065\u304f", 56, 637);
  drawHelpItem("octopus", "\u30bf\u30b3", "\u5909\u306a\u52d5\u304d\u3067\u98db\u3076", 56, 677);
  drawHelpItem("runnerExploder", "\u7206\u767a\u3063\u5b50", "\u5f53\u305f\u308b\u3068\u7206\u767a", 56, 717);
  drawHelpItem("dashCat", "\u9ed2\u767d\u306e\u732b", "\u8b66\u544a\u5f8c\u306b\u7a81\u9032", 56, 757);
  ctx.restore();

  const maxScroll = helpMaxScroll();
  if (maxScroll > 0) {
    const barX = panelX + panelW - 12;
    const trackY = contentTop + 8;
    const trackH = contentBottom - contentTop - 16;
    const thumbH = Math.max(42, trackH * ((contentBottom - contentTop) / contentHeight));
    const thumbY = trackY + (trackH - thumbH) * (state.helpScroll / maxScroll);
    ctx.fillStyle = "rgba(49, 71, 93, 0.16)";
    roundRect(barX, trackY, 4, trackH, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(49, 71, 93, 0.42)";
    roundRect(barX, thumbY, 4, thumbH, 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffd76c";
  roundRect(helpCloseButton.x, helpCloseButton.y, helpCloseButton.w, helpCloseButton.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(107, 73, 31, 0.28)";
  ctx.lineWidth = 2;
  roundRect(helpCloseButton.x, helpCloseButton.y, helpCloseButton.w, helpCloseButton.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#5b4122";
  ctx.textAlign = "center";
  ctx.font = "900 16px system-ui, sans-serif";
  ctx.fillText("\u3068\u3058\u308b", helpCloseButton.x + helpCloseButton.w / 2, helpCloseButton.y + 25);
  ctx.restore();
}

function drawDuelHelpPanel() {
  ctx.save();
  ctx.fillStyle = "rgba(35, 47, 78, 0.52)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(28, 118, W - 56, 520, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(101, 150, 176, 0.35)";
  ctx.lineWidth = 2;
  roundRect(28, 118, W - 56, 520, 8);
  ctx.stroke();

  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText("\u3057\u308a\u6bba\u306e\u64cd\u4f5c\u8aac\u660e", W / 2, 154);

  ctx.textAlign = "left";
  ctx.font = "800 15px system-ui, sans-serif";
  const lines = [
    "\u300cSTART!\u300d\u306e\u5f8c\u3001\u5408\u56f3\u3092\u5f85\u3064",
    "\u300c\u4eca\u3060!!\u300d\u304c\u51fa\u305f\u3089\u3059\u3050\u30bf\u30c3\u30d7",
    "\u53cd\u5fdc\u304c\u65e9\u3044\u307b\u3069\u30dc\u30fc\u30ca\u30b9\u70b9\u304c\u5897\u3048\u308b",
    "\u30b9\u30c6\u30fc\u30b8\u304c\u9032\u3080\u3068\u53d7\u4ed8\u6642\u9593\u304c\u77ed\u304f\u306a\u308b",
    "\u9593\u9055\u3048\u3066\u62bc\u3059\u3068\u5373\u8ca0\u3051",
    "\u300c\u4eca\u3058\u3083\u306a\u3044!!!\u300d\u306a\u3069\u306f\u3072\u3063\u304b\u3051",
    "\u8ca0\u3051\u305f\u3089\u30bf\u30c3\u30d7\u3067\u30bf\u30a4\u30c8\u30eb\u3078",
  ];
  for (let i = 0; i < lines.length; i++) {
    const y = 206 + i * 42;
    ctx.fillStyle = i === 1 ? "#ff4f6d" : "#31475d";
    ctx.fillText(lines[i], 50, y);
  }

  ctx.fillStyle = "rgba(255, 215, 108, 0.95)";
  roundRect(duelHelpCloseButton.x, duelHelpCloseButton.y, duelHelpCloseButton.w, duelHelpCloseButton.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(107, 73, 31, 0.28)";
  ctx.lineWidth = 2;
  roundRect(duelHelpCloseButton.x, duelHelpCloseButton.y, duelHelpCloseButton.w, duelHelpCloseButton.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#5b4122";
  ctx.textAlign = "center";
  ctx.font = "900 16px system-ui, sans-serif";
  ctx.fillText("\u3068\u3058\u308b", duelHelpCloseButton.x + duelHelpCloseButton.w / 2, duelHelpCloseButton.y + 25);
  ctx.restore();
}

function drawHelpItem(kind, name, description, x, y) {
  drawImageCover(assets[kind], x, y - 30, 34, 34);
  ctx.fillStyle = "#31475d";
  ctx.font = "900 14px system-ui, sans-serif";
  ctx.fillText(name, x + 48, y - 14);
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText(description, x + 48, y + 7);
}

function helpMaxScroll() {
  return 72;
}

function scrollHelp(delta) {
  if (!state?.showHelp || state.appMode === "duel") return false;
  state.helpScroll = Math.max(0, Math.min(helpMaxScroll(), state.helpScroll + delta));
  return true;
}

function rankMaxScroll(list, visibleRows = RANK_LIMIT) {
  return Math.max(0, Math.max(visibleRows, list.length) * 22 - visibleRows * 22);
}

function scrollTitleRanking(kind, delta) {
  if (!state) return false;
  if (kind === "runner") {
    const visibleRows = state.mode === "over" ? RUNNER_OVER_VISIBLE_RANK_ROWS : RUNNER_TITLE_VISIBLE_RANK_ROWS;
    state.runnerRankScroll = Math.max(0, Math.min(rankMaxScroll(rankings, visibleRows), state.runnerRankScroll + delta));
    return true;
  }
  if (kind === "duel") {
    state.duelRankScroll = Math.max(0, Math.min(rankMaxScroll(duelRankings, DUEL_TITLE_VISIBLE_RANK_ROWS), state.duelRankScroll + delta));
    return true;
  }
  return false;
}

function rankAreaKind(x, y) {
  if ((state?.mode === "runnerTitle" || state?.mode === "over") && x >= 48 && x <= W - 48 && y >= H * 0.25 + 138 && y <= H * 0.25 + 318) {
    return "runner";
  }
  if (state?.appMode === "duel" && !state.duel && x >= 48 && x <= W - 48 && y >= 372 && y <= 544) {
    return "duel";
  }
  return "";
}

function drawShiriComment(cx, y, text) {
  ctx.save();
  const portraitSize = 42;
  const portraitX = cx - 112;
  const portraitY = y - 28;
  const bubbleX = portraitX + portraitSize - 2;
  const bubbleY = y - 26;
  const bubbleW = 186;
  const bubbleH = 40;

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.beginPath();
  ctx.moveTo(bubbleX + 4, bubbleY + 25);
  ctx.lineTo(bubbleX - 12, bubbleY + 32);
  ctx.lineTo(bubbleX + 8, bubbleY + 33);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(101, 150, 176, 0.45)";
  ctx.lineWidth = 2;
  roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
  ctx.stroke();

  drawImageCover(assets.player, portraitX, portraitY, portraitSize, portraitSize);

  ctx.fillStyle = "#31475d";
  ctx.textAlign = "left";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(text, bubbleX + 14, bubbleY + 25);
  ctx.restore();
}

function drawRanking(cx, y, visibleRows = RUNNER_TITLE_VISIBLE_RANK_ROWS) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#31475d";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText("RANKING", cx, y);
  ctx.font = "700 14px system-ui, sans-serif";
  drawScrollableRankRows(rankings, cx, y, state.runnerRankScroll, (rank, index) => {
    return rank ? `${index + 1}. ${rank.name}  ${rank.score}` : `${index + 1}. ---`;
  }, visibleRows);
  ctx.restore();
}

function drawDuelRanking(cx, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#31475d";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText("DUEL RANKING", cx, y);
  ctx.font = "700 12px system-ui, sans-serif";
  drawScrollableRankRows(duelRankings, cx, y, state.duelRankScroll, (rank, index) => {
    const stage = rank?.stage ? ` ST${rank.stage}` : "";
    const bestTime = Number.isFinite(rank?.bestTime) ? ` ${rank.bestTime.toFixed(3)}秒` : "";
    return rank ? `${index + 1}. ${rank.name} ${rank.score}${stage}${bestTime}` : `${index + 1}. ---`;
  }, DUEL_TITLE_VISIBLE_RANK_ROWS);
  ctx.restore();
}

function drawScrollableRankRows(list, cx, y, scroll, formatLine, visibleRows = RANK_LIMIT) {
  const rowH = 22;
  const rowTop = y + 14;
  const clipH = visibleRows * rowH + 8;
  const count = Math.max(visibleRows, list.length);
  const start = Math.max(0, Math.floor(scroll / rowH));
  const offset = scroll % rowH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(48, rowTop, W - 96, clipH);
  ctx.clip();
  for (let i = start; i < Math.min(count, start + visibleRows + 2); i++) {
    const rank = list[i];
    const line = formatLine(rank, i);
    ctx.fillText(line, cx, rowTop + 26 + (i - start) * rowH - offset);
  }
  ctx.restore();

  const maxScroll = rankMaxScroll(list, visibleRows);
  if (maxScroll > 0) {
    const trackX = W - 56;
    const trackY = rowTop + 8;
    const trackH = clipH - 12;
    const thumbH = Math.max(28, trackH * (visibleRows / count));
    const thumbY = trackY + (trackH - thumbH) * (scroll / maxScroll);
    ctx.fillStyle = "rgba(49, 71, 93, 0.14)";
    roundRect(trackX, trackY, 4, trackH, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(49, 71, 93, 0.42)";
    roundRect(trackX, thumbY, 4, thumbH, 2);
    ctx.fill();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loop(time) {
  const now = time / 1000;
  const dt = Math.min(0.033, now - lastTime || 0);
  lastTime = now;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  ensureAudio();
  const point = canvasPoint(event);
  if (handleOverlayClick(point.x, point.y)) return;
  tap();
});

canvas.addEventListener("pointermove", (event) => {
  if (!helpDrag && !rankDrag) return;
  event.preventDefault();
  const point = canvasPoint(event);
  if (helpDrag) {
    scrollHelp(helpDrag.y - point.y);
    helpDrag.y = point.y;
  }
  if (rankDrag) {
    scrollTitleRanking(rankDrag.kind, rankDrag.y - point.y);
    rankDrag.y = point.y;
  }
});

canvas.addEventListener("pointerup", () => {
  helpDrag = null;
  rankDrag = null;
});

canvas.addEventListener("pointercancel", () => {
  helpDrag = null;
  rankDrag = null;
});

canvas.addEventListener("wheel", (event) => {
  const point = canvasPoint(event);
  const kind = rankAreaKind(point.x, point.y);
  if (state?.showHelp && state.appMode !== "duel") {
    event.preventDefault();
    scrollHelp(event.deltaY * 0.7);
    return;
  }
  if (kind) {
    event.preventDefault();
    scrollTitleRanking(kind, event.deltaY * 0.7);
  }
}, { passive: false });

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (W / rect.width),
    y: (event.clientY - rect.top) * (H / rect.height),
  };
}

function handleOverlayClick(x, y) {
  if (state.showHelp) {
    const closeButton = state.appMode === "duel" ? duelHelpCloseButton : helpCloseButton;
    if (pointInRect(x, y, closeButton)) {
      state.showHelp = false;
      helpDrag = null;
      state.helpScroll = 0;
      return true;
    }
    if (state.appMode !== "duel" && x >= 28 && x <= W - 28 && y >= 128 && y <= 726) {
      helpDrag = { y };
    }
    return true;
  }

  const rankKind = rankAreaKind(x, y);
  if (rankKind) {
    rankDrag = { kind: rankKind, y };
    return true;
  }

  if (state.mode === "runnerTitle" && pointInRect(x, y, runnerTitleHelpButton)) {
    state.showHelp = true;
    state.helpScroll = 0;
    return true;
  }

  if (state.mode === "runnerTitle" && pointInRect(x, y, runnerTitleSwitchButton)) {
    startDuelNameEntry();
    return true;
  }

  if (state.appMode === "duel" && !state.duel && pointInRect(x, y, duelTitleHelpButton)) {
    state.showHelp = true;
    state.helpScroll = 0;
    return true;
  }

  if (state.appMode === "duel" && !state.duel && pointInRect(x, y, duelTitleSwitchButton)) {
    hideRankForm();
    resetGame();
    state.mode = "runnerTitle";
    return true;
  }

  if (state.mode === "ready" && pointInRect(x, y, duelButton)) {
    startDuelNameEntry();
    return true;
  }

  if (state.mode === "ready" && pointInRect(x, y, runnerButton)) {
    resetGame();
    state.mode = "runnerTitle";
    return true;
  }

  return false;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

window.addEventListener("keydown", (event) => {
  if (!rankForm.hidden) return;
  if (event.code === "Space" || event.code === "ArrowUp") {
    ensureAudio();
    tap();
  }
});

rankForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (rankForm.dataset.purpose === "duelName") {
    const cleanName = (rankName.value || "").trim().slice(0, 10);
    if (!cleanName) {
      rankName.setCustomValidity("名前を入力してね");
      rankName.reportValidity();
      rankForm.querySelector("label").textContent = "NAMEを入力してね";
      return;
    }
    rankName.setCustomValidity("");
    duelPlayerName = cleanName;
    localStorage.setItem("shiriDuelPlayerName", duelPlayerName);
    hideRankForm();
    startDuelRun();
    return;
  }
  const finalScore = Number(rankForm.dataset.score || 0);
  const submitButton = rankForm.querySelector("button");
  submitButton.disabled = true;
  await addRanking(rankName.value, finalScore);
  submitButton.disabled = false;
  hideRankForm();
});

rankSkip.addEventListener("click", () => {
  skipRankForm();
});

loadAssets().then(() => {
  resetGame(initialRoute());
  if (state.appMode === "duel" && state.mode === "duelName") showDuelNameForm();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
});
