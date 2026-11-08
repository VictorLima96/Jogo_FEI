// ========================================================
// VARELA PONG ROGUELIKE - A BATALHA DOS 3 BOSSES
// ========================================================

// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

// Estado do jogo: "menu", "jogando", "escolhendo", "gameover", "vitoria"
let estado = "menu";
let pausado = false;
let screenShake = 0;

// Configuração dos 3 Bosses
const dadosBosses = [
  {
    nome: "Planilha Excel (Fácil)",
    imgSrc: "Images/boss_excel.png",
    velocidade: 210,
    altura: 95,
    corTema: "#107c41",
    hab1: "Dispara =PROCV() a cada 8s (deixa Varela lento por 5s)",
    hab2: "Gera bloco de erro #VALOR! a cada 12s que desvia a bola"
  },
  {
    nome: "Free Fire (Médio)",
    imgSrc: "Images/boss_freefire.png",
    velocidade: 270,
    altura: 90,
    corTema: "#ff8c00",
    hab1: "Taca gelo no gol a cada 10s (barreira dura 3s)",
    hab2: "Dispara tiro laser AWM a cada 11s que incendeia e acelera a bola"
  },
  {
    nome: "Freddy Fazbear (Difícil)",
    imgSrc: "Images/boss_fred.png",
    velocidade: 335,
    altura: 90,
    corTema: "#8b4513",
    hab1: "Rugido a cada 10s: treme a tela e inverte controles por 5s com meme!",
    hab2: "Noite 5 (Blackout) a cada 14s: escurece a arena por 2.5s"
  }
];

let bossAtualIndex = 0; // 0 = Excel, 1 = Free Fire, 2 = Fred

// Vidas: 3 para o Jogador (como pedido!), 5 para o Boss
let vidasVarela = 3;
const MAX_VIDAS_VARELA = 3;
let vidasBoss = 5;
const MAX_VIDAS_BOSS = 5;

// Jogador: Varela (esquerda)
const varela = {
  x: 25,
  y: 215,
  largura: 32,
  alturaPadrao: 95,
  altura: 95,
  velocidadePadrao: 380,
  velocidade: 380,
  lentoTimer: 0,
  desestabilizadoTimer: 0,
  dashCooldown: 0,
  socoCooldown: 0,
  socoAtivoTimer: 0,
  shieldCooldown: 0,
  shieldAtivoTimer: 0
};

// Boss (direita)
const boss = {
  x: 803,
  y: 215,
  largura: 32,
  altura: 95,
  velocidade: 210,
  mortoTimer: 0,
  congeladoTimer: 0,
  barreiraGeloTimer: 0,
  cooldownHab1: 4.0,
  cooldownHab2: 8.0
};

// A Bola
const bola = {
  x: 430,
  y: 260,
  raio: 10,
  velocidadeBase: 320,
  velX: 320,
  velY: 150,
  lentaTimer: 0,
  superSoco: false,
  thugLifeFogo: false,
  rastro: []
};

// Tempo de saque (espera curta antes da bola sair após ponto)
let tempoSaque = 0;

// Elementos de Habilidades dos Bosses
let projeteisProcv = [];
let laserAwm = { ativo: false, y: 0, timer: 0 };
let blocosErroValor = [];
let blackoutTimer = 0;
let choleraMemeTimer = 0;

// Gatos Aliados do Varela (Power-up)
let gatosAliados = [];

// Power-up que spawna no mapa a cada 15 segundos
const powerUpMapa = {
  ativo: false,
  x: 430,
  y: 260,
  raio: 24,
  tipo: "", // "mata", "lenta", "congela"
  tempoParaSpawn: 15.0,
  balanco: 0
};

// Power-ups que o Varela já escolheu
let powerUpsVarela = [];
let cartasParaEscolha = [];

// Partículas e Textos Flutuantes
let particulas = [];
let textosFlutuantes = [];

// Mouse
let mouseX = 0;
let mouseY = 0;
let usarMouseMovimento = false;

// Duplo clique para Dash
let ultimoToqueCima = 0;
let ultimoToqueBaixo = 0;

// Delta time
let ultimoTempo = performance.now();


// ========================================================
// 2. CARREGAR IMAGENS DA PASTA IMAGES
// ========================================================

function carregarImg(caminho) {
  const img = new Image();
  img.src = caminho;
  return img;
}

const imgVarela = carregarImg("Images/player.png");
const imgBossExcel = carregarImg("Images/boss_excel.png");
const imgBossFreeFire = carregarImg("Images/boss_freefire.png");
const imgBossFred = carregarImg("Images/boss_fred.png");
const imgCholeraFred = carregarImg("Images/cholera_fred.png");
const imgGatoMilitar = carregarImg("Images/gato_militar.png");
const imgGatoKawaii = carregarImg("Images/gato_kawaii.png");
const imgCaracol = carregarImg("Images/caracol.png");
const imgOculos = carregarImg("Images/oculos.png");
const imgCoracao = carregarImg("Images/coracao.png");
const imgPowerUpItem = carregarImg("Images/powerup.png");
const imgGameOver = carregarImg("Images/game_over.png");

function getImagemBossAtual() {
  if (bossAtualIndex === 0) return imgBossExcel;
  if (bossAtualIndex === 1) return imgBossFreeFire;
  return imgBossFred;
}


// ========================================================
// 3. ÁUDIO SEQUENCIAL E EFEITOS SONOROS
// ========================================================

function carregarAudio(caminho) {
  const a = new Audio(caminho);
  a.preload = "auto";
  a.volume = 0.85;
  return a;
}

const sonsGolVarela = [
  carregarAudio("Audios/gol1.mp3"),
  carregarAudio("Audios/gol2.mp3"),
  carregarAudio("Audios/gol3.mp3")
];

const sonsGolBoss = [
  carregarAudio("Audios/robogol1.mp3"),
  carregarAudio("Audios/robogol2.mp3"),
  carregarAudio("Audios/robogol3.mp3")
];

const somEmpate = carregarAudio("Audios/empategol.mp3");

let idxGolVarela = 0;
let idxGolBoss = 0;
let somLigado = true;

function pararSonsGols() {
  const todos = sonsGolVarela.concat(sonsGolBoss, [somEmpate]);
  for (let i = 0; i < todos.length; i++) {
    todos[i].pause();
    todos[i].currentTime = 0;
  }
}

function tocarAudioGol(quem) {
  if (!somLigado) return;
  pararSonsGols();

  try {
    if (vidasVarela === vidasBoss) {
      somEmpate.currentTime = 0;
      somEmpate.play().catch(() => {});
    } else if (quem === "varela") {
      const som = sonsGolVarela[idxGolVarela];
      idxGolVarela = (idxGolVarela + 1) % sonsGolVarela.length;
      som.currentTime = 0;
      som.play().catch(() => {});
    } else {
      const som = sonsGolBoss[idxGolBoss];
      idxGolBoss = (idxGolBoss + 1) % sonsGolBoss.length;
      som.currentTime = 0;
      som.play().catch(() => {});
    }
  } catch (e) {}
}

