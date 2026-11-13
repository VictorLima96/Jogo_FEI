// ========================================================
// VARELA PONG ROGUELIKE - A BATALHA DOS 3 BOSSES (OTIMIZADO)
// ========================================================

// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

let estado = "menu"; // "menu", "escolha_inicial", "jogando", "escolhendo", "gameover", "vitoria"
let pausado = false;
let screenShake = 0;

const dadosBosses = [
  {
    nome: "Planilha Excel (Fácil)",
    velocidade: 195,
    altura: 90,
    corTema: "#107c41"
  },
  {
    nome: "Free Fire (Médio)",
    velocidade: 255,
    altura: 88,
    corTema: "#ff8c00"
  },
  {
    nome: "Freddy Fazbear (Difícil)",
    velocidade: 320,
    altura: 90,
    corTema: "#8b4513"
  }
];

let bossAtualIndex = 0;
let vidasVarela = 3;
const MAX_VIDAS_VARELA = 3;
let vidasBoss = 4;
const MAX_VIDAS_BOSS = 4;

const varela = {
  x: 25,
  y: 215,
  largura: 32,
  alturaPadrao: 95,
  altura: 95,
  velocidadePadrao: 380,
  velocidade: 380,
  mortoTimer: 0,
  lentoTimer: 0,
  desestabilizadoTimer: 0,
  dashCooldown: 0,
  socoCooldown: 0,
  socoAtivoTimer: 0,
  shieldCooldown: 0,
  shieldAtivoTimer: 0,
  flashDano: 0
};

const boss = {
  x: 803,
  y: 215,
  largura: 32,
  altura: 95,
  velocidade: 200,
  mortoTimer: 0,
  congeladoTimer: 0,
  barreiraGeloTimer: 0,
  cooldownHab1: 4.0,
  cooldownHab2: 7.0,
  flashDano: 0
};

const bola = {
  x: 430,
  y: 260,
  raio: 10,
  velocidadeBase: 310,
  velX: 310,
  velY: 140,
  lentaTimer: 0,
  superSoco: false,
  thugLifeFogo: false,
  rastro: []
};

let tempoSaque = 0;
let projeteisProcv = [];
let tirosFreeFire = [];
let miniFreddies = [];
let cooldownLevaFreddies = 6.0;
let freddy2Timer = 0;
let acertosFreddles = 0;
let golpesConsecutivos = 0;
let jumpscareTimer = 0;
let gatosAliados = [];

const powerUpMapa = {
  ativo: false,
  x: 430,
  y: 260,
  raio: 24,
  tipo: "",
  tempoParaSpawn: 15.0,
  balanco: 0
};

let powerUpsVarela = [];
let cartasParaEscolha = [];
let particulas = [];
let textosFlutuantes = [];

let mouseX = 0;
let mouseY = 0;
let ultimoToqueCima = 0;
let ultimoToqueBaixo = 0;
let wAbaixada = false;
let sAbaixada = false;
let ultimoTempo = performance.now();


// ========================================================
// 2. CARREGAMENTO DE IMAGENS E HELPERS
// ========================================================

const carregarImg = (caminho) => {
  const img = new Image();
  img.src = caminho;
  return img;
};

