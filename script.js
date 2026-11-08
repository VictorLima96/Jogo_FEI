// ========================================================
// PONG ULTRA BALATRO - SCRIPT PRINCIPAL
// Inspirado em Pong + Balatro + Ultra Pool
// ========================================================

// 1. CONFIGURAÇÃO DO CANVAS
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// Elementos da interface HTML
const chipsDisplay = document.getElementById("chips-display");
const multDisplay = document.getElementById("mult-display");
const roundPtsDisplay = document.getElementById("round-pts");
const playerIconsDiv = document.getElementById("player-score-icons");
const enemyIconsDiv = document.getElementById("enemy-score-icons");
const powerupBanner = document.getElementById("powerup-banner");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");

// 2. CARREGAR IMAGENS
const imgJogador = new Image();
imgJogador.src = "Images/player.png";

const imgInimigo = new Image();
imgInimigo.src = "Images/enemy.png";

const imgPowerUp = new Image();
imgPowerUp.src = "Images/powerup.png";

const imgPonto = new Image();
imgPonto.src = "Images/oculos.png";

// 3. CARREGAR ÁUDIOS
const sonsGolJogador = [
  new Audio("Audios/gol1.mp3"),
  new Audio("Audios/gol2.mp3"),
  new Audio("Audios/gol3.mp3")
];

const sonsGolInimigo = [
  new Audio("Audios/robogol1.mp3"),
  new Audio("Audios/robogol2.mp3"),
  new Audio("Audios/robogol3.mp3")
];

const somEmpate = new Audio("Audios/empategol.mp3");

// Efeitos sonoros rápidos via Web Audio API para respostas imediatas
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarBip(freq = 320, tipo = "sine", duracao = 0.08) {
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
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
    if (tipo === "jogador") {
      const idx = Math.floor(Math.random() * sonsGolJogador.length);
      sonsGolJogador[idx].currentTime = 0;
      sonsGolJogador[idx].play();
    } else if (tipo === "inimigo") {
      const idx = Math.floor(Math.random() * sonsGolInimigo.length);
      sonsGolInimigo[idx].currentTime = 0;
      sonsGolInimigo[idx].play();
    } else if (tipo === "empate") {
      somEmpate.currentTime = 0;
      somEmpate.play();
    }
  } catch (err) {
    console.log("Audio play info:", err);
  }
}

// 4. VARIÁVEIS DO JOGO
let pausado = false;
let screenShake = 0;

// Placar de Gols
let golsJogador = 0;
let golsInimigo = 0;
const MAX_GOLS = 5;

// Balatro: Fichas x Mult
let fichas = 0;
let multiplicador = 1;
let pontuacaoTotal = 0;

// Jogador (Raquete da Esquerda)
const jogador = {
  x: 24,
  y: canvas.height / 2 - 50,
  largura: 32,
  altura: 100,
  velocidade: 7,
  subindo: false,
  descendo: false
};

// Inimigo (Raquete da Direita)
const inimigo = {
  x: canvas.width - 56,
  y: canvas.height / 2 - 50,
  largura: 32,
  altura: 100,
  velocidade: 4.6,
  estaMorto: false,
  tempoMorte: 0,
  duracaoMorte: 7 // 7 segundos para ressurgir
};

// Bola (Ultra Pool)
const bola = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  raio: 10,
  velX: 6,
  velY: 4,
  velMax: 14,
  rastro: []
};

// Power Up no Campo
const powerUp = {
  x: canvas.width / 2,
  y: canvas.height / 2 - 90,
  raio: 24,
  ativoNoCampo: true,
  coletado: false,
  balanco: 0
};

// Bumpers Centrais (estilo Ultra Pool)
const bumpers = [
  { x: canvas.width / 2, y: 110, raio: 22, cor: "#00fff2" },
  { x: canvas.width / 2, y: canvas.height - 110, raio: 22, cor: "#ff007f" }
];

// Partículas e Textos Flutuantes
let particulas = [];
let textosFlutuantes = [];

function criarTextoFlutuante(x, y, texto, cor = "#ffd700", tam = 16) {
  textosFlutuantes.push({
    x: x,
    y: y,
    texto: texto,
    cor: cor,
    tam: tam,
    vida: 1.0,
    velY: -1.5
  });
}

