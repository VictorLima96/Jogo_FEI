// ========================================================
// PONG ULTRA BALATRO - SCRIPT PRINCIPAL (OTIMIZADO)
// Inspirado em Pong + Balatro + Ultra Pool
// ========================================================

// 1. CONFIGURAÇÃO DO CANVAS E ELEMENTOS DOM
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const dom = {
  chips: document.getElementById("chips-display"),
  mult: document.getElementById("mult-display"),
  roundPts: document.getElementById("round-pts"),
  playerIcons: document.getElementById("player-score-icons"),
  enemyIcons: document.getElementById("enemy-score-icons"),
  banner: document.getElementById("powerup-banner"),
  btnPause: document.getElementById("btn-pause"),
  btnReset: document.getElementById("btn-reset")
};

// Cache da HUD para evitar reescrever o DOM a 60 FPS sem necessidade
const hudCache = {
  fichas: -1,
  mult: -1,
  total: -1,
  golsJogador: -1,
  golsInimigo: -1,
  bannerTexto: ""
};


// ========================================================
// 2. CARREGAMENTO DE IMAGENS E HELPERS
// ========================================================

const carregarImg = (src) => {
  const img = new Image();
  img.src = src;
  return img;
};

const imgs = {
  jogador: carregarImg("Images/player.png"),
  inimigo: carregarImg("Images/enemy.png"),
  powerUp: carregarImg("Images/powerup.png"),
  ponto: carregarImg("Images/oculos.png")
};

function desenharSprite(img, x, y, w, h, fallbackCor) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, w, h);
    return true;
  }
  if (fallbackCor) {
    ctx.fillStyle = fallbackCor;
    ctx.fillRect(x, y, w, h);
  }
  return false;
}


// ========================================================
// 3. ÁUDIOS E SINTETIZADOR
// ========================================================

const carregarAudio = (src) => {
  const a = new Audio(encodeURI(src));
  a.preload = "auto";
  return a;
};

const sonsGolJogador = [1, 2, 3].map(n => carregarAudio(`Audios/gol${n}.mp3`));
const sonsGolInimigo = [1, 2, 3].map(n => carregarAudio(`Audios/robogol${n}.mp3`));
const somEmpate = carregarAudio("Audios/empategol.mp3");

let audioCtx = null;
function liberarAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
}

function tocarBip(freq = 320, tipo = "sine", duracao = 0.08) {
  liberarAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duracao);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch (e) {}
}

function tocarSomGol(tipo) {
  try {
    if (tipo === "empate") {
      somEmpate.currentTime = 0;
      somEmpate.play().catch(() => {});
      return;
    }
    const lista = tipo === "jogador" ? sonsGolJogador : sonsGolInimigo;
    const som = lista[Math.floor(Math.random() * lista.length)];
    som.currentTime = 0;
    som.play().catch(() => {});
  } catch (e) {}
}


// ========================================================
// 4. VARIÁVEIS E ENTIDADES DO JOGO
// ========================================================

let pausado = false;
let screenShake = 0;
let ultimoTempo = performance.now();

let golsJogador = 0;
let golsInimigo = 0;
const MAX_GOLS = 5;

let fichas = 0;
let multiplicador = 1;
let pontuacaoTotal = 0;

// Velocidades calibradas para 60 FPS (unidades/seg)
const jogador = {
  x: 24,
  y: canvas.height / 2 - 50,
  largura: 32,
  altura: 100,
  velocidade: 420,
  subindo: false,
  descendo: false
};

const inimigo = {
  x: canvas.width - 56,
  y: canvas.height / 2 - 50,
  largura: 32,
  altura: 100,
  velocidade: 276,
  estaMorto: false,
  timerMorte: 0,
  duracaoMorte: 7
};

const bola = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  raio: 10,
  velX: 360,
  velY: 240,
  velMax: 840,
  rastro: []
};

const powerUp = {
  x: canvas.width / 2,
  y: canvas.height / 2 - 90,
  raio: 24,
  ativoNoCampo: true,
  coletado: false,
  timerRespawn: 0,
  balanco: 0
};

const bumpers = [
  { x: canvas.width / 2, y: 110, raio: 22, cor: "#00fff2" },
  { x: canvas.width / 2, y: canvas.height - 110, raio: 22, cor: "#ff007f" }
];

let particulas = [];
let textosFlutuantes = [];