const imgs = {
  varela: carregarImg("assets/player.png"),
  bosses: [
    carregarImg("assets/boss_excel.png"),
    carregarImg("assets/boss_freefire.png"),
    carregarImg("assets/boss_fred.png")
  ],
  choleraFred: carregarImg("assets/cholera_fred.png"),
  gatoMilitar: carregarImg("assets/gato_militar.png"),
  gatoKawaii: carregarImg("assets/gato_kawaii.png"),
  caracol: carregarImg("assets/caracol.png"),
  gelo: carregarImg("assets/Gelo.png"),
  oculos: carregarImg("assets/player.png"),
  coracao: carregarImg("assets/coracao.png"),
  gameOver: carregarImg("assets/game_over.png")
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

const colideAABB = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

const limitarY = (entidade) => {
  entidade.y = Math.max(0, Math.min(canvas.height - entidade.altura, entidade.y));
};


// ========================================================
// 3. ÁUDIO SEQUENCIAL E SINTETIZADOR
// ========================================================

const VOLUME_EFEITOS = 0.6;
const VOLUME_OST = 0.3;

const carregarAudio = (caminho, volume = VOLUME_EFEITOS, loop = false) => {
  const a = new Audio(caminho);
  a.preload = "auto";
  a.volume = volume;
  a.loop = loop;
  a.addEventListener("error", () => console.warn("Áudio não carregou:", caminho), { once: true });
  return a;
};

const faixasOST = [
  "01 - A1 - Mystery Prelude.mp3", "02 - A2 - Car Patrol - Title Sequence.mp3",
  "03 - A3 - Breathless.mp3", "04 - A4 - Breathless - Short Version.mp3",
  "05 - A5 - Waiting Game.mp3", "06 - A6 - Mystery Moll.mp3",
  "07 - A7 - Mystery Movement.mp3", "08 - A8 - The Heavies.mp3",
  "09 - A9 - Dirty Scene.mp3", "10 - B1 - Study In Fear.mp3",
  "11 - B2 - Empty Streets.mp3", "12 - B3 - Night Watch.mp3",
  "13 - B4 - Foot Patrol.mp3", "14 - B5 - Quiet Girl.mp3",
  "15 - B6 - Relaxed Scene.mp3", "16 - B7 - Routine Procedure.mp3",
  "17 - B8 - Quietness Sustained.mp3"
];

const ostMenu = carregarAudio(`Audios/OST/${faixasOST[14]}`, VOLUME_OST, true);
const ostBatalha = faixasOST.filter((_, i) => i !== 14).map(f => carregarAudio(`Audios/OST/${f}`, VOLUME_OST, true));
let ostBatalhaAtual = null;

const sonsGolVarela = [1, 2, 3].map(n => carregarAudio(`Audios/Audios Gol Va/gol${n}.mp3`));
const sonsGolBoss = [1, 2, 3].map(n => carregarAudio(`Audios/Audios Gol En/robogol${n}.mp3`));
const somEmpate = carregarAudio("Audios/Audio Em/empategol.mp3");
const somPerde = carregarAudio("Audios/Audio Perde/fahhhhhhhhhhhhhh.mp3");
const somJumpscare = carregarAudio("Audios/Audios Enemy/Jumpscare.mp3");
const somBeatbox = carregarAudio("Audios/Music Freddy/Beatbox.mp3", VOLUME_OST, true);

const falasVarela = [1, 2].map(n => carregarAudio(`Audios/Audios Varela/Var${n}.mp3`));
const somVar3 = carregarAudio("Audios/Audios Varela/Var3.mp3");

const vozesExcel = [1, 2, 3].map(n => carregarAudio(`Audios/Audios Enemy/Excel${n}.mp3`));
const somFF1 = carregarAudio("Audios/Audios Enemy/FF1.mp3");
const somFF2 = carregarAudio("Audios/Audios Enemy/FF2.mp3");
const somFF3 = carregarAudio("Audios/Audios Enemy/FF3.mp3");
const somFF4 = carregarAudio("Audios/Audios Enemy/FF4.mp3");
const somFreddy1 = carregarAudio("Audios/Audios Enemy/Freddy1.mp3");
const somFreddy2 = carregarAudio("Audios/Audios Enemy/Freddy2.mp3");

const falasBosses = [
  vozesExcel,
  [somFF3],
  [somFreddy1]
];

const somProcvExcel = carregarAudio("Audios/Audio Poderes/Procv_Excel.mp3");
const somTiroFF = carregarAudio("Audios/Audio Poderes/Tiro_FF.mp3");
const somFredito = carregarAudio("Audios/Audio Poderes/Fredditos.mp3");

let somLigado = true;
let proximaFalaVarela = 9;
let proximaFalaBoss = 13;
let falaAtiva = null;

const todosAudiosFala = [
  ...falasVarela, somVar3, ...falasBosses.flat(), somFF1, somFF2, somFF4,
  somFreddy2, somJumpscare, somPerde, somFredito
];

function pararListaAudio(lista) {
  for (const a of lista) { a.pause(); a.currentTime = 0; }
}

const pararFalas = () => {
  pararListaAudio(todosAudiosFala);
  falaAtiva = null;
  freditoPendente = false;
};

function tocarAudio(audio) {
  if (somLigado && audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
}

function tocarAudioAleatorio(lista) {
  if (!somLigado || !lista?.length) return;
  if (falaAtiva && !falaAtiva.paused) return;
  tocarFala(lista[Math.floor(Math.random() * lista.length)]);
}

function tocarFala(audio) {
  if (!somLigado || !audio) return;
  if (falaAtiva && falaAtiva !== audio) {
    falaAtiva.pause();
    falaAtiva.currentTime = 0;
  }
  audio.currentTime = 0;
  falaAtiva = audio;
  audio.play().catch(() => {});
  audio.onended = () => {
    if (falaAtiva === audio) falaAtiva = null;
  };
}

let freditoPendente = false;
function tocarFredito() {
  if (!somLigado) return;
  if (!somFredito.paused) { freditoPendente = true; return; }
  tocarFala(somFredito);
}
somFredito.addEventListener("ended", () => {
  if (freditoPendente) { freditoPendente = false; tocarFala(somFredito); }
});

function tocarAudioDepois(audio, audioAnterior) {
  if (!somLigado || !audio) return;
  if (!audioAnterior || audioAnterior.paused || audioAnterior.ended) {
    tocarAudio(audio);
    return;
  }

  let finalizado = false;
  const tocarEmpate = () => {
    if (finalizado) return;
    finalizado = true;
    audioAnterior.removeEventListener("ended", tocarEmpate);
    audioAnterior.removeEventListener("error", tocarEmpate);
    tocarAudio(audio);
  };
  audioAnterior.addEventListener("ended", tocarEmpate, { once: true });
  audioAnterior.addEventListener("error", tocarEmpate, { once: true });
}

function checarEmpate(audioAnterior) {
  if (vidasVarela === vidasBoss) tocarAudioDepois(somEmpate, audioAnterior);
}

function sincronizarMusica() {
  const pararOST = () => {
    ostMenu.pause(); ostMenu.currentTime = 0;
    somBeatbox.pause(); somBeatbox.currentTime = 0;
    if (ostBatalhaAtual) { ostBatalhaAtual.pause(); ostBatalhaAtual = null; }
  };
  if (!somLigado) return pararOST();

  if (estado === "menu") {
    if (ostBatalhaAtual) { ostBatalhaAtual.pause(); ostBatalhaAtual = null; }
    somBeatbox.pause(); somBeatbox.currentTime = 0;
    if (ostMenu.paused) ostMenu.play().catch(() => {});
  } else if (estado === "jogando" && bossAtualIndex === 2) {
    ostMenu.pause(); ostMenu.currentTime = 0;
    if (ostBatalhaAtual) { ostBatalhaAtual.pause(); ostBatalhaAtual = null; }
    if (somBeatbox.paused) somBeatbox.play().catch(() => {});
  } else if (estado === "jogando" || estado === "escolha_inicial" || estado === "escolhendo") {
    ostMenu.pause(); ostMenu.currentTime = 0;
    somBeatbox.pause(); somBeatbox.currentTime = 0;
    if (!ostBatalhaAtual) {
      ostBatalhaAtual = ostBatalha[Math.floor(Math.random() * ostBatalha.length)];
      ostBatalhaAtual.currentTime = 0;
    }
    if (ostBatalhaAtual.paused) ostBatalhaAtual.play().catch(() => {});
  } else {
    pararOST();
  }
}

function tocarAudioGol(quem) {
  if (!somLigado) return null;
  pararFalas();
  const ehVarela = quem === "varela";
  const lista = ehVarela ? sonsGolVarela : sonsGolBoss;
  const gols = ehVarela ? (MAX_VIDAS_BOSS - vidasBoss) : (MAX_VIDAS_VARELA - vidasVarela);
  const idx = (gols - 1 + lista.length) % lista.length;
  pararListaAudio(lista); // nunca sobrepor o mesmo conjunto
  tocarAudio(lista[idx]);
  return lista[idx];
}

let audioCtx = null;
function liberarAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
}

function tocarBip(freq = 400, tipo = "sine", duracao = 0.08) {
  if (!somLigado) return;
  liberarAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch (e) {}
}

function tocarHover() {
  if (!somLigado) return;
  liberarAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, audioCtx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.055);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.055);
  } catch (e) {}
}


// ========================================================
// 4. LISTA DE POWER-UPS (ROGUELIKE)
// ========================================================

const todosPowerUps = [
  {
    id: "varela_rapido",
    nome: "Varela Turbo",
    descricao: "Sua velocidade aumenta permanentemente em +40%.",
    corBorda: "#00ffea",
    aplicar() {
      varela.velocidadePadrao *= 1.4;
      varela.velocidade = varela.velocidadePadrao;
    }
  },
  {
    id: "soco_forte",
    nome: "Super Soco [ESPAÇO]",
    descricao: "Aperte ESPAÇO para ativar super soco flamejante (10s recarga).",
    corBorda: "#ff3b30",
    aplicar() {}
  },
  {
    id: "inimigo_menor",
    nome: "Inimigo Nanico",
    descricao: "A raquete do Boss encolhe 35%, facilitando furar a defesa.",
    corBorda: "#ff007f",
    aplicar() { boss.altura *= 0.65; }
  },
  {
    id: "varela_dash",
    nome: "Dash Relâmpago",
    descricao: "Toque duas vezes rápido W ou S (ou Setas) para dar um dash veloz!",
    corBorda: "#ffcc00",
    aplicar() {}
  },
  {
    id: "shield_gol",
    nome: "Barreira de Escudo [E]",
    descricao: "Aperte E para erguer uma barreira no seu gol por 4s (20s recarga).",
    corBorda: "#af52de",
    aplicar() {}
  },
  {
    id: "exercito_gatos",
    nome: "Exército de Gatos 🐱",
    descricao: "Invoca 2 gatos soldados no meio da quadra que rebatem a bola pro Boss!",
    corBorda: "#34c759",
    aplicar() {
      gatosAliados = [
        { x: 260, y: 150, largura: 36, altura: 44, velY: 80, direcao: 1 },
        { x: 260, y: 340, largura: 36, altura: 44, velY: 80, direcao: -1 }
      ];
    }
  },
  {
    id: "gato_kawaii",
    nome: "Gato Kawaii Ímã ✨",
    descricao: "Aura hipnótica ao redor do Varela que atrai a bola para a raquete.",
    corBorda: "#ff77a9",
    aplicar() {}
  },
  {
    id: "thug_life",
    nome: "Thug Life Crítico 🕶️",
    descricao: "Rebater na ponta da raquete solta um smash crítico supersônico!",
    corBorda: "#ffd700",
    aplicar() {}
  }
];

const temPowerUp = (id) => powerUpsVarela.some(p => p.id === id);

function sortearCartasEscolha() {
  let disponiveis = todosPowerUps.filter(p => !temPowerUp(p.id));
  if (!disponiveis.length) disponiveis = [...todosPowerUps];
  cartasParaEscolha = disponiveis.sort(() => Math.random() - 0.5).slice(0, 3);
}

function prepararEscolhaInicial() {
  cartasParaEscolha = [todosPowerUps[0], todosPowerUps[1], todosPowerUps[3]];
  estado = "escolha_inicial";
  sincronizarMusica();
}