// Sintetizador Web Audio para impactos rápidos
let audioCtx = null;
function liberarAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
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
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch (e) {}
}


// ========================================================
// 4. LISTA DE POWER-UPS DE ESCOLHA (ROGUELIKE)
// ========================================================

const todosPowerUps = [
  {
    id: "varela_rapido",
    nome: "Varela Turbo",
    descricao: "Sua velocidade aumenta permanentemente em +40%.",
    corBorda: "#00ffea",
    aplicar: function() {
      varela.velocidadePadrao *= 1.4;
      varela.velocidade = varela.velocidadePadrao;
    }
  },
  {
    id: "soco_forte",
    nome: "Super Soco [ESPAÇO]",
    descricao: "Aperte ESPAÇO para ativar o soco que manda a bola veloz com fogo (10s recarga).",
    corBorda: "#ff3b30",
    aplicar: function() {}
  },
  {
    id: "inimigo_menor",
    nome: "Inimigo Nanico",
    descricao: "A raquete do Boss encolhe 35%, facilitando furar a defesa.",
    corBorda: "#ff007f",
    aplicar: function() {
      boss.altura *= 0.65;
    }
  },
  {
    id: "varela_dash",
    nome: "Dash Relâmpago",
    descricao: "Toque duas vezes rápido W ou S (ou Setas) para dar um dash veloz!",
    corBorda: "#ffcc00",
    aplicar: function() {}
  },
  {
    id: "shield_gol",
    nome: "Barreira de Escudo [E]",
    descricao: "Aperte E para erguer uma barreira no seu gol por 4s (20s recarga).",
    corBorda: "#af52de",
    aplicar: function() {}
  },
  {
    id: "exercito_gatos",
    nome: "Exército de Gatos 🐱",
    descricao: "Invoca 2 gatos soldados no meio da quadra que rebatem a bola pro Boss!",
    corBorda: "#34c759",
    aplicar: function() {
      criarGatosAliados();
    }
  },
  {
    id: "gato_kawaii",
    nome: "Gato Kawaii Ímã ✨",
    descricao: "Aura hipnótica ao redor do Varela que atrai a bola para a raquete.",
    corBorda: "#ff77a9",
    aplicar: function() {}
  },
  {
    id: "thug_life",
    nome: "Thug Life Crítico 🕶️",
    descricao: "Rebater na ponta da raquete solta um smash crítico supersônico!",
    corBorda: "#ffd700",
    aplicar: function() {}
  }
];

function temPowerUp(id) {
  for (let i = 0; i < powerUpsVarela.length; i++) {
    if (powerUpsVarela[i].id === id) return true;
  }
  return false;
}

function criarGatosAliados() {
  gatosAliados = [
    { x: 260, y: 150, largura: 36, altura: 44, velY: 80, direcao: 1 },
    { x: 260, y: 340, largura: 36, altura: 44, velY: 80, direcao: -1 }
  ];
}

function sortearCartasEscolha() {
  cartasParaEscolha = [];
  let disponiveis = todosPowerUps.filter(p => !temPowerUp(p.id));
  if (disponiveis.length === 0) disponiveis = [...todosPowerUps];

  for (let i = 0; i < 3 && disponiveis.length > 0; i++) {
    const idx = Math.floor(Math.random() * disponiveis.length);
    cartasParaEscolha.push(disponiveis[idx]);
    disponiveis.splice(idx, 1);
  }
}

function escolherPowerUp(idx) {
  if (idx >= 0 && idx < cartasParaEscolha.length) {
    const escolhida = cartasParaEscolha[idx];
    powerUpsVarela.push(escolhida);
    escolhida.aplicar();

    // Avança para o próximo Boss!
    bossAtualIndex++;
    if (bossAtualIndex >= 3) {
      estado = "vitoria";
    } else {
      iniciarBatalhaBoss();
    }
  }
}


// ========================================================
// 5. CONTROLES (TECLADO E MOUSE)
// ========================================================

const teclas = {};

window.addEventListener("keydown", function(e) {
  liberarAudio();
  teclas[e.key] = true;

  if (e.code === "Space") {
    if (estado === "menu" || estado === "gameover" || estado === "vitoria") {
      reiniciarJogoCompleto();
      return;
    }

    if (estado === "jogando") {
      // Super Soco
      if (temPowerUp("soco_forte") && varela.socoCooldown <= 0) {
        varela.socoAtivoTimer = 2.5;
        varela.socoCooldown = 10.0;
        screenShake = 6;
        tocarBip(750, "square", 0.15);
        criarTextoFlutuante(varela.x + 35, varela.y, "🔥 SOCO PRONTO!", "#ff3b30", 18);
      }
      // Shield no Gol (se não tiver soco ou como atalho secundário)
      else if (temPowerUp("shield_gol") && !temPowerUp("soco_forte") && varela.shieldCooldown <= 0) {
        varela.shieldAtivoTimer = 4.0;
        varela.shieldCooldown = 20.0;
        tocarBip(500, "sine", 0.25);
        criarTextoFlutuante(varela.x + 35, varela.y, "🛡️ SHIELD ATIVO!", "#af52de", 18);
      }
    }
  }

  // Tecla E para Shield no Gol
  if ((e.key === "e" || e.key === "E") && estado === "jogando") {
    if (temPowerUp("shield_gol") && varela.shieldCooldown <= 0) {
      varela.shieldAtivoTimer = 4.0;
      varela.shieldCooldown = 20.0;
      tocarBip(500, "sine", 0.25);
      criarTextoFlutuante(varela.x + 35, varela.y, "🛡️ SHIELD ATIVO!", "#af52de", 18);
    }
  }

  // Tecla M para ligar/desligar som
  if (e.key === "m" || e.key === "M") {
    somLigado = !somLigado;
    criarTextoFlutuante(canvas.width / 2, 40, somLigado ? "🔊 SOM LIGADO" : "🔇 SOM MUTADO", "#fff", 16);
  }

  // Tecla P para pausar
  if (e.key === "p" || e.key === "P") {
    if (estado === "jogando") pausado = !pausado;
  }

  // Dash com duplo clique
  if (temPowerUp("varela_dash") && estado === "jogando" && varela.dashCooldown <= 0) {
    const agora = Date.now();
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
      if (agora - ultimoToqueCima < 280) {
        varela.y -= 120;
        if (varela.y < 0) varela.y = 0;
        varela.dashCooldown = 1.8;
        screenShake = 5;
        tocarBip(900, "triangle", 0.12);
        criarTextoFlutuante(varela.x + 35, varela.y, "⚡ DASH!", "#ffcc00", 18);
        criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#ffcc00", 20);
      }
      ultimoToqueCima = agora;
    }
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
      if (agora - ultimoToqueBaixo < 280) {
        varela.y += 120;
        if (varela.y + varela.altura > canvas.height) varela.y = canvas.height - varela.altura;
        varela.dashCooldown = 1.8;
        screenShake = 5;
        tocarBip(900, "triangle", 0.12);
        criarTextoFlutuante(varela.x + 35, varela.y, "⚡ DASH!", "#ffcc00", 18);
        criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#ffcc00", 20);
      }
      ultimoToqueBaixo = agora;
    }
  }

  // Escolha de cartas 1, 2, 3
  if (estado === "escolhendo") {
    if (e.key === "1") escolherPowerUp(0);
    if (e.key === "2") escolherPowerUp(1);
    if (e.key === "3") escolherPowerUp(2);
  }
});