const criarTextoFlutuante = (x, y, texto, cor = "#ffd700", tam = 16) =>
  textosFlutuantes.push({ x, y, texto, cor, tam, vida: 1.0, velY: -65 });

function criarExplosao(x, y, cor, qtd = 15) {
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const v = 120 + Math.random() * 300;
    particulas.push({
      x, y,
      velX: Math.cos(ang) * v,
      velY: Math.sin(ang) * v,
      vida: 1,
      decaimento: 1.5 + Math.random() * 1.2,
      cor,
      tam: 3 + Math.random() * 3
    });
  }
}


// ========================================================
// 5. ATUALIZAÇÃO INTELIGENTE DA HUD (COM CACHE)
// ========================================================

function renderizarIconesPlacar(container, qtd, title) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < qtd; i++) {
    const icone = document.createElement("img");
    icone.src = imgs.ponto.src;
    icone.className = "score-point-icon";
    icone.title = title;
    frag.appendChild(icone);
  }
  container.replaceChildren(frag);
}

function atualizarHUD(forcar = false) {
  if (forcar || hudCache.fichas !== fichas || hudCache.mult !== multiplicador || hudCache.total !== pontuacaoTotal) {
    dom.chips.innerText = fichas;
    dom.mult.innerText = multiplicador;
    dom.roundPts.innerText = `= ${fichas * multiplicador} pts (Total: ${pontuacaoTotal})`;
    hudCache.fichas = fichas;
    hudCache.mult = multiplicador;
    hudCache.total = pontuacaoTotal;
  }

  if (forcar || hudCache.golsJogador !== golsJogador) {
    renderizarIconesPlacar(dom.playerIcons, golsJogador, "Gol do Jogador!");
    hudCache.golsJogador = golsJogador;
  }

  if (forcar || hudCache.golsInimigo !== golsInimigo) {
    renderizarIconesPlacar(dom.enemyIcons, golsInimigo, "Gol do Inimigo!");
    hudCache.golsInimigo = golsInimigo;
  }

  let novoBanner = "";
  if (powerUp.coletado && !inimigo.estaMorto) {
    novoBanner = "⚡ PODER ATIVO! Acerte a bola no INIMIGO para eliminá-lo e abrir o gol!";
  } else if (inimigo.estaMorto) {
    const seg = Math.max(0, Math.ceil(inimigo.timerMorte));
    novoBanner = `💀 INIMIGO ELIMINADO! O gol adversário está livre! Ele ressurge em ${seg}s!`;
  }

  if (forcar || hudCache.bannerTexto !== novoBanner) {
    if (novoBanner) {
      dom.banner.classList.remove("hidden");
      dom.banner.innerText = novoBanner;
    } else {
      dom.banner.classList.add("hidden");
    }
    hudCache.bannerTexto = novoBanner;
  }
}


// ========================================================
// 6. CONTROLES E FLUXO DE PARTIDA
// ========================================================

canvas.addEventListener("mousemove", (e) => {
  if (pausado) return;
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  jogador.y = Math.max(0, Math.min(canvas.height - jogador.altura, mouseY - jogador.altura / 2));
});

window.addEventListener("keydown", (e) => {
  liberarAudio();
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") jogador.subindo = true;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") jogador.descendo = true;
  if (e.key === "p" || e.key === "P") alternarPausa();
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") jogador.subindo = false;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") jogador.descendo = false;
});

function alternarPausa() {
  pausado = !pausado;
  dom.btnPause.innerText = pausado ? "Continuar" : "Pausar";
}

dom.btnPause.addEventListener("click", alternarPausa);
dom.btnReset.addEventListener("click", reiniciarJogo);

function resetarBola(direcao = 1) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  bola.velX = 360 * direcao;
  bola.velY = (Math.random() * 360 - 180) || 180;
  bola.rastro.length = 0;

  pontuacaoTotal += fichas * multiplicador;
  fichas = 0;
  multiplicador = 1;
  atualizarHUD();
}

function reiniciarJogo() {
  golsJogador = 0;
  golsInimigo = 0;
  fichas = 0;
  multiplicador = 1;
  pontuacaoTotal = 0;
  powerUp.coletado = false;
  powerUp.ativoNoCampo = true;
  powerUp.timerRespawn = 0;
  inimigo.estaMorto = false;
  inimigo.timerMorte = 0;
  particulas.length = 0;
  textosFlutuantes.length = 0;
  resetarBola(1);
  atualizarHUD(true);
  tocarSomGol("empate");
}