function escolherPowerUp(idx) {
  const escolhida = cartasParaEscolha[idx];
  if (!escolhida) return;

  powerUpsVarela.push(escolhida);
  escolhida.aplicar();

  if (estado === "escolha_inicial") {
    iniciarBatalhaBoss();
  } else {
    bossAtualIndex++;
    if (bossAtualIndex >= 3) { estado = "vitoria"; sincronizarMusica(); }
    else iniciarBatalhaBoss();
  }
}


// ========================================================
// 5. CONTROLES (TECLADO E MOUSE)
// ========================================================

const teclas = {};
const BOTAO_JOGAR = { x: 330, y: 318, largura: 200, altura: 66 };
let alvoHoverAtual = null;
let estadoVisualAnterior = null;

function obterAlvoInterativo(x, y) {
  if (estado === "menu") {
    return x >= BOTAO_JOGAR.x && x <= BOTAO_JOGAR.x + BOTAO_JOGAR.largura &&
      y >= BOTAO_JOGAR.y && y <= BOTAO_JOGAR.y + BOTAO_JOGAR.altura ? "jogar" : null;
  }
  if (estado !== "escolhendo" && estado !== "escolha_inicial") return null;
  const larguraCarta = 210, alturaCarta = 265, espaco = 25, yBase = 135;
  const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;
  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const xCarta = inicioX + i * (larguraCarta + espaco);
    if (x >= xCarta && x <= xCarta + larguraCarta && y >= yBase && y <= yBase + alturaCarta) return `carta-${i}`;
  }
  return null;
}

document.getElementById("btn-play").addEventListener("click", () => {
  liberarAudio();
  if (estado === "menu") prepararEscolhaInicial();
});

document.getElementById("btn-play").addEventListener("mouseenter", () => {
  if (estado === "menu" && alvoHoverAtual !== "jogar") tocarHover();
  alvoHoverAtual = "jogar";
});

document.getElementById("btn-play").addEventListener("mouseleave", () => {
  if (alvoHoverAtual === "jogar") alvoHoverAtual = null;
});

function ativarShield() {
  if (temPowerUp("shield_gol") && varela.shieldCooldown <= 0 && varela.mortoTimer <= 0) {
    varela.shieldAtivoTimer = 4.0;
    varela.shieldCooldown = 20.0;
    tocarBip(500, "sine", 0.25);
    criarTextoFlutuante(varela.x + 35, varela.y, "🛡️ SHIELD ATIVO!", "#af52de", 18);
  }
}

function executarDash(deltaY) {
  varela.y += deltaY;
  limitarY(varela);
  varela.dashCooldown = 1.8;
  screenShake = 2;
  tocarBip(900, "triangle", 0.12);
  criarTextoFlutuante(varela.x + 35, varela.y, "⚡ DASH!", "#ffcc00", 17);
  criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#ffcc00", 15);
}

window.addEventListener("load", sincronizarMusica);
window.addEventListener("pointerdown", () => {
  liberarAudio();
  sincronizarMusica();
});

window.addEventListener("keydown", (e) => {
  liberarAudio();
  sincronizarMusica();
  if (e.repeat) return;
  teclas[e.key] = true;

  if (e.code === "Space") {
    if (estado === "menu") return prepararEscolhaInicial();
    if (estado === "gameover" || estado === "vitoria") return reiniciarJogoCompleto();

    if (estado === "jogando") {
      if (miniFreddies.some(m => m.grudado)) {
        miniFreddies = miniFreddies.filter(m => {
          if (m.grudado) {
            criarExplosao(m.x, m.y, "#ffcc00", 10);
            return false;
          }
          return true;
        });
        tocarBip(800, "triangle", 0.1);
        criarTextoFlutuante(varela.x + 35, varela.y, "💨 MINI FREDDIES ESPANTADOS!", "#ffcc00", 15);
      }

      if (temPowerUp("soco_forte") && varela.socoCooldown <= 0 && varela.mortoTimer <= 0) {
        varela.socoAtivoTimer = 2.5;
        varela.socoCooldown = 10.0;
        screenShake = 3;
        tocarBip(750, "square", 0.15);
        criarTextoFlutuante(varela.x + 35, varela.y, "🔥 SOCO PRONTO!", "#ff3b30", 18);
      } else if (!temPowerUp("soco_forte")) {
        ativarShield();
      }
    }
  }

  if ((e.key === "e" || e.key === "E") && estado === "jogando") ativarShield();

  if (e.key === "m" || e.key === "M") {
    somLigado = !somLigado;
    sincronizarMusica();
    criarTextoFlutuante(canvas.width / 2, 40, somLigado ? "🔊 SOM LIGADO" : "🔇 SOM MUTADO", "#fff", 16);
  }

  if ((e.key === "p" || e.key === "P") && estado === "jogando") pausado = !pausado;

  if (temPowerUp("varela_dash") && estado === "jogando" && varela.dashCooldown <= 0 && varela.mortoTimer <= 0) {
    const agora = performance.now();
    if ((e.key === "w" || e.key === "W" || e.key === "ArrowUp") && !wAbaixada) {
      if (agora - ultimoToqueCima < 360) executarDash(-120);
      ultimoToqueCima = agora;
      wAbaixada = true;
    }
    if ((e.key === "s" || e.key === "S" || e.key === "ArrowDown") && !sAbaixada) {
      if (agora - ultimoToqueBaixo < 360) executarDash(120);
      ultimoToqueBaixo = agora;
      sAbaixada = true;
    }
  }

  if (estado === "escolhendo" || estado === "escolha_inicial") {
    if (e.key === "1") escolherPowerUp(0);
    if (e.key === "2") escolherPowerUp(1);
    if (e.key === "3") escolherPowerUp(2);
  }
});

window.addEventListener("keyup", (e) => {
  teclas[e.key] = false;
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") wAbaixada = false;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") sAbaixada = false;
});

canvas.addEventListener("mousemove", (e) => {
  const ret = canvas.getBoundingClientRect();
  mouseX = e.clientX - ret.left;
  mouseY = e.clientY - ret.top;
  const novoAlvoHover = obterAlvoInterativo(mouseX, mouseY);
  if (novoAlvoHover !== alvoHoverAtual) {
    if (novoAlvoHover) tocarHover();
    alvoHoverAtual = novoAlvoHover;
  }

  if (estado === "jogando" && !pausado && mouseX < canvas.width / 2 && varela.mortoTimer <= 0) {
    varela.y = mouseY - varela.altura / 2;
    limitarY(varela);
  }
});

canvas.addEventListener("click", () => {
  liberarAudio();
  sincronizarMusica();
  if (estado === "menu") {
    if (mouseX >= BOTAO_JOGAR.x && mouseX <= BOTAO_JOGAR.x + BOTAO_JOGAR.largura &&
        mouseY >= BOTAO_JOGAR.y && mouseY <= BOTAO_JOGAR.y + BOTAO_JOGAR.altura) {
      prepararEscolhaInicial();
    }
    return;
  }
  if (estado !== "escolhendo" && estado !== "escolha_inicial") return;

  const larguraCarta = 210, alturaCarta = 265, espaco = 25, yBase = 135;
  const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;

  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const x = inicioX + i * (larguraCarta + espaco);
    if (mouseX >= x && mouseX <= x + larguraCarta && mouseY >= yBase && mouseY <= yBase + alturaCarta) {
      escolherPowerUp(i);
      break;
    }
  }
});


// ========================================================
// 6. ATUALIZAÇÃO DA LÓGICA E FÍSICA
// ========================================================

function reiniciarJogoCompleto() {
  bossAtualIndex = 0;
  powerUpsVarela = [];
  varela.velocidadePadrao = 380;
  varela.velocidade = 380;
  varela.altura = varela.alturaPadrao;
  gatosAliados = [];
  prepararEscolhaInicial();
}