window.addEventListener("keyup", function(e) {
  teclas[e.key] = false;
});

canvas.addEventListener("mousemove", function(e) {
  const ret = canvas.getBoundingClientRect();
  mouseX = e.clientX - ret.left;
  mouseY = e.clientY - ret.top;

  // Se o jogador mover o mouse na metade esquerda, move o Varela suavemente
  if (estado === "jogando" && !pausado && mouseX < canvas.width / 2) {
    usarMouseMovimento = true;
    varela.y = mouseY - varela.altura / 2;
    if (varela.y < 0) varela.y = 0;
    if (varela.y + varela.altura > canvas.height) varela.y = canvas.height - varela.altura;
  }
});

canvas.addEventListener("click", function() {
  liberarAudio();
  if (estado === "escolhendo") {
    const larguraCarta = 210;
    const alturaCarta = 260;
    const espaco = 25;
    const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;
    const yBase = 140;

    for (let i = 0; i < cartasParaEscolha.length; i++) {
      const x = inicioX + i * (larguraCarta + espaco);
      if (
        mouseX >= x &&
        mouseX <= x + larguraCarta &&
        mouseY >= yBase &&
        mouseY <= yBase + alturaCarta
      ) {
        escolherPowerUp(i);
        break;
      }
    }
  }
});


// ========================================================
// 6. FUNÇÕES DE ATUALIZAR (LÓGICA E FÍSICA)
// ========================================================

function reiniciarJogoCompleto() {
  bossAtualIndex = 0;
  powerUpsVarela = [];
  varela.velocidadePadrao = 380;
  varela.velocidade = 380;
  varela.altura = varela.alturaPadrao;
  gatosAliados = [];
  iniciarBatalhaBoss();
}

function iniciarBatalhaBoss() {
  vidasVarela = MAX_VIDAS_VARELA; // 3 vidas para o jogador
  vidasBoss = MAX_VIDAS_BOSS;     // 5 vidas para o boss
  pausado = false;

  const dados = dadosBosses[bossAtualIndex];
  boss.velocidade = dados.velocidade;
  boss.altura = temPowerUp("inimigo_menor") ? dados.altura * 0.65 : dados.altura;
  boss.mortoTimer = 0;
  boss.congeladoTimer = 0;
  boss.barreiraGeloTimer = 0;
  boss.cooldownHab1 = 4.0;
  boss.cooldownHab2 = 8.0;

  projeteisProcv = [];
  blocosErroValor = [];
  laserAwm.ativo = false;
  blackoutTimer = 0;
  choleraMemeTimer = 0;

  powerUpMapa.ativo = false;
  powerUpMapa.tempoParaSpawn = 15.0;

  varela.lentoTimer = 0;
  varela.desestabilizadoTimer = 0;
  varela.socoCooldown = 0;
  varela.socoAtivoTimer = 0;
  varela.shieldCooldown = 0;
  varela.shieldAtivoTimer = 0;
  varela.dashCooldown = 0;

  resetarBola(1);
  estado = "jogando";
}

function resetarBola(direcao = 1) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  bola.superSoco = false;
  bola.thugLifeFogo = false;
  bola.rastro = [];
  tempoSaque = 0.7; // pausa de 0.7s antes de soltar a bola

  const vel = bola.velocidadeBase;
  bola.velX = vel * direcao;
  bola.velY = (Math.random() * 160 - 80) || 50;
}

function criarTextoFlutuante(x, y, texto, cor = "#ffd700", tam = 16) {
  textosFlutuantes.push({ x, y, texto, cor, tam, vida: 1.0 });
}

function criarExplosao(x, y, cor, qtd = 14) {
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const vel = 2 + Math.random() * 5;
    particulas.push({
      x: x,
      y: y,
      velX: Math.cos(ang) * vel,
      velY: Math.sin(ang) * vel,
      vida: 1.0,
      decaimento: 0.025 + Math.random() * 0.02,
      cor: cor,
      tam: 3 + Math.random() * 3
    });
  }
}

