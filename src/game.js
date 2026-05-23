const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const rankForm = document.getElementById("rankForm");
const rankName = document.getElementById("rankName");

const W = canvas.width;
const H = canvas.height;
const RANK_KEY = "skyTapRunRanking";
const DASH_CAT_UNLOCK_DISTANCE = 75;
const RANK_LIMIT = 5;
const assets = {};
const assetList = {
  player: "assets/player.png",
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
let rankings = loadRankings();

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

function resetGame() {
  state = {
    mode: "ready",
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
    rankPrompted: false,
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
  if (state.mode === "over") {
    if (state.modeTime < 1) return;
    resetGame();
    return;
  }
  if (state.mode === "ready") {
    resetGame();
    state.mode = "play";
  }
  if (state.mode !== "play") return;
  state.player.vy = -365;
  addParticles(state.player.x + 18, state.player.y + state.player.h - 8, "#ffffff", 8);
}

function loadRankings() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANK_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((r) => r && typeof r.name === "string" && Number.isFinite(r.score)).slice(0, RANK_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function saveRankings() {
  localStorage.setItem(RANK_KEY, JSON.stringify(rankings.slice(0, RANK_LIMIT)));
}

function isRankIn(value) {
  return value > 0 && (rankings.length < RANK_LIMIT || value > rankings[rankings.length - 1].score);
}

function addRanking(name, value) {
  const cleanName = (name || "PLAYER").trim().slice(0, 10) || "PLAYER";
  rankings.push({ name: cleanName, score: value });
  rankings.sort((a, b) => b.score - a.score);
  rankings = rankings.slice(0, RANK_LIMIT);
  saveRankings();
}

function showRankForm(value) {
  rankForm.hidden = false;
  rankForm.dataset.score = String(value);
  rankName.value = "";
  window.setTimeout(() => rankName.focus(), 0);
}

function hideRankForm() {
  rankForm.hidden = true;
  rankForm.dataset.score = "";
  canvas.focus();
}

function spawnEnemy() {
  const type = Math.random() < 0.34 ? "octopus" : "squirrel";
  const difficulty = difficultyLevel();
  const size = type === "octopus"
    ? 54 + Math.random() * 18
    : 58 + Math.random() * 20 + difficulty * 18;
  state.enemies.push({
    type,
    x: W + 50,
    y: 88 + Math.random() * (H - 196),
    w: size,
    h: size,
    drift: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
    baseY: 0,
    wildness: 1 + difficulty * 1.6,
  });
  state.enemies[state.enemies.length - 1].baseY = state.enemies[state.enemies.length - 1].y;
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
    state.spawnEnemy = Math.max(0.72, 1.42 - state.time * 0.012) + Math.random() * 0.55;
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
    state.player.y + state.player.h * 0.5,
    H * 0.22,
    H * 0.5,
    H * 0.78,
  ].map((y) => Math.max(108, Math.min(H - 118, y)));
  const uniqueLanes = [];
  for (const y of lanes) {
    if (!uniqueLanes.some((other) => Math.abs(other - y) < 108)) uniqueLanes.push(y);
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
    if (enemy.type === "octopus") {
      enemy.x -= (state.speed * 0.86 + Math.sin(state.time * 5.4 + enemy.phase) * 58 * enemy.wildness) * dt;
      enemy.baseY += Math.sin(state.time * 2.2 + enemy.drift) * 20 * enemy.wildness * dt;
      enemy.y = enemy.baseY
        + Math.sin(state.time * 7.2 + enemy.phase) * 34 * enemy.wildness
        + Math.sin(state.time * 13 + enemy.phase) * 9 * enemy.wildness;
    } else {
      enemy.x -= state.speed * dt;
      const targetY = state.player.y + state.player.h * 0.5 - enemy.h * 0.5;
      const chase = Math.min(92, 34 + difficultyLevel() * 28);
      enemy.y += Math.sign(targetY - enemy.y) * Math.min(Math.abs(targetY - enemy.y), chase * dt);
      enemy.y += Math.sin(state.time * 2.5 + enemy.drift) * 18 * dt;
    }
    if (intersects(pBox, enemy)) {
      if (state.invincible > 0) {
        enemy.dead = true;
        addEnemyScore(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        addParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ffd76c", 14);
      } else {
        takeDamage();
      }
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead && enemy.x > -100);
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
  } else if (kind === "yakitori") {
    state.yakitoriCount += 1;
    if (state.yakitoriCount % 3 === 0) heal(1);
    addTextPop(x, y, state.yakitoriCount % 3 === 0 ? "回復!" : `${state.yakitoriCount % 3}/3`, "#d97832");
    addParticles(x, y, "#f4a04e", 10);
  } else if (kind === "pudding") {
    heal(1);
    addTextPop(x, y, "回復!", "#d8a22c");
    addParticles(x, y, "#fff0a4", 12);
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
  } else if (kind === "peach") {
    state.peachCount += 1;
    addScorePop(x, y, 100, "#ff668a");
    addParticles(x, y, "#ffb1b8", 12);
  } else if (kind === "goldenPeach") {
    state.goldenPeachCount += 1;
    addScorePop(x, y, 1000, "#f4a62a");
    addTextPop(x, y - 24, "激レア!", "#ffcf33");
    addParticles(x, y, "#ffd85a", 24);
  } else if (kind === "microphone") {
    state.microphoneCount += 1;
    addScorePop(x, y, 250, "#7b68ff");
    addParticles(x, y, "#d9d7ee", 14);
    addParticles(x, y, "#ffd05c", 8);
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
  addDamageVoice();
  addParticles(state.player.x + 32, state.player.y + 34, "#ff6580", 18);
  if (state.lives <= 0) {
    setGameOver();
  }
}

function addDamageVoice() {
  const voices = ["いて", "うわ", "もお！"];
  const text = voices[Math.floor(Math.random() * voices.length)];
  addTextPop(state.player.x + state.player.w * 0.7, state.player.y + 8, text, "#ff5b7a");
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
  const finalScore = score();
  if (!state.rankPrompted && isRankIn(finalScore)) {
    state.rankPrompted = true;
    window.setTimeout(() => showRankForm(finalScore), 450);
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 210 * dt;
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
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      size: 3 + Math.random() * 5,
      life: 0.35 + Math.random() * 0.45,
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
  if (value <= 1000) return "\u4e0b\u624b\u304f\u305d\u3067\u3059\u304b\uff1f";
  if (value <= 3000) return "\u3084\u308b\u3058\u3083\u3093";
  return "\u3059\u3063\u3054\u30fc\u3044\uff01";
}

function dashCatCount() {
  if (state.distance > 420) return 3;
  if (state.distance > 220) return 2;
  return 1;
}

function draw() {
  ctx.save();
  if (state.shake > 0 && (state.mode === "play" || state.modeTime < 1)) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
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
  drawImageCover(assets.player, -p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
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
    ctx.globalAlpha = Math.max(0, p.life / 0.7);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
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

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(42, H * 0.25, W - 84, 318, 8);
  ctx.fill();
  ctx.fillStyle = "#31475d";
  ctx.textAlign = "center";
  drawOverlayTitle(state.mode === "over" ? "GAME OVER" : "しりちゃんのふわふわ大冒険", W / 2, H * 0.25 + 48);
  ctx.font = "700 17px system-ui, sans-serif";
  if (state.mode === "over") {
    drawGameOverScore(W / 2, H * 0.25 + 83);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(state.modeTime * 4.2)) * 0.65;
    ctx.fillText("TAP TO JUMP", W / 2, H * 0.25 + 83);
    ctx.restore();
  }
  if (state.mode === "over") {
    drawRanking(W / 2, H * 0.25 + 136);
  } else {
    drawRanking(W / 2, H * 0.25 + 124);
  }
  ctx.textAlign = "left";

  if (state.mode === "over") {
    drawShiriComment(W / 2, H * 0.25 + 360, shiriCommentForScore(score()));
  } else {
    drawTitleShiri();
  }
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

function drawTitleShiri() {
  ctx.save();
  const w = 104;
  const h = 94;
  const x = W * 0.5 - w * 0.5;
  const y = H * 0.25 + 255;
  ctx.globalAlpha = 1;
  drawImageCover(assets.player, x, y, w, h);
  ctx.restore();
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

function drawRanking(cx, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#31475d";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText("RANKING", cx, y);
  ctx.font = "700 14px system-ui, sans-serif";
  for (let i = 0; i < RANK_LIMIT; i++) {
    const rank = rankings[i];
    const line = rank ? `${i + 1}. ${rank.name}  ${rank.score}` : `${i + 1}. ---`;
    ctx.fillText(line, cx, y + 26 + i * 22);
  }
  ctx.restore();
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
  tap();
});

window.addEventListener("keydown", (event) => {
  if (!rankForm.hidden) return;
  if (event.code === "Space" || event.code === "ArrowUp") tap();
});

rankForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const finalScore = Number(rankForm.dataset.score || 0);
  addRanking(rankName.value, finalScore);
  hideRankForm();
});

loadAssets().then(() => {
  resetGame();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
});