function iniciarBatalhaBoss() {
  vidasVarela = MAX_VIDAS_VARELA;
  vidasBoss = MAX_VIDAS_BOSS;
  pausado = false;

  const dados = dadosBosses[bossAtualIndex];
  Object.assign(boss, {
    velocidade: dados.velocidade,
    altura: temPowerUp("inimigo_menor") ? dados.altura * 0.65 : dados.altura,
    mortoTimer: 0,
    congeladoTimer: 0,
    barreiraGeloTimer: 0,
    cooldownHab1: 4.0,
    cooldownHab2: 7.0
  });

  Object.assign(varela, {
    mortoTimer: 0,
    lentoTimer: 0,
    desestabilizadoTimer: 0,
    socoCooldown: 0,
    socoAtivoTimer: 0,
    shieldCooldown: 0,
    shieldAtivoTimer: 0,
    dashCooldown: 0
  });

  projeteisProcv = [];
  tirosFreeFire = [];
  miniFreddies = [];
  jumpscareTimer = 0;
  cooldownLevaFreddies = 6.0;
  freddy2Timer = 0;
  acertosFreddles = 0;
  golpesConsecutivos = 0;
  powerUpMapa.ativo = false;
  powerUpMapa.tempoParaSpawn = 15.0;

  proximaFalaVarela = 4 + Math.random() * 5;
  proximaFalaBoss = 3 + Math.random() * 5;

  resetarBola(1);
  estado = "jogando";
  sincronizarMusica();
}

function resetarBola(direcao = 1) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  bola.superSoco = false;
  bola.thugLifeFogo = false;
  bola.rastro.length = 0;
  tempoSaque = 0.6;
  bola.velX = bola.velocidadeBase * direcao;
  bola.velY = (Math.random() * 140 - 70) || 50;
}

const criarTextoFlutuante = (x, y, texto, cor = "#ffd700", tam = 16) =>
  textosFlutuantes.push({ x, y, texto, cor, tam, vida: 1.0 });

function criarExplosao(x, y, cor, qtd = 12) {
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const vel = 2 + Math.random() * 4;
    particulas.push({
      x, y,
      velX: Math.cos(ang) * vel,
      velY: Math.sin(ang) * vel,
      vida: 1.0,
      decaimento: 0.03 + Math.random() * 0.02,
      cor,
      tam: 3 + Math.random() * 3
    });
  }
}