// ========================================================
// 7. ATUALIZAÇÃO DA FÍSICA (INDEPENDENTE DE FPS)
// ========================================================

function atualizar(dt) {
  if (pausado) return;

  // Movimento Jogador
  if (jogador.subindo) jogador.y -= jogador.velocidade * dt;
  if (jogador.descendo) jogador.y += jogador.velocidade * dt;
  jogador.y = Math.max(0, Math.min(canvas.height - jogador.altura, jogador.y));

  // Movimento ou Ressurreição do Inimigo (pausa corretamente junto com o jogo)
  if (!inimigo.estaMorto) {
    const centroInimigo = inimigo.y + inimigo.altura / 2;
    const diff = bola.y - centroInimigo;
    if (Math.abs(diff) > 12) {
      inimigo.y += Math.sign(diff) * inimigo.velocidade * dt;
    }
    inimigo.y = Math.max(0, Math.min(canvas.height - inimigo.altura, inimigo.y));
  } else {
    inimigo.timerMorte -= dt;
    if (inimigo.timerMorte <= 0) {
      inimigo.estaMorto = false;
      inimigo.y = canvas.height / 2 - inimigo.altura / 2;
      criarExplosao(inimigo.x + inimigo.largura / 2, inimigo.y + inimigo.altura / 2, "#00ff88", 25);
      tocarBip(600, "triangle", 0.2);
    }
  }

  // Respawn do Power-Up controlado por dt (sem setTimeout vazando na pausa)
  if (!powerUp.ativoNoCampo && !powerUp.coletado && powerUp.timerRespawn > 0) {
    powerUp.timerRespawn -= dt;
    if (powerUp.timerRespawn <= 0) powerUp.ativoNoCampo = true;
  }

  // Rastro em O(1)
  bola.rastro.push({ x: bola.x, y: bola.y });
  if (bola.rastro.length > 7) bola.rastro.shift();

  // Movimentação da bola
  bola.x += bola.velX * dt;
  bola.y += bola.velY * dt;

  // Quique nas paredes superior e inferior
  if (bola.y - bola.raio <= 0 || bola.y + bola.raio >= canvas.height) {
    bola.y = bola.y - bola.raio <= 0 ? bola.raio : canvas.height - bola.raio;
    bola.velY = -bola.velY;
    multiplicador += 1;
    tocarBip(280);
    criarExplosao(bola.x, bola.y, "#ffffff", 6);
  }

  // Bumpers centrais (Ultra Pool)
  for (const b of bumpers) {
    const dx = bola.x - b.x;
    const dy = bola.y - b.y;
    if (Math.hypot(dx, dy) < bola.raio + b.raio) {
      const angulo = Math.atan2(dy, dx);
      const vel = Math.min(Math.hypot(bola.velX, bola.velY) * 1.05, bola.velMax);
      bola.velX = Math.cos(angulo) * vel;
      bola.velY = Math.sin(angulo) * vel;

      fichas += 20;
      multiplicador += 2;
      screenShake = 6;
      tocarBip(720, "square", 0.1);
      criarExplosao(b.x, b.y, b.cor, 16);
      criarTextoFlutuante(b.x, b.y - 25, "+20 Fichas! +2X Mult!", b.cor, 14);
    }
  }

  // Coleta do Power-Up
  if (powerUp.ativoNoCampo) {
    powerUp.balanco += 3 * dt;
    const yOscilando = powerUp.y + Math.sin(powerUp.balanco) * 7;
    if (Math.hypot(bola.x - powerUp.x, bola.y - yOscilando) < bola.raio + powerUp.raio) {
      powerUp.ativoNoCampo = false;
      powerUp.coletado = true;
      screenShake = 8;
      tocarBip(900, "triangle", 0.25);
      criarExplosao(powerUp.x, yOscilando, "#ffd700", 25);
      criarTextoFlutuante(powerUp.x, yOscilando - 30, "⚡ EXTERMINADOR ATIVADO!", "#ffd700", 17);
      fichas += 50;
      multiplicador += 1;
    }
  }

  // Colisão com Jogador
  if (
    bola.velX < 0 &&
    bola.x - bola.raio <= jogador.x + jogador.largura &&
    bola.x + bola.raio >= jogador.x &&
    bola.y >= jogador.y &&
    bola.y <= jogador.y + jogador.altura
  ) {
    bola.x = jogador.x + jogador.largura + bola.raio;
    const relativo = (bola.y - (jogador.y + jogador.altura / 2)) / (jogador.altura / 2);
    const angulo = relativo * (Math.PI / 3);
    const vel = Math.min(Math.hypot(bola.velX, bola.velY) + 18, bola.velMax);

    bola.velX = Math.cos(angulo) * vel;
    bola.velY = Math.sin(angulo) * vel;
    fichas += 10;

    if (Math.abs(relativo) > 0.65) {
      multiplicador += 2;
      screenShake = 7;
      criarTextoFlutuante(jogador.x + 40, bola.y, "🔥 SMASH! +2X MULT", "#ff4757", 16);
    } else {
      criarTextoFlutuante(jogador.x + 35, bola.y, "+10 Fichas", "#00b0ff", 14);
    }
    tocarBip(440);
    criarExplosao(bola.x, bola.y, "#00b0ff", 10);
  }

  // Colisão com Inimigo
  if (
    !inimigo.estaMorto &&
    bola.velX > 0 &&
    bola.x + bola.raio >= inimigo.x &&
    bola.x - bola.raio <= inimigo.x + inimigo.largura &&
    bola.y >= inimigo.y &&
    bola.y <= inimigo.y + inimigo.altura
  ) {
    if (powerUp.coletado) {
      inimigo.estaMorto = true;
      inimigo.timerMorte = inimigo.duracaoMorte;
      powerUp.coletado = false;
      powerUp.timerRespawn = 9.0;
      screenShake = 14;

      bola.velX = -Math.abs(bola.velX) * 1.15;
      criarExplosao(inimigo.x, inimigo.y + inimigo.altura / 2, "#ff0044", 35);
      criarTextoFlutuante(inimigo.x - 30, inimigo.y + 30, "💥 K.O.! GOL LIBERADO (7s)!", "#ff0044", 18);
      tocarBip(150, "sawtooth", 0.35);

      fichas += 100;
      multiplicador += 5;
    } else {
      bola.x = inimigo.x - bola.raio;
      const relativo = (bola.y - (inimigo.y + inimigo.altura / 2)) / (inimigo.altura / 2);
      const angulo = relativo * (Math.PI / 3);
      const vel = Math.hypot(bola.velX, bola.velY);

      bola.velX = -Math.cos(angulo) * vel;
      bola.velY = Math.sin(angulo) * vel;
      tocarBip(380);
      criarExplosao(bola.x, bola.y, "#ff4757", 10);
    }
  }

  // Gol no Inimigo (Direita)
  if (bola.x + bola.raio >= canvas.width) {
    if (powerUp.coletado && !inimigo.estaMorto) {
      bola.x = canvas.width - bola.raio;
      bola.velX = -bola.velX;
      screenShake = 6;
      tocarBip(180, "sawtooth", 0.15);
      criarExplosao(canvas.width, bola.y, "#ff0044", 15);
    } else {
      golsJogador++;
      tocarSomGol("jogador");
      criarExplosao(canvas.width, bola.y, "#00ff88", 45);
      criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "⚽ GOOOOOL DO JOGADOR!", "#00ff88", 28);
      screenShake = 12;

      if (golsJogador >= MAX_GOLS) {
        atualizarHUD();
        setTimeout(() => {
          alert("🎉 VITÓRIA! VOCÊ MARCOU 5 GOLS E VENCEU O ROBÔ!");
          reiniciarJogo();
        }, 300);
      } else {
        resetarBola(-1);
      }
    }
  }

  // Gol do Inimigo (Esquerda)
  if (bola.x - bola.raio <= 0) {
    golsInimigo++;
    tocarSomGol("inimigo");
    criarExplosao(0, bola.y, "#ff3333", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🤖 GOL DO ROBÔ!", "#ff4757", 28);
    screenShake = 12;

    if (golsInimigo >= MAX_GOLS) {
      atualizarHUD();
      setTimeout(() => {
        alert("💀 O ROBÔ VENCEU! CLIQUE EM OK PARA TENTAR NOVAMENTE!");
        reiniciarJogo();
      }, 300);
    } else {
      resetarBola(1);
    }
  }

  // Partículas e Textos Flutuantes (agora renderizados e limpos corretamente!)
  particulas = particulas.filter(p => {
    p.x += p.velX * dt;
    p.y += p.velY * dt;
    p.vida -= p.decaimento * dt;
    return p.vida > 0;
  });

  textosFlutuantes = textosFlutuantes.filter(tf => {
    tf.y += tf.velY * dt;
    tf.vida -= 0.9 * dt;
    return tf.vida > 0;
  });

  if (screenShake > 0) {
    screenShake *= Math.pow(0.88, dt * 60);
    if (screenShake < 0.2) screenShake = 0;
  }

  atualizarHUD();
}