function atualizar(dt) {
  if (estado !== "jogando" || pausado) return;

  // 1. Timers do Varela
  if (varela.socoCooldown > 0) varela.socoCooldown -= dt;
  if (varela.socoAtivoTimer > 0) varela.socoAtivoTimer -= dt;
  if (varela.shieldCooldown > 0) varela.shieldCooldown -= dt;
  if (varela.shieldAtivoTimer > 0) varela.shieldAtivoTimer -= dt;
  if (varela.dashCooldown > 0) varela.dashCooldown -= dt;

  if (varela.lentoTimer > 0) {
    varela.lentoTimer -= dt;
    varela.velocidade = varela.velocidadePadrao * 0.45;
  } else {
    varela.velocidade = varela.velocidadePadrao;
  }

  let dirMov = 1;
  if (varela.desestabilizadoTimer > 0) {
    varela.desestabilizadoTimer -= dt;
    dirMov = -1; // Controles invertidos!
  }

  // 2. Movimento Teclado
  if (teclas["w"] || teclas["W"] || teclas["ArrowUp"]) {
    varela.y -= varela.velocidade * dirMov * dt;
    usarMouseMovimento = false;
  }
  if (teclas["s"] || teclas["S"] || teclas["ArrowDown"]) {
    varela.y += varela.velocidade * dirMov * dt;
    usarMouseMovimento = false;
  }

  if (varela.desestabilizadoTimer > 0) {
    varela.y += (Math.random() - 0.5) * 8; // tremor de confusão
  }

  if (varela.y < 0) varela.y = 0;
  if (varela.y + varela.altura > canvas.height) varela.y = canvas.height - varela.altura;

  // 3. IA do Boss
  if (boss.mortoTimer > 0) {
    boss.mortoTimer -= dt;
  } else if (boss.congeladoTimer > 0) {
    boss.congeladoTimer -= dt;
  } else {
    const centroBoss = boss.y + boss.altura / 2;
    const diff = bola.y - centroBoss;
    if (diff > 14) boss.y += boss.velocidade * dt;
    else if (diff < -14) boss.y -= boss.velocidade * dt;

    if (boss.y < 0) boss.y = 0;
    if (boss.y + boss.altura > canvas.height) boss.y = canvas.height - boss.altura;
  }

  // 4. HABILIDADES PASSIVAS DOS BOSSES
  boss.cooldownHab1 -= dt;
  boss.cooldownHab2 -= dt;

  // Timers especiais
  if (boss.barreiraGeloTimer > 0) boss.barreiraGeloTimer -= dt;
  if (blackoutTimer > 0) blackoutTimer -= dt;
  if (choleraMemeTimer > 0) choleraMemeTimer -= dt;

  if (boss.mortoTimer <= 0 && boss.congeladoTimer <= 0) {
    // BOSS 1: EXCEL
    if (bossAtualIndex === 0) {
      // Hab 1: PROCV (a cada 8s)
      if (boss.cooldownHab1 <= 0) {
        projeteisProcv.push({
          x: boss.x - 15,
          y: boss.y + boss.altura / 2,
          velX: -270,
          velY: (varela.y + varela.altura / 2 - (boss.y + boss.altura / 2)) * 0.7,
          largura: 65,
          altura: 22
        });
        boss.cooldownHab1 = 8.0;
        tocarBip(300, "sawtooth", 0.15);
        criarTextoFlutuante(boss.x - 20, boss.y, "=PROCV() DISPARADO!", "#34c759", 15);
      }
      // Hab 2: Bloco Erro #VALOR! (a cada 12s)
      if (boss.cooldownHab2 <= 0) {
        blocosErroValor.push({
          x: 400 + (Math.random() * 120 - 60),
          y: 80 + Math.random() * (canvas.height - 160),
          largura: 70,
          altura: 28,
          timer: 8.0
        });
        boss.cooldownHab2 = 12.0;
        criarTextoFlutuante(canvas.width / 2, 100, "⚠️ ERRO #VALOR! NA QUADRA!", "#ff3b30", 15);
      }
    }
    // BOSS 2: FREE FIRE
    else if (bossAtualIndex === 1) {
      // Hab 1: Gelo no Gol (a cada 10s por 3s)
      if (boss.cooldownHab1 <= 0) {
        boss.barreiraGeloTimer = 3.0;
        boss.cooldownHab1 = 10.0;
        screenShake = 6;
        tocarBip(650, "triangle", 0.25);
        criarTextoFlutuante(boss.x - 20, boss.y, "🧊 GELO NO GOL!", "#00e5ff", 17);
      }
      // Hab 2: Laser AWM (a cada 11s)
      if (boss.cooldownHab2 <= 0) {
        laserAwm.ativo = true;
        laserAwm.y = boss.y + boss.altura / 2;
        laserAwm.timer = 1.2;
        boss.cooldownHab2 = 11.0;
        screenShake = 10;
        tocarBip(1100, "sawtooth", 0.3);
        criarTextoFlutuante(boss.x - 50, boss.y, "🎯 TIRO DE AWM!", "#ff8c00", 16);
      }
    }
    // BOSS 3: FREDDY FAZBEAR
    else if (bossAtualIndex === 2) {
      // Hab 1: Rugido Aterrador (a cada 10s por 5s)
      if (boss.cooldownHab1 <= 0) {
        varela.desestabilizadoTimer = 5.0;
        choleraMemeTimer = 1.5; // Rosto do meme piscando
        boss.cooldownHab1 = 10.0;
        screenShake = 18;
        tocarBip(110, "sawtooth", 0.7);
        criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🐻 HAR HAR HAR! CONTROLES INVERTIDOS!", "#ff3b30", 22);
      }
      // Hab 2: Noite 5 (Blackout - a cada 14s por 2.5s)
      if (boss.cooldownHab2 <= 0) {
        blackoutTimer = 2.5;
        boss.cooldownHab2 = 14.0;
        screenShake = 8;
        tocarBip(220, "sine", 0.4);
        criarTextoFlutuante(canvas.width / 2, 70, "⚡ LUZ APAGADA! (BLACKOUT)", "#ffcc00", 18);
      }
    }
  }

  // Laser AWM timer
  if (laserAwm.ativo) {
    laserAwm.timer -= dt;
    if (laserAwm.timer <= 0) laserAwm.ativo = false;
    // Se a bola cruzar a linha do laser, ganha ultra aceleração
    if (Math.abs(bola.y - laserAwm.y) < 20 && bola.velX > 0) {
      bola.velX *= 1.35;
      bola.superSoco = true;
      criarExplosao(bola.x, bola.y, "#ff8c00", 20);
    }
  }

  // Atualizar blocos de Erro #VALOR!
  for (let i = blocosErroValor.length - 1; i >= 0; i--) {
    const b = blocosErroValor[i];
    b.timer -= dt;
    if (b.timer <= 0) {
      blocosErroValor.splice(i, 1);
      continue;
    }
    // Colisão com a bola
    if (
      bola.x + bola.raio >= b.x &&
      bola.x - bola.raio <= b.x + b.largura &&
      bola.y + bola.raio >= b.y &&
      bola.y - bola.raio <= b.y + b.altura
    ) {
      bola.velX = -bola.velX * 1.1;
      bola.velY = (Math.random() - 0.5) * 300;
      screenShake = 8;
      tocarBip(450, "square", 0.15);
      criarExplosao(bola.x, bola.y, "#ff3b30", 15);
      criarTextoFlutuante(b.x, b.y - 15, "💥 #VALOR!", "#ff3b30", 16);
    }
  }

  // Atualizar Projéteis PROCV (Excel)
  for (let i = projeteisProcv.length - 1; i >= 0; i--) {
    const p = projeteisProcv[i];
    p.x += p.velX * dt;
    p.y += p.velY * dt;

    if (
      p.x <= varela.x + varela.largura &&
      p.x + p.largura >= varela.x &&
      p.y + p.altura >= varela.y &&
      p.y <= varela.y + varela.altura
    ) {
      varela.lentoTimer = 5.0;
      projeteisProcv.splice(i, 1);
      screenShake = 8;
      tocarBip(180, "sawtooth", 0.3);
      criarTextoFlutuante(varela.x + 40, varela.y + 20, "⚠️ PROCV ACERTOU! LENTO (5s)", "#34c759", 16);
      criarExplosao(varela.x + varela.largura / 2, varela.y + varela.altura / 2, "#34c759", 20);
      continue;
    }
    if (p.x < -100) projeteisProcv.splice(i, 1);
  }

  // 5. Gatos Aliados do Varela
  for (let i = 0; i < gatosAliados.length; i++) {
    const g = gatosAliados[i];
    g.y += g.velY * g.direcao * dt;
    if (g.y < 80) { g.y = 80; g.direcao = 1; }
    if (g.y + g.altura > canvas.height - 80) { g.y = canvas.height - 80 - g.altura; g.direcao = -1; }

    // Colisão do gato com a bola (rebate pro boss!)
    if (
      bola.x + bola.raio >= g.x &&
      bola.x - bola.raio <= g.x + g.largura &&
      bola.y + bola.raio >= g.y &&
      bola.y - bola.raio <= g.y + g.altura &&
      bola.velX < 0
    ) {
      bola.x = g.x + g.largura + bola.raio;
      bola.velX = Math.abs(bola.velX) * 1.15;
      screenShake = 6;
      tocarBip(800, "triangle", 0.15);
      criarTextoFlutuante(g.x, g.y - 15, "🐱 GATO DEFENDEU!", "#34c759", 15);
      criarExplosao(g.x + g.largura / 2, g.y + g.altura / 2, "#34c759", 15);
    }
  }

  // 6. Gato Kawaii Ímã (puxa suavemente a bola para a raquete do Varela)
  if (temPowerUp("gato_kawaii") && bola.velX < 0 && bola.x < canvas.width / 2) {
    const centroVarela = varela.y + varela.altura / 2;
    if (bola.y < centroVarela) bola.velY += 120 * dt;
    else bola.velY -= 120 * dt;
  }

  // 7. Power-up do Mapa (a cada 15s)
  if (!powerUpMapa.ativo) {
    powerUpMapa.tempoParaSpawn -= dt;
    if (powerUpMapa.tempoParaSpawn <= 0) {
      powerUpMapa.ativo = true;
      powerUpMapa.x = canvas.width / 2 + (Math.random() * 80 - 40);
      powerUpMapa.y = 90 + Math.random() * (canvas.height - 180);
      const tipos = ["mata", "lenta", "congela"];
      powerUpMapa.tipo = tipos[Math.floor(Math.random() * tipos.length)];
      powerUpMapa.tempoParaSpawn = 15.0;
    }
  } else {
    powerUpMapa.balanco += dt * 4;
    const dist = Math.hypot(bola.x - powerUpMapa.x, bola.y - powerUpMapa.y);
    if (dist < bola.raio + powerUpMapa.raio) {
      if (powerUpMapa.tipo === "mata") {
        boss.mortoTimer = 5.0;
        tocarBip(200, "sawtooth", 0.4);
        criarTextoFlutuante(boss.x - 20, boss.y + 40, "💀 BOSS MORTO POR 5s!", "#ff3b30", 18);
        criarExplosao(boss.x + boss.largura / 2, boss.y + boss.altura / 2, "#ff3b30", 25);
      } else if (powerUpMapa.tipo === "lenta") {
        bola.lentaTimer = 10.0;
        tocarBip(500, "sine", 0.2);
        criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "🐌 BOLA LENTA POR 10s!", "#00e5ff", 18);
      } else if (powerUpMapa.tipo === "congela") {
        boss.congeladoTimer = 5.0;
        tocarBip(800, "triangle", 0.3);
        criarTextoFlutuante(boss.x - 20, boss.y + 40, "🧊 BOSS CONGELADO POR 5s!", "#00e5ff", 18);
        criarExplosao(boss.x + boss.largura / 2, boss.y + boss.altura / 2, "#00e5ff", 25);
      }
      powerUpMapa.ativo = false;
      screenShake = 8;
    }
  }

  // 8. Movimentação da Bola
  if (tempoSaque > 0) {
    tempoSaque -= dt;
    return; // Espera terminar o saque
  }

  let fatorVelBola = 1.0;
  if (bola.lentaTimer > 0) {
    bola.lentaTimer -= dt;
    fatorVelBola = 0.55;
  }

  bola.rastro.unshift({ x: bola.x, y: bola.y });
  if (bola.rastro.length > 8) bola.rastro.pop();

  bola.x += bola.velX * fatorVelBola * dt;
  bola.y += bola.velY * fatorVelBola * dt;

  // Quique nas paredes superior e inferior
  if (bola.y - bola.raio <= 0) {
    bola.y = bola.raio;
    bola.velY = Math.abs(bola.velY);
    tocarBip(320);
    criarExplosao(bola.x, bola.y, "#00fff2", 5);
  }
  if (bola.y + bola.raio >= canvas.height) {
    bola.y = canvas.height - bola.raio;
    bola.velY = -Math.abs(bola.velY);
    tocarBip(320);
    criarExplosao(bola.x, bola.y, "#00fff2", 5);
  }

  // 9. Colisão com Varela
  if (
    bola.x - bola.raio <= varela.x + varela.largura &&
    bola.x + bola.raio >= varela.x &&
    bola.y >= varela.y &&
    bola.y <= varela.y + varela.altura &&
    bola.velX < 0
  ) {
    bola.x = varela.x + varela.largura + bola.raio;
    const pontoRel = (bola.y - (varela.y + varela.altura / 2)) / (varela.altura / 2);
    const angulo = pontoRel * (Math.PI / 3);
    let velTotal = Math.hypot(bola.velX, bola.velY) * 1.05;

    // Super Soco
    if (varela.socoAtivoTimer > 0) {
      velTotal *= 1.6;
      bola.superSoco = true;
      varela.socoAtivoTimer = 0;
      screenShake = 12;
      tocarBip(950, "square", 0.2);
      criarTextoFlutuante(varela.x + 40, bola.y, "🔥 SUPER SOCO!", "#ff3b30", 18);
      criarExplosao(bola.x, bola.y, "#ff3b30", 25);
    }
    // Thug Life Crítico (se bater na ponta extrema)
    else if (temPowerUp("thug_life") && Math.abs(pontoRel) > 0.65) {
      velTotal *= 1.45;
      bola.thugLifeFogo = true;
      screenShake = 8;
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

  // 10. Colisão com Boss (se vivo)
  if (boss.mortoTimer <= 0) {
    if (
      bola.x + bola.raio >= boss.x &&
      bola.x - bola.raio <= boss.x + boss.largura &&
      bola.y >= boss.y &&
      bola.y <= boss.y + boss.altura &&
      bola.velX > 0
    ) {
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
  }

  // 11. Barreira de Gelo (Free Fire)
  if (bossAtualIndex === 1 && boss.barreiraGeloTimer > 0) {
    if (bola.x + bola.raio >= canvas.width - 18 && bola.velX > 0) {
      bola.x = canvas.width - 18 - bola.raio;
      bola.velX = -Math.abs(bola.velX);
      screenShake = 7;
      tocarBip(600, "triangle", 0.15);
      criarExplosao(canvas.width - 15, bola.y, "#00e5ff", 15);
      criarTextoFlutuante(canvas.width - 80, bola.y, "🧊 BLOQUEADO!", "#00e5ff", 15);
    }
  }

  // 12. Shield no Gol do Varela
  if (varela.shieldAtivoTimer > 0) {
    if (bola.x - bola.raio <= 16 && bola.velX < 0) {
      bola.x = 16 + bola.raio;
      bola.velX = Math.abs(bola.velX);
      screenShake = 8;
      tocarBip(650, "sine", 0.2);
      criarExplosao(16, bola.y, "#af52de", 18);
      criarTextoFlutuante(60, bola.y, "🛡️ DEFENDIDO!", "#af52de", 16);
    }
  }

  // 13. Gols e Vidas
  // Gol no Boss (Direita)
  if (bola.x + bola.raio >= canvas.width) {
    vidasBoss -= 1;
    screenShake = 14;
    tocarBip(850, "triangle", 0.3);
    tocarAudioGol("varela");
    criarExplosao(canvas.width, bola.y, "#00ff88", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "⚽ GOL DO VARELA!", "#00ff88", 28);

    if (vidasBoss <= 0) {
      sortearCartasEscolha();
      estado = "escolhendo";
    } else {
      resetarBola(-1);
    }
  }

  // Gol no Varela (Esquerda)
  if (bola.x - bola.raio <= 0) {
    vidasVarela -= 1; // Perde 1 das 3 vidas!
    screenShake = 16;
    tocarBip(140, "sawtooth", 0.45);
    tocarAudioGol("boss");
    criarExplosao(0, bola.y, "#ff3b30", 40);
    criarTextoFlutuante(canvas.width / 2, canvas.height / 2, "💀 PONTO DO BOSS!", "#ff3b30", 28);

    if (vidasVarela <= 0) {
      estado = "gameover";
    } else {
      resetarBola(1);
    }
  }

  // Atualizar Partículas e Textos Flutuantes
  for (let i = particulas.length - 1; i >= 0; i--) {
    const pt = particulas[i];
    pt.x += pt.velX;
    pt.y += pt.velY;
    pt.vida -= pt.decaimento;
    if (pt.vida <= 0) particulas.splice(i, 1);
  }

  for (let i = textosFlutuantes.length - 1; i >= 0; i--) {
    const tf = textosFlutuantes[i];
    tf.y -= 1.2;
    tf.vida -= 0.018;
    if (tf.vida <= 0) textosFlutuantes.splice(i, 1);
  }

  // Suavizar screen shake
  if (screenShake > 0) screenShake *= 0.88;
  if (screenShake < 0.2) screenShake = 0;
}


// ========================================================
// 7. FUNÇÕES DE DESENHAR (MUITO MAIS COR E EFEITOS)
// ========================================================

function desenhar() {
  ctx.save();

  // Screen shake
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake * 2;
    const shakeY = (Math.random() - 0.5) * screenShake * 2;
    ctx.translate(shakeX, shakeY);
  }

  // Fundo Colorido com Gradiente Neon
  const gradFundo = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 80, canvas.width / 2, canvas.height / 2, 500);
  gradFundo.addColorStop(0, "#162030");
  gradFundo.addColorStop(1, "#0a0e16");
  ctx.fillStyle = gradFundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Efeito Blackout da Noite 5 do Freddy (se ativo)
  if (blackoutTimer > 0) {
    ctx.fillStyle = "rgba(2, 4, 8, 0.94)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Olhos brilhantes do Freddy no escuro
    ctx.fillStyle = "#ff0044";
    ctx.shadowColor = "#ff0044";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(boss.x + 8, boss.y + 25, 4, 0, Math.PI * 2);
    ctx.arc(boss.x + 24, boss.y + 25, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Linhas da Mesa Estilo Neon
  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Círculo central neon
  ctx.strokeStyle = "rgba(255, 0, 128, 0.25)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 65, 0, Math.PI * 2);
  ctx.stroke();

  // Desenhar Gatos Aliados do Varela
  for (let i = 0; i < gatosAliados.length; i++) {
    const g = gatosAliados[i];
    if (imgGatoMilitar.complete && imgGatoMilitar.naturalWidth > 0) {
      ctx.drawImage(imgGatoMilitar, g.x, g.y, g.largura, g.altura);
    } else {
      ctx.fillStyle = "#34c759";
      ctx.fillRect(g.x, g.y, g.largura, g.altura);
    }
    ctx.fillStyle = "#34c759";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SOLDADO", g.x + g.largura / 2, g.y - 4);
  }

  // Desenhar Laser da AWM (Free Fire)
  if (laserAwm.ativo) {
    ctx.strokeStyle = "rgba(255, 60, 0, 0.8)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff3b30";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, laserAwm.y);
    ctx.lineTo(canvas.width, laserAwm.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Desenhar Blocos Erro #VALOR! (Excel)
  for (let i = 0; i < blocosErroValor.length; i++) {
    const b = blocosErroValor[i];
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(b.x, b.y, b.largura, b.altura);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.largura, b.altura);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("#VALOR!", b.x + b.largura / 2, b.y + 18);
  }

  // Desenhar Shield no Gol do Varela
  if (varela.shieldAtivoTimer > 0) {
    ctx.fillStyle = "rgba(175, 82, 222, 0.4)";
    ctx.fillRect(0, 0, 18, canvas.height);
    ctx.strokeStyle = "#af52de";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 18, canvas.height);
  }

  // Desenhar Barreira de Gelo no Gol do Free Fire
  if (bossAtualIndex === 1 && boss.barreiraGeloTimer > 0) {
    ctx.fillStyle = "rgba(0, 229, 255, 0.45)";
    ctx.fillRect(canvas.width - 20, 0, 20, canvas.height);
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width - 20, 0, 20, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.save();
    ctx.translate(canvas.width - 6, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("GELO ATIVO (" + boss.barreiraGeloTimer.toFixed(1) + "s)", 0, 0);
    ctx.restore();
  }

  // Desenhar Varela
  ctx.save();
  if (varela.lentoTimer > 0) {
    ctx.strokeStyle = "#34c759";
    ctx.lineWidth = 4;
    ctx.strokeRect(varela.x - 3, varela.y - 3, varela.largura + 6, varela.altura + 6);
  }
  if (varela.socoAtivoTimer > 0) {
    ctx.strokeStyle = "#ff3b30";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff3b30";
    ctx.shadowBlur = 15;
    ctx.strokeRect(varela.x - 4, varela.y - 4, varela.largura + 8, varela.altura + 8);
    ctx.shadowBlur = 0;
  }
  if (imgVarela.complete && imgVarela.naturalWidth > 0) {
    ctx.drawImage(imgVarela, varela.x, varela.y, varela.largura, varela.altura);
  } else {
    ctx.fillStyle = "#00ffea";
    ctx.fillRect(varela.x, varela.y, varela.largura, varela.altura);
  }

  // Desenhar Óculos Thug Life no Varela se tiver o poder
  if (temPowerUp("thug_life") && imgOculos.complete && imgOculos.naturalWidth > 0) {
    ctx.drawImage(imgOculos, varela.x + 2, varela.y + 12, 28, 12);
  }
  // Desenhar Gato Kawaii flutuando ao lado do Varela se tiver o poder
  if (temPowerUp("gato_kawaii") && imgGatoKawaii.complete && imgGatoKawaii.naturalWidth > 0) {
    ctx.drawImage(imgGatoKawaii, varela.x - 24, varela.y + 20, 22, 22);
  }
  ctx.restore();

  // Desenhar Boss Atual
  const imgBoss = getImagemBossAtual();
  ctx.save();
  if (boss.mortoTimer > 0) {
    ctx.globalAlpha = 0.25;
    if (imgBoss.complete && imgBoss.naturalWidth > 0) {
      ctx.drawImage(imgBoss, boss.x, boss.y, boss.largura, boss.altura);
    }
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀 MORTO (" + boss.mortoTimer.toFixed(1) + "s)", boss.x + boss.largura / 2, boss.y - 8);
  } else if (boss.congeladoTimer > 0) {
    if (imgBoss.complete && imgBoss.naturalWidth > 0) {
      ctx.drawImage(imgBoss, boss.x, boss.y, boss.largura, boss.altura);
    }
    ctx.fillStyle = "rgba(0, 229, 255, 0.55)";
    ctx.fillRect(boss.x - 4, boss.y - 4, boss.largura + 8, boss.altura + 8);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boss.x - 4, boss.y - 4, boss.largura + 8, boss.altura + 8);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🧊 CONGELADO!", boss.x + boss.largura / 2, boss.y - 8);
  } else {
    if (imgBoss.complete && imgBoss.naturalWidth > 0) {
      ctx.drawImage(imgBoss, boss.x, boss.y, boss.largura, boss.altura);
    } else {
      ctx.fillStyle = dadosBosses[bossAtualIndex].corTema;
      ctx.fillRect(boss.x, boss.y, boss.largura, boss.altura);
    }
  }
  ctx.restore();

  // Meme do Cholera Freddy piscando na tela quando ruge
  if (choleraMemeTimer > 0 && imgCholeraFred.complete && imgCholeraFred.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.drawImage(imgCholeraFred, canvas.width / 2 - 110, canvas.height / 2 - 110, 220, 220);
    ctx.restore();
  }

  // Desenhar Projéteis PROCV (Excel)
  for (let i = 0; i < projeteisProcv.length; i++) {
    const p = projeteisProcv[i];
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

  // Desenhar Power-Up no Mapa
  if (powerUpMapa.ativo) {
    const yOsc = powerUpMapa.y + Math.sin(powerUpMapa.balanco) * 8;
    ctx.save();

    let corPU = "#ffcc00";
    let textoPU = "POWER";
    if (powerUpMapa.tipo === "mata") {
      corPU = "#ff3b30";
      textoPU = "💀 MATA";
    } else if (powerUpMapa.tipo === "lenta") {
      corPU = "#00e5ff";
      textoPU = "🐌 LENTA";
    } else if (powerUpMapa.tipo === "congela") {
      corPU = "#00ffff";
      textoPU = "🧊 GELO";
    }

    ctx.fillStyle = corPU;
    ctx.shadowColor = corPU;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(powerUpMapa.x, yOsc, powerUpMapa.raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Se for bola lenta, desenha o caracol dentro do círculo!
    if (powerUpMapa.tipo === "lenta" && imgCaracol.complete && imgCaracol.naturalWidth > 0) {
      ctx.drawImage(imgCaracol, powerUpMapa.x - 16, yOsc - 16, 32, 32);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(textoPU, powerUpMapa.x, yOsc + 4);
    }
    ctx.restore();
  }

  // Desenhar Rastro da Bola (Vibrante / Fogo se tiver super soco ou thug life)
  for (let i = 0; i < bola.rastro.length; i++) {
    const r = bola.rastro[i];
    const alpha = (1 - i / bola.rastro.length) * 0.4;
    if (bola.superSoco) ctx.fillStyle = `rgba(255, 60, 0, ${alpha})`;
    else if (bola.thugLifeFogo) ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    else ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;

    ctx.beginPath();
    ctx.arc(r.x, r.y, bola.raio * (1 - i / bola.rastro.length), 0, Math.PI * 2);
    ctx.fill();
  }

  // Desenhar Bola
  ctx.save();
  ctx.fillStyle = bola.superSoco ? "#ff3b30" : (bola.thugLifeFogo ? "#ffd700" : "#ffffff");
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Desenhar Partículas
  for (let i = 0; i < particulas.length; i++) {
    const pt = particulas[i];
    ctx.fillStyle = pt.cor;
    ctx.globalAlpha = Math.max(pt.vida, 0);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.tam, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Desenhar Textos Flutuantes
  for (let i = 0; i < textosFlutuantes.length; i++) {
    const tf = textosFlutuantes[i];
    ctx.fillStyle = tf.cor;
    ctx.globalAlpha = Math.max(tf.vida, 0);
    ctx.font = `bold ${tf.tam}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(tf.texto, tf.x, tf.y);
  }
  ctx.globalAlpha = 1.0;

  // Desenhar Placar com 3 Vidas para o Jogador e 5 para o Boss
  desenharPlacar();

  // Desenhar Painel de Habilidades e Cooldowns
  desenharPainelHabilidades();

  // Telas especiais
  if (estado === "menu") desenharTelaMenu();
  else if (estado === "escolhendo") desenharTelaEscolha();
  else if (estado === "gameover") desenharTelaGameOver();
  else if (estado === "vitoria") desenharTelaVitoria();

  ctx.restore();
}

// Placar: 3 Vidas para o Jogador (como solicitado!), 5 Vidas para o Boss
function desenharPlacar() {
  const tamCoracao = 24;
  const espaco = 6;
  const y = 14;

  // 3 Corações do Varela (Esquerda)
  for (let i = 0; i < MAX_VIDAS_VARELA; i++) {
    const x = 30 + i * (tamCoracao + espaco);
    if (i < vidasVarela) {
      if (imgCoracao.complete && imgCoracao.naturalWidth > 0) {
        ctx.drawImage(imgCoracao, x, y, tamCoracao, tamCoracao);
      } else {
        ctx.fillStyle = "#ff3b30";
        ctx.fillRect(x, y, tamCoracao, tamCoracao);
      }
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(x, y, tamCoracao, tamCoracao);
    }
  }

  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("VARELA (" + vidasVarela + " / " + MAX_VIDAS_VARELA + ")", 30, y + tamCoracao + 16);

  // 5 Corações do Boss (Direita)
  for (let i = 0; i < MAX_VIDAS_BOSS; i++) {
    const x = canvas.width - 30 - (i + 1) * (tamCoracao + espaco);
    if (i < vidasBoss) {
      if (imgCoracao.complete && imgCoracao.naturalWidth > 0) {
        ctx.drawImage(imgCoracao, x, y, tamCoracao, tamCoracao);
      } else {
        ctx.fillStyle = "#ff3b30";
        ctx.fillRect(x, y, tamCoracao, tamCoracao);
      }
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(x, y, tamCoracao, tamCoracao);
    }
  }

  const dados = dadosBosses[bossAtualIndex];
  ctx.fillStyle = dados.corTema;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(dados.nome.toUpperCase() + " (" + vidasBoss + " / " + MAX_VIDAS_BOSS + ")", canvas.width - 30, y + tamCoracao + 16);

  // Centro: Boss atual
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BOSS " + (bossAtualIndex + 1) + " / 3", canvas.width / 2, 28);

  if (bola.lentaTimer > 0) {
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("🐌 BOLA LENTA (" + bola.lentaTimer.toFixed(1) + "s)", canvas.width / 2, 48);
  }
}

// Painel Inferior de Cooldowns e Habilidades
function desenharPainelHabilidades() {
  const y = canvas.height - 24;
  let x = 25;

  if (temPowerUp("soco_forte")) {
    ctx.fillStyle = varela.socoCooldown <= 0 ? "#ff3b30" : "#666";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    const status = varela.socoCooldown <= 0 ? "[ESPAÇO] SOCO PRONTO" : "SOCO (" + varela.socoCooldown.toFixed(1) + "s)";
    ctx.fillText(status, x, y);
    x += 165;
  }

  if (temPowerUp("shield_gol")) {
    ctx.fillStyle = varela.shieldCooldown <= 0 ? "#af52de" : "#666";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    const tecla = temPowerUp("soco_forte") ? "[E]" : "[ESPAÇO]";
    const status = varela.shieldCooldown <= 0 ? tecla + " SHIELD PRONTO" : "SHIELD (" + varela.shieldCooldown.toFixed(1) + "s)";
    ctx.fillText(status, x, y);
    x += 165;
  }

  if (temPowerUp("varela_dash")) {
    ctx.fillStyle = varela.dashCooldown <= 0 ? "#ffcc00" : "#666";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    const status = varela.dashCooldown <= 0 ? "[W/S 2X] DASH PRONTO" : "DASH (" + varela.dashCooldown.toFixed(1) + "s)";
    ctx.fillText(status, x, y);
    x += 165;
  }

  // Avisos de debuff na tela
  if (varela.desestabilizadoTimer > 0) {
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "right";
    ctx.fillText("⚠️ CONTROLES INVERTIDOS PELO FRED (" + varela.desestabilizadoTimer.toFixed(1) + "s)", canvas.width - 25, y);
  } else if (varela.lentoTimer > 0) {
    ctx.fillStyle = "#34c759";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "right";
    ctx.fillText("⚠️ LENTO PELO PROCV (" + varela.lentoTimer.toFixed(1) + "s)", canvas.width - 25, y);
  }
}

// Tela de Menu Inicial
function desenharTelaMenu() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText("VARELA PONG ROGUELIKE", canvas.width / 2, 150);

  ctx.fillStyle = "#ff007f";
  ctx.font = "bold 18px Arial";
  ctx.fillText("A BATALHA DOS 3 BOSSES", canvas.width / 2, 195);

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px Arial";
  ctx.fillText("1. Planilha Excel (Fácil) | 2. Free Fire (Médio) | 3. Freddy Fazbear (Difícil)", canvas.width / 2, 235);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 15px Arial";
  ctx.fillText("❤️ Você tem 3 VIDAS! Derrote cada Boss com 5 gols para escolher cartas!", canvas.width / 2, 275);

  ctx.fillStyle = "#00ffea";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Pressione ESPAÇO para Iniciar", canvas.width / 2, 350);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "13px Arial";
  ctx.fillText("Controles: W / S ou Setas ou Mouse | M para Som", canvas.width / 2, 395);
}

// Tela de Escolha de Power-Ups Estilo Balatro
function desenharTelaEscolha() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BOSS DERROTADO! ESCOLHA SUA CARTA", canvas.width / 2, 55);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "14px Arial";
  ctx.fillText("Clique em uma carta ou aperte 1, 2 ou 3", canvas.width / 2, 85);

  const larguraCarta = 210;
  const alturaCarta = 265;
  const espaco = 25;
  const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;
  const yBase = 135;

  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const carta = cartasParaEscolha[i];
    const x = inicioX + i * (larguraCarta + espaco);

    const estaComMouse = (
      mouseX >= x &&
      mouseX <= x + larguraCarta &&
      mouseY >= yBase &&
      mouseY <= yBase + alturaCarta
    );
    const y = estaComMouse ? yBase - 14 : yBase;

    // Fundo da carta com gradiente
    const gradCarta = ctx.createLinearGradient(x, y, x + larguraCarta, y + alturaCarta);
    gradCarta.addColorStop(0, "#1d2535");
    gradCarta.addColorStop(1, "#101622");
    ctx.fillStyle = gradCarta;
    ctx.fillRect(x, y, larguraCarta, alturaCarta);

    // Borda colorida brilhante
    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = estaComMouse ? 4 : 2;
    if (estaComMouse) {
      ctx.shadowColor = carta.corBorda;
      ctx.shadowBlur = 15;
    }
    ctx.strokeRect(x, y, larguraCarta, alturaCarta);
    ctx.shadowBlur = 0;

    // Atalho [1], [2], [3]
    ctx.fillStyle = carta.corBorda;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText("[" + (i + 1) + "]", x + 14, y + 26);

    // Nome da Carta
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(carta.nome, x + larguraCarta / 2, y + 58);

    // Linha decorativa
    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 72);
    ctx.lineTo(x + larguraCarta - 15, y + 72);
    ctx.stroke();

    // Descrição
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "13px Arial";
    desenharTextoQuebrado(carta.descricao, x + larguraCarta / 2, y + 105, larguraCarta - 25, 20);

    // Botão Escolher
    ctx.fillStyle = estaComMouse ? carta.corBorda : "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(x + 20, y + alturaCarta - 40, larguraCarta - 40, 26);

    ctx.fillStyle = estaComMouse ? "#000000" : "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ESCOLHER", x + larguraCarta / 2, y + alturaCarta - 23);
  }
}

function desenharTextoQuebrado(texto, x, y, maxLargura, alturaLinha) {
  const palavras = texto.split(" ");
  let linha = "";
  for (let n = 0; n < palavras.length; n++) {
    const teste = linha + palavras[n] + " ";
    if (ctx.measureText(teste).width > maxLargura && n > 0) {
      ctx.fillText(linha, x, y);
      linha = palavras[n] + " ";
      y += alturaLinha;
    } else {
      linha = teste;
    }
  }
  ctx.fillText(linha, x, y);
}

// Tela de Game Over
function desenharTelaGameOver() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (imgGameOver.complete && imgGameOver.naturalWidth > 0) {
    ctx.drawImage(imgGameOver, canvas.width / 2 - 180, 110, 360, 110);
  } else {
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, 190);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Você foi derrotado por: " + dadosBosses[bossAtualIndex].nome, canvas.width / 2, 260);

  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Pressione ESPAÇO para Tentar Novamente", canvas.width / 2, 330);
}

// Tela de Vitória Final
function desenharTelaVitoria() {
  ctx.fillStyle = "rgba(8, 12, 18, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 44px Arial";
  ctx.textAlign = "center";
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
  let dt = (tempoAtual - ultimoTempo) / 1000;
  if (dt > 0.1) dt = 0.1;
  ultimoTempo = tempoAtual;

  atualizar(dt);
  desenhar();

  requestAnimationFrame(loop);
}

requestAnimationFrame(function(tempo) {
  ultimoTempo = tempo;
  loop(tempo);
});