function atualizar(dt) {
  if (estado !== "jogando" || pausado) return;

  // Falas periódicas
  proximaFalaVarela -= dt;
  proximaFalaBoss -= dt;
  if (proximaFalaVarela <= 0 && varela.mortoTimer <= 0) {
    const lista = (vidasVarela - vidasBoss >= 2) ? [...falasVarela, somVar3] : falasVarela;
    tocarAudioAleatorio(lista);
    proximaFalaVarela = 11 + Math.random() * 12;
  }
  if (proximaFalaBoss <= 0 && boss.mortoTimer <= 0) {
    tocarAudioAleatorio(falasBosses[bossAtualIndex]);
    proximaFalaBoss = 13 + Math.random() * 14;
  }

  // Decremento de timers
  const dec = (obj, keys) => keys.forEach(k => { if (obj[k] > 0) obj[k] = Math.max(0, obj[k] - dt); });
  dec(varela, ["flashDano", "socoCooldown", "socoAtivoTimer", "shieldCooldown", "shieldAtivoTimer", "dashCooldown", "mortoTimer", "lentoTimer", "desestabilizadoTimer"]);
  dec(boss, ["flashDano", "mortoTimer", "congeladoTimer", "barreiraGeloTimer"]);
  if (jumpscareTimer > 0) jumpscareTimer = Math.max(0, jumpscareTimer - dt);
  if (freddy2Timer > 0) freddy2Timer = Math.max(0, freddy2Timer - dt);

  varela.velocidade = varela.lentoTimer > 0 ? varela.velocidadePadrao * 0.5 : varela.velocidadePadrao;
  const dirMov = varela.desestabilizadoTimer > 0 ? -1 : 1;

  // Movimento do Varela
  if (varela.mortoTimer <= 0 && jumpscareTimer <= 0) {
    if (teclas["w"] || teclas["W"] || teclas["ArrowUp"]) varela.y -= varela.velocidade * dirMov * dt;
    if (teclas["s"] || teclas["S"] || teclas["ArrowDown"]) varela.y += varela.velocidade * dirMov * dt;
    if (varela.desestabilizadoTimer > 0) varela.y += (Math.random() - 0.5) * 6;
    limitarY(varela);
  }

  // IA e Habilidades do Boss
  boss.cooldownHab1 -= dt;
  boss.cooldownHab2 -= dt;

  if (boss.mortoTimer <= 0 && boss.congeladoTimer <= 0) {
    const diff = bola.y - (boss.y + boss.altura / 2);
    if (Math.abs(diff) > 14) boss.y += Math.sign(diff) * boss.velocidade * dt;
    limitarY(boss);

    if (bossAtualIndex === 0 && boss.cooldownHab1 <= 0) {
      projeteisProcv.push({
        x: boss.x - 15,
        y: boss.y + boss.altura / 2,
        velX: -260,
        velY: (varela.y + varela.altura / 2 - (boss.y + boss.altura / 2)) * 0.6,
        largura: 65,
        altura: 22
      });
      boss.cooldownHab1 = 8.0;
      tocarBip(320, "sawtooth", 0.12);
      tocarAudio(somProcvExcel);
      criarTextoFlutuante(boss.x - 20, boss.y, "=PROCV() DISPARADO!", "#34c759", 15);
    } else if (bossAtualIndex === 1) {
      if (boss.cooldownHab1 <= 0) {
        boss.barreiraGeloTimer = 3.0;
        boss.cooldownHab1 = 10.0;
        screenShake = 2;
        tocarBip(650, "triangle", 0.2);
        tocarFala(somFF2);
        criarTextoFlutuante(boss.x - 20, boss.y, "🧊 GELO NO GOL!", "#00e5ff", 16);
      }
      if (boss.cooldownHab2 <= 0) {
        [20, boss.altura - 20].forEach((offset, idx) => {
          const alvoY = idx === 0 ? varela.y + 25 : varela.y + varela.altura - 25;
          tirosFreeFire.push({
            x: boss.x - 20,
            y: boss.y + offset,
            velX: -360,
            velY: (alvoY - (boss.y + offset)) * 0.65,
            raio: 6
          });
        });
        boss.cooldownHab2 = 9.5;
        tocarBip(900, "square", 0.18);
        tocarAudio(somTiroFF);
        criarTextoFlutuante(boss.x - 40, boss.y, "🔫 TIROS DE FREE FIRE!", "#ff8c00", 16);
      }
    } else if (bossAtualIndex === 2) {
      if (boss.cooldownHab1 <= 0) {
        varela.desestabilizadoTimer = 4.0;
        boss.cooldownHab1 = 10.0;
        screenShake = 3;
        tocarBip(120, "sawtooth", 0.5);
        criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🐻 HAR HAR HAR! CONTROLES INVERTIDOS!", "#ff3b30", 20);
      }
      cooldownLevaFreddies -= dt;
      if (cooldownLevaFreddies <= 0) {
        for (let i = 0; i < 3; i++) {
          miniFreddies.push({
            x: boss.x - 30,
            y: 80 + i * (canvas.height - 160) / 2,
            velX: -130,
            grudado: false,
            offsetY: 0
          });
        }
        cooldownLevaFreddies = 16.0;
        freddy2Timer = 16.0;
        acertosFreddles = 0;
        tocarBip(400, "triangle", 0.1);
        tocarFredito();
        tocarFala(somFreddy2);
      }
    }
  }

  const boxVarela = { x: varela.x, y: varela.y, w: varela.largura, h: varela.altura };

  // Tiros Free Fire
  tirosFreeFire = tirosFreeFire.filter(t => {
    t.x += t.velX * dt;
    t.y += t.velY * dt;
    if (colideAABB({ x: t.x - t.raio, y: t.y - t.raio, w: t.raio * 2, h: t.raio * 2 }, boxVarela)) {
      varela.mortoTimer = 3.0;
      golpesConsecutivos++;
      screenShake = 3;
      tocarBip(150, "sawtooth", 0.35);
      criarTextoFlutuante(varela.x + 40, varela.y + 20, "💀 ABATIDO! MORTO POR 3s!", "#ff3b30", 18);
      criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#ff8c00", 25);
      return false;
    }
    if (t.x < -50) golpesConsecutivos = 0;
    return t.x >= -50;
  });

  // Mini Freddies
  let freddiesGrudados = 0;
  miniFreddies = miniFreddies.filter(mf => {
    if (!mf.grudado) {
      mf.x += mf.velX * dt;
      mf.y += Math.sign((varela.y + varela.altura / 2) - mf.y) * 40 * dt;
      if (colideAABB({ x: mf.x, y: mf.y, w: 24, h: 24 }, boxVarela)) {
        mf.grudado = true;
        mf.offsetY = mf.y - varela.y;
        acertosFreddles++;
        tocarBip(250, "sawtooth", 0.15);
        criarTextoFlutuante(varela.x + 35, varela.y, "😱 MINI FREDDY GRUDOU!", "#ff3b30", 14);
      }
      return mf.x >= -50;
    }
    mf.x = varela.x + 10;
    mf.y = varela.y + mf.offsetY;
    if (Math.hypot(bola.x - mf.x, bola.y - mf.y) < bola.raio + 20) {
      criarExplosao(mf.x, mf.y, "#ffcc00", 12);
      return false;
    }
    freddiesGrudados++;
    return true;
  });

  if (freddiesGrudados >= 3 && jumpscareTimer <= 0) {
    jumpscareTimer = 1.8;
    miniFreddies = [];
    screenShake = 4;
    tocarBip(90, "sawtooth", 0.8);
    if (acertosFreddles >= 3) tocarFala(somJumpscare);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2 + 70, "😱 JUMP SCARE DO FREDDY!", "#ff0000", 24);
  }

  // Projéteis PROCV
  projeteisProcv = projeteisProcv.filter(p => {
    p.x += p.velX * dt;
    p.y += p.velY * dt;
    if (colideAABB({ x: p.x, y: p.y, w: p.largura, h: p.altura }, boxVarela)) {
      varela.lentoTimer = 4.0;
      screenShake = 2;
      tocarBip(180, "sawtooth", 0.25);
      criarTextoFlutuante(varela.x + 40, varela.y + 20, "⚠️ PROCV! LENTO (4s)", "#34c759", 16);
      criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#34c759", 15);
      return false;
    }
    return p.x >= -100;
  });

  // Gatos Aliados
  for (const g of gatosAliados) {
    g.y += g.velY * g.direcao * dt;
    if (g.y < 80) { g.y = 80; g.direcao = 1; }
    if (g.y + g.altura > canvas.height - 80) { g.y = canvas.height - 80 - g.altura; g.direcao = -1; }

    if (bola.velX < 0 && colideAABB({ x: bola.x - bola.raio, y: bola.y - bola.raio, w: bola.raio * 2, h: bola.raio * 2 }, { x: g.x, y: g.y, w: g.largura, h: g.altura })) {
      bola.x = g.x + g.largura + bola.raio;
      bola.velX = Math.abs(bola.velX) * 1.15;
      screenShake = 2;
      tocarBip(800, "triangle", 0.15);
      criarTextoFlutuante(g.x, g.y - 15, "🐱 GATO DEFENDEU!", "#34c759", 15);
      criarExplosao(g.x + g.largura / 2, g.y + g.altura / 2, "#34c759", 15);
    }
  }

  // Gato Kawaii Ímã
  if (temPowerUp("gato_kawaii") && bola.velX < 0 && bola.x < canvas.width / 2) {
    bola.velY += Math.sign((varela.y + varela.altura / 2) - bola.y) * 120 * dt;
  }

  // Power-up do Mapa
  if (!powerUpMapa.ativo) {
    powerUpMapa.tempoParaSpawn -= dt;
    if (powerUpMapa.tempoParaSpawn <= 0) {
      powerUpMapa.ativo = true;
      powerUpMapa.x = canvas.width / 2 + (Math.random() * 80 - 40);
      powerUpMapa.y = 90 + Math.random() * (canvas.height - 180);
      powerUpMapa.tipo = ["mata", "lenta", "congela"][Math.floor(Math.random() * 3)];
      powerUpMapa.tempoParaSpawn = 15.0;
    }
  } else {
    powerUpMapa.balanco += dt * 4;
    if (Math.hypot(bola.x - powerUpMapa.x, bola.y - powerUpMapa.y) < bola.raio + powerUpMapa.raio) {
      if (powerUpMapa.tipo === "mata") {
        if (bola.velX > 0) {
          varela.mortoTimer = 3.0;
          tocarBip(200, "sawtooth", 0.4);
          criarTextoFlutuante(varela.x + 40, varela.y + 20, "💀 VARELA MORTO POR 3s!", "#ff3b30", 18);
          criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#ff3b30", 25);
        } else {
          boss.mortoTimer = 3.0;
          tocarBip(200, "sawtooth", 0.4);
          criarTextoFlutuante(boss.x - 20, boss.y + 40, "💀 BOSS MORTO POR 3s!", "#ff3b30", 18);
          criarExplosao(boss.x + boss.largura / 2, boss.y + boss.altura / 2, "#ff3b30", 25);
        }
      } else if (powerUpMapa.tipo === "lenta") {
        bola.lentaTimer = 10.0;
        tocarBip(500, "sine", 0.2);
        criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🐌 BOLA LENTA POR 10s!", "#00e5ff", 18);
      } else {
        boss.congeladoTimer = 5.0;
        tocarBip(800, "triangle", 0.3);
        criarTextoFlutuante(boss.x - 20, boss.y + 40, "🧊 BOSS CONGELADO POR 5s!", "#00e5ff", 18);
        criarExplosao(boss.x + boss.largura / 2, boss.y + boss.altura / 2, "#00e5ff", 25);
      }
      powerUpMapa.ativo = false;
      screenShake = 2;
    }
  }

  // Bola
  if (tempoSaque > 0) {
    tempoSaque -= dt;
    return;
  }

  let fatorVelBola = 1.0;
  if (bola.lentaTimer > 0) {
    bola.lentaTimer -= dt;
    fatorVelBola = 0.55;
  }

  bola.rastro.push({ x: bola.x, y: bola.y });
  if (bola.rastro.length > 8) bola.rastro.shift();

  bola.x += bola.velX * fatorVelBola * dt;
  bola.y += bola.velY * fatorVelBola * dt;

  // Quique nas bordas superior/inferior
  if (bola.y - bola.raio <= 0 || bola.y + bola.raio >= canvas.height) {
    bola.y = bola.y - bola.raio <= 0 ? bola.raio : canvas.height - bola.raio;
    bola.velY = -bola.velY;
    tocarBip(320);
    criarExplosao(bola.x, bola.y, "#00fff2", 5);
  }

  // Colisão com Varela
  if (varela.mortoTimer <= 0 && bola.velX < 0 && bola.x - bola.raio <= varela.x + varela.largura && bola.x + bola.raio >= varela.x && bola.y >= varela.y && bola.y <= varela.y + varela.altura) {
    bola.x = varela.x + varela.largura + bola.raio;
    const pontoRel = (bola.y - (varela.y + varela.altura / 2)) / (varela.altura / 2);
    const angulo = pontoRel * (Math.PI / 3);
    let velTotal = Math.hypot(bola.velX, bola.velY) * 1.05;

    if (varela.socoAtivoTimer > 0) {
      velTotal *= 1.6;
      bola.superSoco = true;
      varela.socoAtivoTimer = 0;
      screenShake = 3;
      tocarBip(950, "square", 0.2);
      criarTextoFlutuante(varela.x + 40, bola.y, "🔥 SUPER SOCO!", "#ff3b30", 18);
      criarExplosao(bola.x, bola.y, "#ff3b30", 25);
    } else if (temPowerUp("thug_life") && Math.abs(pontoRel) > 0.65) {
      velTotal *= 1.45;
      bola.thugLifeFogo = true;
      screenShake = 2;
      tocarBip(850, "triangle", 0.18);
      criarTextoFlutuante(varela.x + 40, bola.y, "🕶️ SMASH CRÍTICO!", "#ffd700", 18);
      criarExplosao(bola.x, bola.y, "#ffd700", 20);
    } else {
      bola.superSoco = false;
      bola.thugLifeFogo = false;
      tocarBip(420);
      criarExplosao(bola.x, bola.y, "#00e5ff", 8);
    }

    bola.velX = Math.abs(Math.cos(angulo) * velTotal);
    bola.velY = Math.sin(angulo) * velTotal;
  }

  // Colisão com Boss
  if (boss.mortoTimer <= 0 && bola.velX > 0 && bola.x + bola.raio >= boss.x && bola.x - bola.raio <= boss.x + boss.largura && bola.y >= boss.y && bola.y <= boss.y + boss.altura) {
    bola.x = boss.x - bola.raio;
    const pontoRel = (bola.y - (boss.y + boss.altura / 2)) / (boss.altura / 2);
    const angulo = pontoRel * (Math.PI / 3);
    const velTotal = Math.hypot(bola.velX, bola.velY) * 1.05;

    bola.velX = -Math.abs(Math.cos(angulo) * velTotal);
    bola.velY = Math.sin(angulo) * velTotal;
    bola.superSoco = false;
    bola.thugLifeFogo = false;
    tocarBip(360);
    criarExplosao(bola.x, bola.y, dadosBosses[bossAtualIndex].corTema, 10);
  }

  // Barreiras de Gol
  if (bossAtualIndex === 1 && boss.barreiraGeloTimer > 0 && bola.x + bola.raio >= canvas.width - 18 && bola.velX > 0) {
    bola.x = canvas.width - 18 - bola.raio;
    bola.velX = -Math.abs(bola.velX);
    screenShake = 2;
    tocarBip(600, "triangle", 0.15);
    criarExplosao(canvas.width - 15, bola.y, "#00e5ff", 15);
    criarTextoFlutuante(canvas.width - 80, bola.y, "🧊 BLOQUEADO!", "#00e5ff", 15);
  }

  if (varela.shieldAtivoTimer > 0 && bola.x - bola.raio <= 16 && bola.velX < 0) {
    bola.x = 16 + bola.raio;
    bola.velX = Math.abs(bola.velX);
    screenShake = 2;
    tocarBip(650, "sine", 0.2);
    criarExplosao(16, bola.y, "#af52de", 18);
    criarTextoFlutuante(60, bola.y, "🛡️ DEFENDIDO!", "#af52de", 16);
  }

  // Gols
  if (bola.x + bola.raio >= canvas.width) {
    vidasBoss--;
    boss.flashDano = 0.5;
    screenShake = 3;
    tocarBip(850, "triangle", 0.3);
    const audioGol = tocarAudioGol("varela");
    checarEmpate(audioGol);
    criarExplosao(canvas.width, bola.y, "#00ff88", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "⚽ GOL DO VARELA!", "#00ff88", 28);

    if (vidasBoss <= 0) {
      sortearCartasEscolha();
      estado = "escolhendo";
      sincronizarMusica();
    } else {
      resetarBola(-1);
    }
  } else if (bola.x - bola.raio <= 0) {
    vidasVarela--;
    varela.flashDano = 0.5;
    screenShake = 3;
    tocarBip(140, "sawtooth", 0.45);
    const audioGol = tocarAudioGol("boss");
    if (bossAtualIndex === 1) {
      const golsBoss = MAX_VIDAS_VARELA - vidasVarela;
      if (golsBoss === 1) tocarFala(somFF1);
      else if ((golsBoss === 2 || golsBoss === 3) && golpesConsecutivos < 3) tocarFala(somFF4);
      golpesConsecutivos = 0;
    }
    checarEmpate(audioGol);
    criarExplosao(0, bola.y, "#ff3b30", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "💀 PONTO DO BOSS!", "#ff3b30", 28);

    if (vidasVarela <= 0) { estado = "gameover"; sincronizarMusica(); tocarFala(somPerde); }
    else resetarBola(1);
  }

  // Partículas e Textos
  particulas = particulas.filter(pt => {
    pt.x += pt.velX;
    pt.y += pt.velY;
    pt.vida -= pt.decaimento;
    return pt.vida > 0;
  });

  textosFlutuantes = textosFlutuantes.filter(tf => {
    tf.y -= 1.2;
    tf.vida -= 0.018;
    return tf.vida > 0;
  });

  if (screenShake > 0) screenShake = screenShake < 0.1 ? 0 : screenShake * 0.8;
}