// ========================================================
// 8. RENDERIZAÇÃO NO CANVAS
// ========================================================

function desenhar() {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
  }

  // Fundo e linhas da mesa
  ctx.fillStyle = "#0c1710";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Bumpers centrais
  for (const b of bumpers) {
    ctx.fillStyle = b.cor;
    ctx.shadowColor = b.cor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.raio, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.raio * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Power-Up no campo
  if (powerUp.ativoNoCampo) {
    const yOsc = powerUp.y + Math.sin(powerUp.balanco) * 7;
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 15;

    if (!desenharSprite(imgs.powerUp, powerUp.x - 24, yOsc - 24, 48, 48)) {
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(powerUp.x, yOsc, powerUp.raio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PODER", powerUp.x, yOsc - 30);
  }

  // Barreira do gol bloqueado
  if (powerUp.coletado && !inimigo.estaMorto) {
    ctx.fillStyle = "rgba(255, 0, 68, 0.4)";
    ctx.fillRect(canvas.width - 16, 0, 16, canvas.height);
    ctx.strokeStyle = "#ff0044";
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width - 16, 0, 16, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.save();
    ctx.translate(canvas.width - 6, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("BARREIRA ATIVA! DERROTE O INIMIGO!", 0, 0);
    ctx.restore();
  }

  // Jogador
  if (!desenharSprite(imgs.jogador, jogador.x - 8, jogador.y, jogador.largura + 16, jogador.altura)) {
    ctx.fillStyle = "#00b0ff";
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);
  }

  // Inimigo
  if (!inimigo.estaMorto) {
    if (!desenharSprite(imgs.inimigo, inimigo.x - 8, inimigo.y, inimigo.largura + 16, inimigo.altura)) {
      ctx.fillStyle = "#ff4757";
      ctx.fillRect(inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    }
  } else {
    const segRestantes = Math.max(0, Math.ceil(inimigo.timerMorte));
    ctx.fillStyle = "#ff4757";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀 ELIMINADO!", inimigo.x + inimigo.largura / 2, canvas.height / 2 - 12);
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#00ff88";
    ctx.fillText(`Volta em: ${segRestantes}s`, inimigo.x + inimigo.largura / 2, canvas.height / 2 + 14);
  }

  // Rastro da bola (do mais antigo ao mais recente)
  const lenRastro = bola.rastro.length;
  for (let i = 0; i < lenRastro; i++) {
    const r = bola.rastro[i];
    const fator = (i + 1) / lenRastro;
    ctx.fillStyle = `rgba(255, 255, 255, ${fator * 0.35})`;
    ctx.beginPath();
    ctx.arc(r.x, r.y, bola.raio * fator, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bola
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Partículas e Textos Flutuantes
  for (const p of particulas) {
    ctx.fillStyle = p.cor;
    ctx.globalAlpha = Math.max(p.vida, 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const tf of textosFlutuantes) {
    ctx.fillStyle = tf.cor;
    ctx.globalAlpha = Math.max(tf.vida, 0);
    ctx.font = `bold ${tf.tam}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(tf.texto, tf.x, tf.y);
  }
  ctx.globalAlpha = 1;

  // Tela Pausada
  if (pausado) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PAUSADO", canvas.width / 2, canvas.height / 2);
  }

  ctx.restore();
}


// ========================================================
// 9. LOOP PRINCIPAL
// ========================================================

function loop(tempoAtual) {
  const dt = Math.min((tempoAtual - ultimoTempo) / 1000, 0.1);
  ultimoTempo = tempoAtual;

  atualizar(dt);
  desenhar();
  requestAnimationFrame(loop);
}

resetarBola(1);
atualizarHUD(true);
requestAnimationFrame((tempo) => {
  ultimoTempo = tempo;
  loop(tempo);
});