function criarExplosao(x, y, cor, qtd = 15) {
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 5;
    particulas.push({
      x: x,
      y: y,
      velX: Math.cos(ang) * v,
      velY: Math.sin(ang) * v,
      vida: 1,
      decaimento: 0.025 + Math.random() * 0.02,
      cor: cor,
      tam: 3 + Math.random() * 3
    });
  }
}

// 5. ATUALIZAR HUD E PLACAR
function atualizarHUD() {
  chipsDisplay.innerText = fichas;
  multDisplay.innerText = multiplicador;
  roundPtsDisplay.innerText = `= ${fichas * multiplicador} pts (Total: ${pontuacaoTotal})`;

  // Ícones de ponto (óculos thug life)
  playerIconsDiv.innerHTML = "";
  for (let i = 0; i < golsJogador; i++) {
    const icone = document.createElement("img");
    icone.src = imgPonto.src;
    icone.className = "score-point-icon";
    icone.title = "Gol do Jogador!";
    playerIconsDiv.appendChild(icone);
  }

  enemyIconsDiv.innerHTML = "";
  for (let i = 0; i < golsInimigo; i++) {
    const icone = document.createElement("img");
    icone.src = imgPonto.src;
    icone.className = "score-point-icon";
    icone.title = "Gol do Inimigo!";
    enemyIconsDiv.appendChild(icone);
  }

  // Banner informativo do poder
  if (powerUp.coletado && !inimigo.estaMorto) {
    powerupBanner.classList.remove("hidden");
    powerupBanner.innerText = "⚡ PODER ATIVO! Acerte a bola no INIMIGO para eliminá-lo e abrir o gol!";
  } else if (inimigo.estaMorto) {
    powerupBanner.classList.remove("hidden");
    const segundosRestantes = Math.ceil(inimigo.duracaoMorte - (Date.now() - inimigo.tempoMorte) / 1000);
    powerupBanner.innerText = `💀 INIMIGO ELIMINADO! O gol adversário está livre! Ele ressurge em ${segundosRestantes > 0 ? segundosRestantes : 0}s!`;
  } else {
    powerupBanner.classList.add("hidden");
  }
}

// 6. CONTROLES
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  jogador.y = mouseY - jogador.altura / 2;

  if (jogador.y < 0) jogador.y = 0;
  if (jogador.y + jogador.altura > canvas.height) jogador.y = canvas.height - jogador.altura;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") jogador.subindo = true;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") jogador.descendo = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") jogador.subindo = false;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") jogador.descendo = false;
});

btnPause.addEventListener("click", () => {
  pausado = !pausado;
  btnPause.innerText = pausado ? "Continuar" : "Pausar";
});

btnReset.addEventListener("click", () => {
  reiniciarJogo();
});

function resetarBola(direcao = 1) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  bola.velX = 6 * direcao;
  bola.velY = (Math.random() * 6 - 3) || 3;
  bola.rastro = [];

  // Somar pontos da jogada estilo Balatro
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
  inimigo.estaMorto = false;
  resetarBola(1);
  tocarSomGol("empate");
}