// ========================================================
// 7. RENDERIZAÇÃO E HUD
// ========================================================

function desenhar() {
  if (estadoVisualAnterior !== estado) {
    document.body.classList.toggle("menu-ativo", estado === "menu");
    estadoVisualAnterior = estado;
  }
  ctx.save();

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
  }

  // Fundo Neon
  const gradFundo = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 80, canvas.width / 2, canvas.height / 2, 500);
  gradFundo.addColorStop(0, "#162030");
  gradFundo.addColorStop(1, "#0a0e16");
  ctx.fillStyle = gradFundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(255, 0, 128, 0.25)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 65, 0, Math.PI * 2);
  ctx.stroke();

  // Gatos Aliados
  for (const g of gatosAliados) {
    desenharSprite(imgs.gatoMilitar, g.x, g.y, g.largura, g.altura, "#34c759");
  }

  // Barreiras nos Gols
  if (varela.shieldAtivoTimer > 0) {
    ctx.fillStyle = "rgba(175, 82, 222, 0.4)";
    ctx.fillRect(0, 0, 18, canvas.height);
    ctx.strokeStyle = "#af52de";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 18, canvas.height);
  }
  if (bossAtualIndex === 1 && boss.barreiraGeloTimer > 0) {
    ctx.fillStyle = "rgba(0, 229, 255, 0.45)";
    ctx.fillRect(canvas.width - 20, 0, 20, canvas.height);
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width - 20, 0, 20, canvas.height);
  }

  // Varela
  ctx.save();
  if (varela.mortoTimer > 0) ctx.globalAlpha = 0.28;
  if (varela.flashDano > 0 || varela.lentoTimer > 0 || varela.socoAtivoTimer > 0) {
    ctx.strokeStyle = varela.flashDano > 0 ? "#ff0000" : (varela.socoAtivoTimer > 0 ? "#ff3b30" : "#34c759");
    ctx.lineWidth = varela.socoAtivoTimer > 0 ? 5 : 4;
    if (varela.flashDano > 0 || varela.socoAtivoTimer > 0) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 15;
    }
    ctx.strokeRect(varela.x - 3, varela.y - 3, varela.largura + 6, varela.altura + 6);
    ctx.shadowBlur = 0;
  }
  desenharSprite(imgs.varela, varela.x, varela.y, varela.largura, varela.altura, "#00ffea");

  if (varela.mortoTimer > 0) {
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`💀 ABATIDO (${varela.mortoTimer.toFixed(1)}s)`, varela.x + varela.largura / 2, varela.y - 8);
  } else if (temPowerUp("thug_life")) {
    desenharSprite(imgs.oculos, varela.x + 2, varela.y + 12, 28, 12);
  }
  if (temPowerUp("gato_kawaii")) {
    desenharSprite(imgs.gatoKawaii, varela.x - 24, varela.y + 20, 22, 22);
  }
  ctx.restore();

  // Boss
  const imgBoss = imgs.bosses[bossAtualIndex];
  ctx.save();
  if (boss.flashDano > 0) {
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 4;
    ctx.strokeRect(boss.x - 3, boss.y - 3, boss.largura + 6, boss.altura + 6);
  }
  if (boss.mortoTimer > 0) ctx.globalAlpha = 0.25;
  desenharSprite(imgBoss, boss.x, boss.y, boss.largura, boss.altura, dadosBosses[bossAtualIndex].corTema);
  ctx.globalAlpha = 1.0;

  if (boss.mortoTimer > 0) {
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`💀 MORTO (${boss.mortoTimer.toFixed(1)}s)`, boss.x + boss.largura / 2, boss.y - 8);
  } else if (boss.congeladoTimer > 0) {
    ctx.fillStyle = "rgba(0, 229, 255, 0.55)";
    ctx.fillRect(boss.x - 4, boss.y - 4, boss.largura + 8, boss.altura + 8);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boss.x - 4, boss.y - 4, boss.largura + 8, boss.altura + 8);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🧊 CONGELADO!", boss.x + boss.largura / 2, boss.y - 8);
  }
  ctx.restore();

  // Tiros Free Fire
  ctx.fillStyle = "#ffcc00";
  ctx.shadowColor = "#ff8c00";
  ctx.shadowBlur = 10;
  for (const t of tirosFreeFire) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.raio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Mini Freddies
  for (const mf of miniFreddies) {
    desenharSprite(imgs.bosses[2], mf.x, mf.y, 24, 24, "#8b4513");
  }

  // Projéteis PROCV
  for (const p of projeteisProcv) {
    ctx.fillStyle = "#107c41";
    ctx.fillRect(p.x, p.y, p.largura, p.altura);
    ctx.strokeStyle = "#34c759";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.largura, p.altura);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("=PROCV()", p.x + p.largura / 2, p.y + 15);
  }

  // Power-Up no Mapa
  if (powerUpMapa.ativo) {
    const yOsc = powerUpMapa.y + Math.sin(powerUpMapa.balanco) * 8;
    const estilosPU = {
      mata: ["#ff3b30", "💀 MATA"],
      lenta: ["#00e5ff", "🐌 LENTA"],
      congela: ["#00ffff", "🧊 GELO"]
    };
    const [corPU, textoPU] = estilosPU[powerUpMapa.tipo] || ["#ffcc00", "POWER"];

    ctx.save();
    ctx.shadowColor = corPU;
    ctx.shadowBlur = 15;
    const geloCarregado = powerUpMapa.tipo === "congela" && imgs.gelo.complete && imgs.gelo.naturalWidth > 0;
    if (geloCarregado) {
      ctx.beginPath();
      ctx.arc(powerUpMapa.x, yOsc, powerUpMapa.raio, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(imgs.gelo, powerUpMapa.x - powerUpMapa.raio, yOsc - powerUpMapa.raio, powerUpMapa.raio * 2, powerUpMapa.raio * 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = corPU;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(powerUpMapa.x, yOsc, powerUpMapa.raio - 1, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = corPU;
      ctx.beginPath();
      ctx.arc(powerUpMapa.x, yOsc, powerUpMapa.raio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (!geloCarregado && !(powerUpMapa.tipo === "lenta" && desenharSprite(imgs.caracol, powerUpMapa.x - 16, yOsc - 16, 32, 32))) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(textoPU, powerUpMapa.x, yOsc + 4);
    }
    ctx.restore();
  }

  // Rastro e Bola (percorre do mais antigo ao mais recente)
  const lenRastro = bola.rastro.length;
  for (let i = 0; i < lenRastro; i++) {
    const r = bola.rastro[i];
    const fator = (i + 1) / lenRastro;
    const alpha = fator * 0.4;
    ctx.fillStyle = bola.superSoco ? `rgba(255, 60, 0, ${alpha})` : (bola.thugLifeFogo ? `rgba(255, 215, 0, ${alpha})` : `rgba(0, 240, 255, ${alpha})`);
    ctx.beginPath();
    ctx.arc(r.x, r.y, bola.raio * fator, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.fillStyle = bola.superSoco ? "#ff3b30" : (bola.thugLifeFogo ? "#ffd700" : "#ffffff");
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Partículas e Textos
  for (const pt of particulas) {
    ctx.fillStyle = pt.cor;
    ctx.globalAlpha = Math.max(pt.vida, 0);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.tam, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const tf of textosFlutuantes) {
    ctx.fillStyle = tf.cor;
    ctx.globalAlpha = Math.max(tf.vida, 0);
    ctx.font = `bold ${tf.tam}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(tf.texto, tf.x, tf.y);
  }
  ctx.globalAlpha = 1.0;

  ctx.restore(); // Fim do tremor de câmera; HUD fixa abaixo

  desenharPlacar();
  desenharPainelHabilidades();

  if (jumpscareTimer > 0) {
    ctx.fillStyle = "rgba(180, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    desenharSprite(imgs.choleraFred, canvas.width / 2 - 180, canvas.height / 2 - 180, 360, 360);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("FREDDY JUMPSCARE!", canvas.width / 2, canvas.height / 2 + 180);
  }

  if (estado === "menu") desenharTelaMenu();
  else if (estado === "escolha_inicial") desenharTelaEscolha("ESCOLHA SUA HABILIDADE INICIAL!");
  else if (estado === "escolhendo") desenharTelaEscolha("BOSS DERROTADO! ESCOLHA SEU POWER-UP");
  else if (estado === "gameover") desenharTelaGameOver();
  else if (estado === "vitoria") desenharTelaVitoria();
}

function desenharPlacar() {
  const tamCoracao = 24, espaco = 6, y = 14;

  const desenharVidas = (total, atual, xBase, passo) => {
    for (let i = 0; i < total; i++) {
      const x = xBase + i * passo;
      if (i < atual) desenharSprite(imgs.coracao, x, y, tamCoracao, tamCoracao, "#ff3b30");
      else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(x, y, tamCoracao, tamCoracao);
      }
    }
  };

  desenharVidas(MAX_VIDAS_VARELA, vidasVarela, 30, tamCoracao + espaco);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`VARELA (${vidasVarela} / ${MAX_VIDAS_VARELA})`, 30, y + tamCoracao + 16);
  desenharSprite(imgs.oculos, 128, y + 2, 24, 18);

  desenharVidas(MAX_VIDAS_BOSS, vidasBoss, canvas.width - 30 - (tamCoracao + espaco), -(tamCoracao + espaco));

  const dados = dadosBosses[bossAtualIndex];
  ctx.fillStyle = dados.corTema;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${dados.nome.toUpperCase()} (${vidasBoss} / ${MAX_VIDAS_BOSS})`, canvas.width - 30, y + tamCoracao + 16);
  desenharSprite(imgs.bosses[bossAtualIndex], canvas.width - 30 - 4 * (tamCoracao + espaco) - 24, y + 2, 24, 18);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`BOSS ${bossAtualIndex + 1} / 3`, canvas.width / 2, 28);

  if (bola.lentaTimer > 0) {
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 12px Arial";
    ctx.fillText(`🐌 BOLA LENTA (${bola.lentaTimer.toFixed(1)}s)`, canvas.width / 2, 48);
  }
}

function desenharPainelHabilidades() {
  const y = canvas.height - 24;
  let x = 25;
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "left";

  const habilidadesHUD = [
    { id: "soco_forte", cd: varela.socoCooldown, cor: "#ff3b30", pronto: "[ESPAÇO] SOCO PRONTO", nome: "SOCO" },
    { id: "shield_gol", cd: varela.shieldCooldown, cor: "#af52de", pronto: `${temPowerUp("soco_forte") ? "[E]" : "[ESPAÇO]"} SHIELD PRONTO`, nome: "SHIELD" },
    { id: "varela_dash", cd: varela.dashCooldown, cor: "#ffcc00", pronto: "[W/S 2X] DASH PRONTO", nome: "DASH" }
  ];

  for (const h of habilidadesHUD) {
    if (temPowerUp(h.id)) {
      ctx.fillStyle = h.cd <= 0 ? h.cor : "#666";
      ctx.fillText(h.cd <= 0 ? h.pronto : `${h.nome} (${h.cd.toFixed(1)}s)`, x, y);
      x += 165;
    }
  }

  ctx.font = "bold 13px Arial";
  ctx.textAlign = "right";
  if (varela.desestabilizadoTimer > 0) {
    ctx.fillStyle = "#ff3b30";
    ctx.fillText(`⚠️ CONTROLES INVERTIDOS (${varela.desestabilizadoTimer.toFixed(1)}s)`, canvas.width - 25, y);
  } else if (varela.lentoTimer > 0) {
    ctx.fillStyle = "#34c759";
    ctx.fillText(`⚠️ LENTO PELO PROCV (${varela.lentoTimer.toFixed(1)}s)`, canvas.width - 25, y);
  } else if (miniFreddies.some(m => m.grudado)) {
    const qtd = miniFreddies.filter(m => m.grudado).length;
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(`😱 ${qtd} MINI FREDDIE(S) GRUDADOS! APERTE ESPAÇO!`, canvas.width - 25, y);
  }
}

function desenharTelaMenu() {
  const tempo = performance.now() / 1000;
  const fundo = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  fundo.addColorStop(0, "rgba(8, 13, 24, 0.97)");
  fundo.addColorStop(1, "rgba(19, 10, 28, 0.97)");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const brilho = ctx.createRadialGradient(canvas.width / 2, 185, 15, canvas.width / 2, 185, 260);
  brilho.addColorStop(0, "rgba(0, 229, 255, 0.18)");
  brilho.addColorStop(1, "rgba(0, 229, 255, 0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(120, 0, canvas.width - 240, 430);

  // Cartas decorativas em movimento dão vida ao menu sem competir com o botão.
  [
    { x: 132, y: 306, rot: -0.16, cor: "#00e5ff", nome: "DASH" },
    { x: 728, y: 298, rot: 0.17, cor: "#ff007f", nome: "SMASH" }
  ].forEach((carta, i) => {
    ctx.save();
    ctx.translate(carta.x, carta.y + Math.sin(tempo * 1.6 + i) * 9);
    ctx.rotate(carta.rot);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(20, 29, 45, 0.9)";
    ctx.fillRect(-57, -74, 114, 148);
    ctx.strokeStyle = carta.cor;
    ctx.lineWidth = 2;
    ctx.shadowColor = carta.cor;
    ctx.shadowBlur = 16;
    ctx.strokeRect(-57, -74, 114, 148);
    ctx.shadowBlur = 0;
    ctx.fillStyle = carta.cor;
    ctx.textAlign = "center";
    ctx.font = "bold 12px Arial";
    ctx.fillText(carta.nome, 0, 5);
    ctx.restore();
  });

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 229, 255, 0.55)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px Arial";
  ctx.fillText("VARELONG", canvas.width / 2, 151);
  ctx.shadowBlur = 0;

  const bossesMenu = [
    { texto: "EXCEL", cor: "#34c759" },
    { texto: "FREE FIRE", cor: "#ff8c00" },
    { texto: "FREDDY", cor: "#c28a55" }
  ];
  bossesMenu.forEach((bossMenu, i) => {
    const x = canvas.width / 2 - 150 + i * 150;
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(x - 58, 247, 116, 30);
    ctx.strokeStyle = `${bossMenu.cor}99`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 58, 247, 116, 30);
    ctx.fillStyle = bossMenu.cor;
    ctx.font = "bold 11px Arial";
    ctx.fillText(bossMenu.texto, x, 266);
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "12px Arial";
  ctx.fillText("Clique no fundo para ouvir a OST do menu", canvas.width / 2, 424);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "11px Arial";
  ctx.fillText("W / S ou setas · Mouse · M para som", canvas.width / 2, 457);
}

function desenharTelaEscolha(titulo = "ESCOLHA SEU POWER-UP") {
  ctx.fillStyle = "rgba(8, 12, 18, 0.96)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 28px Arial";
  ctx.fillText(titulo, canvas.width / 2, 55);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "14px Arial";
  ctx.fillText("Clique em uma carta ou aperte 1, 2 ou 3", canvas.width / 2, 85);

  const larguraCarta = 210, alturaCarta = 265, espaco = 25, yBase = 135;
  const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;

  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const carta = cartasParaEscolha[i];
    const x = inicioX + i * (larguraCarta + espaco);
    const hover = mouseX >= x && mouseX <= x + larguraCarta && mouseY >= yBase && mouseY <= yBase + alturaCarta;
    const y = hover ? yBase - 12 : yBase;

    const grad = ctx.createLinearGradient(x, y, x + larguraCarta, y + alturaCarta);
    grad.addColorStop(0, "#1d2535");
    grad.addColorStop(1, "#101622");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, larguraCarta, alturaCarta);

    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = hover ? 4 : 2;
    if (hover) { ctx.shadowColor = carta.corBorda; ctx.shadowBlur = 15; }
    ctx.strokeRect(x, y, larguraCarta, alturaCarta);
    ctx.shadowBlur = 0;

    ctx.fillStyle = carta.corBorda;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`[${i + 1}]`, x + 14, y + 26);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(carta.nome, x + larguraCarta / 2, y + 58);

    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 72);
    ctx.lineTo(x + larguraCarta - 15, y + 72);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "13px Arial";
    desenharTextoQuebrado(carta.descricao, x + larguraCarta / 2, y + 105, larguraCarta - 25, 20);

    ctx.fillStyle = hover ? carta.corBorda : "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(x + 20, y + alturaCarta - 40, larguraCarta - 40, 26);

    ctx.fillStyle = hover ? "#000000" : "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ESCOLHER", x + larguraCarta / 2, y + alturaCarta - 23);
  }
}

function desenharTextoQuebrado(texto, x, y, maxLargura, alturaLinha) {
  let linha = "";
  for (const palavra of texto.split(" ")) {
    const teste = `${linha}${palavra} `;
    if (ctx.measureText(teste).width > maxLargura && linha) {
      ctx.fillText(linha, x, y);
      linha = `${palavra} `;
      y += alturaLinha;
    } else {
      linha = teste;
    }
  }
  ctx.fillText(linha, x, y);
}

function desenharTelaGameOver() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!desenharSprite(imgs.gameOver, canvas.width / 2 - 180, 110, 360, 110)) {
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, 190);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Você foi derrotado por: ${dadosBosses[bossAtualIndex].nome}`, canvas.width / 2, 260);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Pressione ESPAÇO para Tentar Novamente", canvas.width / 2, 330);
}

function desenharTelaVitoria() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 44px Arial";
  ctx.fillText("🏆 VITÓRIA SUPREMA!", canvas.width / 2, 170);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText("O Varela humilhou o Excel, o Free Fire e o Freddy Fazbear!", canvas.width / 2, 230);

  ctx.fillStyle = "#00ffea";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Pressione ESPAÇO para Jogar Novamente", canvas.width / 2, 310);
}


// ========================================================
// 8. LOOP PRINCIPAL
// ========================================================

function loop(tempoAtual) {
  const dt = Math.min((tempoAtual - ultimoTempo) / 1000, 0.1);
  ultimoTempo = tempoAtual;

  atualizar(dt);
  desenhar();

  requestAnimationFrame(loop);
}

requestAnimationFrame((tempo) => {
  ultimoTempo = tempo;
  loop(tempo);
});