// 7. ATUALIZAÇÃO DA FÍSICA
function atualizar() {
  if (pausado) return;

  // Movimento Teclado
  if (jogador.subindo && jogador.y > 0) jogador.y -= jogador.velocidade;
  if (jogador.descendo && jogador.y + jogador.altura < canvas.height) jogador.y += jogador.velocidade;

  // Movimento Inimigo (IA simples)
  if (!inimigo.estaMorto) {
    const centroInimigo = inimigo.y + inimigo.altura / 2;
    if (centroInimigo < bola.y - 12) {
      inimigo.y += inimigo.velocidade;
    } else if (centroInimigo > bola.y + 12) {
      inimigo.y -= inimigo.velocidade;
    }
    if (inimigo.y < 0) inimigo.y = 0;
    if (inimigo.y + inimigo.altura > canvas.height) inimigo.y = canvas.height - inimigo.altura;
  } else {
    // Inimigo morto: contagem regressiva de ressurgimento (6 a 7s)
    const tempoMorto = (Date.now() - inimigo.tempoMorte) / 1000;
    if (tempoMorto >= inimigo.duracaoMorte) {
      inimigo.estaMorto = false;
      inimigo.y = canvas.height / 2 - inimigo.altura / 2;
      criarExplosao(inimigo.x + inimigo.largura / 2, inimigo.y + inimigo.altura / 2, "#00ff88", 25);
      tocarBip(600, "triangle", 0.2);
    }
  }

  // Rastro da bola (Ultra Pool)
  bola.rastro.unshift({ x: bola.x, y: bola.y });
  if (bola.rastro.length > 7) bola.rastro.pop();

  // Movimentação da bola
  bola.x += bola.velX;
  bola.y += bola.velY;

  // Quique nas paredes superior e inferior
  if (bola.y - bola.raio <= 0) {
    bola.y = bola.raio;
    bola.velY = -bola.velY;
    multiplicador += 1;
    tocarBip(280);
    criarExplosao(bola.x, bola.y, "#ffffff", 6);
  }
  if (bola.y + bola.raio >= canvas.height) {
    bola.y = canvas.height - bola.raio;
    bola.velY = -bola.velY;
    multiplicador += 1;
    tocarBip(280);
    criarExplosao(bola.x, bola.y, "#ffffff", 6);
  }

  // Quique nos Bumpers centrais (Ultra Pool)
  bumpers.forEach(b => {
    const dx = bola.x - b.x;
    const dy = bola.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bola.raio + b.raio) {
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
  });

  // Coleta do Power-Up
  if (powerUp.ativoNoCampo) {
    powerUp.balanco += 0.05;
    const yOscilando = powerUp.y + Math.sin(powerUp.balanco) * 7;
    const dx = bola.x - powerUp.x;
    const dy = bola.y - yOscilando;
    if (Math.hypot(dx, dy) < bola.raio + powerUp.raio) {
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
    bola.x - bola.raio <= jogador.x + jogador.largura &&
    bola.x + bola.raio >= jogador.x &&
    bola.y >= jogador.y &&
    bola.y <= jogador.y + jogador.altura &&
    bola.velX < 0
  ) {
    bola.x = jogador.x + jogador.largura + bola.raio;
    const relativo = (bola.y - (jogador.y + jogador.altura / 2)) / (jogador.altura / 2);
    const angulo = relativo * (Math.PI / 3);
    const vel = Math.min(Math.hypot(bola.velX, bola.velY) + 0.3, bola.velMax);

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

  // Colisão com Inimigo (se vivo)
  if (!inimigo.estaMorto) {
    if (
      bola.x + bola.raio >= inimigo.x &&
      bola.x - bola.raio <= inimigo.x + inimigo.largura &&
      bola.y >= inimigo.y &&
      bola.y <= inimigo.y + inimigo.altura &&
      bola.velX > 0
    ) {
      // SE O PODER ESTIVER ATIVO: BOLA MATA O INIMIGO E ABRE O GOL!
      if (powerUp.coletado) {
        inimigo.estaMorto = true;
        inimigo.tempoMorte = Date.now();
        powerUp.coletado = false; // Consome o poder
        screenShake = 14;

        // Rebate a bola com impacto cinematográfico
        bola.velX = -Math.abs(bola.velX) * 1.15;
        criarExplosao(inimigo.x, inimigo.y + inimigo.altura / 2, "#ff0044", 35);
        criarTextoFlutuante(inimigo.x - 30, inimigo.y + 30, "💥 K.O.! GOL LIBERADO (7s)!", "#ff0044", 18);
        tocarBip(150, "sawtooth", 0.35);

        fichas += 100;
        multiplicador += 5;

        // Power-up volta a aparecer depois de 9 segundos
        setTimeout(() => {
          powerUp.ativoNoCampo = true;
        }, 9000);

      } else {
        // Rebatida normal do inimigo
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
  }

  // VERIFICAÇÃO DE GOL NO INIMIGO (DIREITA)
  if (bola.x + bola.raio >= canvas.width) {
    // Se o poder está ativo mas o inimigo NÃO foi morto ainda, a barreira protege o gol!
    if (powerUp.coletado && !inimigo.estaMorto) {
      bola.x = canvas.width - bola.raio;
      bola.velX = -bola.velX;
      screenShake = 6;
      tocarBip(180, "sawtooth", 0.15);
      criarExplosao(canvas.width, bola.y, "#ff0044", 15);
    } else {
      // GOL VÁLIDO DO JOGADOR!
      golsJogador++;
      tocarSomGol("jogador");
      criarExplosao(canvas.width, bola.y, "#00ff88", 45);
      criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "⚽ GOOOOOL DO JOGADOR!", "#00ff88", 28);
      screenShake = 12;

      if (golsJogador >= MAX_GOLS) {
        setTimeout(() => {
          alert("🎉 VITÓRIA! VOCÊ MARCOU 5 GOLS E VENCEU O ROBÔ!");
          reiniciarJogo();
        }, 300);
      } else {
        resetarBola(-1);
      }
    }
  }

  // VERIFICAÇÃO DE GOL DO INIMIGO (ESQUERDA)
  if (bola.x - bola.raio <= 0) {
    golsInimigo++;
    tocarSomGol("inimigo");
    criarExplosao(0, bola.y, "#ff3333", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🤖 GOL DO ROBÔ!", "#ff4757", 28);
    screenShake = 12;

    if (golsInimigo >= MAX_GOLS) {
      setTimeout(() => {
        alert("💀 O ROBÔ VENCEU! CLIQUE EM OK PARA TENTAR NOVAMENTE!");
        reiniciarJogo();
      }, 300);
    } else {
      resetarBola(1);
    }
  }

  // Atualizar partículas
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.velX;
    p.y += p.velY;
    p.vida -= p.decaimento;
    if (p.vida <= 0) particulas.splice(i, 1);
  }

  // Suavizar screen shake
  if (screenShake > 0) screenShake *= 0.88;
  if (screenShake < 0.2) screenShake = 0;

  atualizarHUD();
}

// 8. DESENHAR NO CANVAS
function desenhar() {
  ctx.save();

  // Screen shake
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake * 2;
    const shakeY = (Math.random() - 0.5) * screenShake * 2;
    ctx.translate(shakeX, shakeY);
  }

  // Fundo
  ctx.fillStyle = "#0c1710";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Linhas da mesa
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Círculo central
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Bumpers centrais (Ultra Pool)
  bumpers.forEach(b => {
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
    ctx.shadowBlur = 0;
  });

  // Power-Up no campo
  if (powerUp.ativoNoCampo) {
    const yOsc = powerUp.y + Math.sin(powerUp.balanco) * 7;
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 15;

    if (imgPowerUp.complete && imgPowerUp.naturalWidth > 0) {
      ctx.drawImage(imgPowerUp, powerUp.x - 24, yOsc - 24, 48, 48);
    } else {
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

  // BARREIRA DO GOL BLOQUEADO
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

  // JOGADOR
  if (imgJogador.complete && imgJogador.naturalWidth > 0) {
    ctx.drawImage(imgJogador, jogador.x - 8, jogador.y, jogador.largura + 16, jogador.altura);
  } else {
    ctx.fillStyle = "#00b0ff";
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);
  }

  // INIMIGO (ou contador de morte)
  if (!inimigo.estaMorto) {
    if (imgInimigo.complete && imgInimigo.naturalWidth > 0) {
      ctx.drawImage(imgInimigo, inimigo.x - 8, inimigo.y, inimigo.largura + 16, inimigo.altura);
    } else {
      ctx.fillStyle = "#ff4757";
      ctx.fillRect(inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    }
  } else {
    // Texto de inimigo morto e contagem regressiva
    const segRestantes = Math.ceil(inimigo.duracaoMorte - (Date.now() - inimigo.tempoMorte) / 1000);
    ctx.fillStyle = "#ff4757";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀 ELIMINADO!", inimigo.x + inimigo.largura / 2, canvas.height / 2 - 12);
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#00ff88";
    ctx.fillText(`Volta em: ${segRestantes > 0 ? segRestantes : 0}s`, inimigo.x + inimigo.largura / 2, canvas.height / 2 + 14);
  }

  // RASTRO DA BOLA (Ultra Pool)
  for (let i = 0; i < bola.rastro.length; i++) {
    const r = bola.rastro[i];
    const alpha = (1 - i / bola.rastro.length) * 0.35;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(r.x, r.y, bola.raio * (1 - i / bola.rastro.length), 0, Math.PI * 2);
    ctx.fill();
  }

  // BOLA
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // PARTÍCULAS
  particulas.forEach(p => {
    ctx.fillStyle = p.cor;
    ctx.globalAlpha = Math.max(p.vida, 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
    ctx.fill();
  });
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

// 9. LOOP PRINCIPAL
function loop() {
  atualizar();
  desenhar();
  requestAnimationFrame(loop);
}

// Início
resetarBola(1);
loop();
