// ========================================================
// PONG ROGUELIKE  (inspirado em Balatro e Ultrapool)
// ========================================================
// Como o jogo funciona:
//  - Cada round é um Pong até 5 pontos.
//  - Ganhou o round? Escolhe 1 de 3 CARTAS (power-up permanente).
//  - Durante a partida aparecem ITENS no mapa: a BOLA precisa tocar
//    no item para ativar o poder (temporário).
//  - Gols tocam sons em ordem (gol1, gol2, gol3...).
// ========================================================


// ========================================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

// Estado do jogo: "menu", "jogando", "escolhendo", "gameover", "vitoria"
let estado = "menu";
let pausado = false;

// Rounds e pontuação
let roundAtual = 1;
const totalRounds = 5;
let placarJogador = 0;
let placarInimigo = 0;
const pontosParaVencer = 5;

// Raquete do Jogador (esquerda)
const jogador = {
  x: 20,
  y: 200,
  largura: 24,
  alturaPadrao: 100,
  altura: 100,
  velocidadePadrao: 380, // pixels por segundo
  velocidade: 380
};

// Raquete do Inimigo (direita)
const inimigo = {
  x: 756,
  y: 200,
  largura: 24,
  altura: 100,
  velocidadeBase: 190,
  velocidade: 190,
  morto: false,
  tempoRessurgir: 0 // segundos que faltam para ele voltar
};

// A Bola. A direção é guardada separada da velocidade:
// dirX e dirY formam um vetor de tamanho 1 (só a direção).
const bola = {
  x: 400,
  y: 250,
  raio: 9,
  dirX: 1,
  dirY: 0,
  velocidadeInicial: 320, // velocidade ao começar cada ponto (px/s)
  velocidade: 320,        // aumenta um pouco a cada rebatida
  velocidadeMaxima: 650
};

// Tempo de espera antes de a bola sair (dá tempo de se preparar)
let tempoSaque = 0;

// Cartas permanentes que o jogador já escolheu (guarda só os ids)
let cartasAtivas = [];

// Poderes temporários pegos no mapa: id -> segundos restantes
let temporizadores = {};

// Poder "assassino" pego no mapa (vale até matar o inimigo uma vez)
let assassinoPronto = false;

// Itens que estão no mapa esperando a bola encostar
let itensNoMapa = [];
let tempoProximoItem = 3;

// Textos que sobem na tela ("+ Raquete Grande!")
let textosFlutuantes = [];

// Três cartas sorteadas para a tela de escolha
let cartasParaEscolha = [];

// Mouse (para as cartas)
let mouseX = 0;
let mouseY = 0;

// Delta time (física independente do FPS)
let ultimoTempo = performance.now();


// ========================================================
// 2. CARREGAR IMAGENS (COM FALLBACK COLORIDO)
// ========================================================

let totalImagens = 5;
let imagensCarregadas = 0;
let jogoPronto = false;

// Conta cada imagem que terminou de carregar (ou falhou)
function checarCarregamento() {
  imagensCarregadas++;
  if (imagensCarregadas >= totalImagens) {
    jogoPronto = true;
  }
}

// Cria uma imagem e já liga o contador de carregamento
function carregarImagem(caminho) {
  const img = new Image();
  img.onload = checarCarregamento;
  img.onerror = checarCarregamento;
  img.src = caminho;
  return img;
}

const imgJogador = carregarImagem("assets/player.png");
const imgInimigo = carregarImagem("assets/enemy.png");
const imgPontoJogador = carregarImagem("assets/ponto_jogador.png");
const imgPontoInimigo = carregarImagem("assets/ponto_inimigo.png");
const imgPowerUp = carregarImagem("Images/powerup.png");

// Diz se a imagem carregou direito
function imagemOk(img) {
  return img.complete && img.naturalWidth > 0;
}


// ========================================================
// 3. ÁUDIO (TUDO AQUI, BEM ORGANIZADO)
// ========================================================

// Cria um Audio já pedindo para o navegador baixar o arquivo
function criarAudio(caminho) {
  const audio = new Audio(caminho);
  audio.preload = "auto";
  audio.volume = 0.8;
  return audio;
}

const sons = {
  // Quando o JOGADOR faz gol: toca na ordem 1 -> 2 -> 3 -> 1 ...
  golJogador: [
    criarAudio("Audios/gol1.mp3"),
    criarAudio("Audios/gol2.mp3"),
    criarAudio("Audios/gol3.mp3")
  ],
  // Quando o ROBÔ faz gol: também na ordem
  golInimigo: [
    criarAudio("Audios/robogol1.mp3"),
    criarAudio("Audios/robogol2.mp3"),
    criarAudio("Audios/robogol3.mp3")
  ],
  // Quando o gol deixa o placar empatado
  empate: criarAudio("Audios/empategol.mp3")
};

// Qual som vem na vez (a ordem)
let proximoGolJogador = 0;
let proximoGolInimigo = 0;

// Liga/desliga o som com a tecla M
let somLigado = true;

// Para qualquer som de gol que ainda esteja tocando (evita sobrepor)
function pararSonsDeGol() {
  const todos = sons.golJogador.concat(sons.golInimigo, [sons.empate]);
  for (let i = 0; i < todos.length; i++) {
    todos[i].pause();
    todos[i].currentTime = 0;
  }
}

// Toca um arquivo de áudio. O .catch evita erro no console
// se o navegador bloquear ou o arquivo não for achado.
function tocarSom(audio) {
  if (!somLigado) return;
  pararSonsDeGol();
  audio.currentTime = 0;
  const promessa = audio.play();
  if (promessa !== undefined) {
    promessa.catch(function(erro) {
      console.log("Som não tocou:", erro.message);
    });
  }
}

function tocarGolJogador() {
  tocarSom(sons.golJogador[proximoGolJogador]);
  proximoGolJogador = (proximoGolJogador + 1) % sons.golJogador.length;
}

function tocarGolInimigo() {
  tocarSom(sons.golInimigo[proximoGolInimigo]);
  proximoGolInimigo = (proximoGolInimigo + 1) % sons.golInimigo.length;
}

function tocarEmpate() {
  tocarSom(sons.empate);
}

// Efeitos curtos (batidas, coleta) feitos pelo próprio navegador.
// O contexto de áudio só é criado depois da primeira tecla/clique,
// porque o navegador não deixa tocar som antes disso.
let audioCtx = null;

function liberarAudio() {
  if (audioCtx === null) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (Contexto) audioCtx = new Contexto();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function tocarBip(frequencia, tipo, duracao) {
  if (!somLigado || audioCtx === null) return;
  const osc = audioCtx.createOscillator();
  const ganho = audioCtx.createGain();
  osc.type = tipo || "sine";
  osc.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0.15, audioCtx.currentTime);
  ganho.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);
  osc.connect(ganho);
  ganho.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duracao);
}

// Decide qual som de gol tocar (empate tem som próprio)
function somDeGol(quemFez) {
  if (placarJogador === placarInimigo) {
    tocarEmpate();
  } else if (quemFez === "jogador") {
    tocarGolJogador();
  } else {
    tocarGolInimigo();
  }
}


// ========================================================
// 4. LISTA DE POWER-UPS (FÁCIL DE ADICIONAR NOVOS)
// ========================================================
// Cada power-up tem:
//   id        -> nome interno (usado em temEfeito("id"))
//   nome      -> nome na tela
//   descricao -> texto da carta
//   corBorda  -> cor da carta / do item no mapa
//   carta     -> true = pode aparecer como carta entre os rounds (permanente)
//   mapa      -> true = pode aparecer no mapa (temporário)
//   duracao   -> segundos que dura quando pego no mapa (0 = especial)
//
// O EFEITO de cada um fica nas funções da seção 5 (procure por temEfeito).

const listaPowerUps = [
  {
    id: "assassino",
    nome: "Assassino",
    descricao: "Gol só vale depois que a bola bater no inimigo. Ele morre e ressurge em 6 a 7s.",
    corBorda: "#ff3b30",
    carta: false,
    mapa: true,
    duracao: 0
  },
  {
    id: "raquete_grande",
    nome: "Raquete Grande",
    descricao: "Sua raquete fica 40% maior para defender melhor.",
    corBorda: "#34c759",
    carta: true,
    mapa: true,
    duracao: 10
  },
  {
    id: "bola_lenta",
    nome: "Bola Lenta",
    descricao: "A bola se move 20% mais devagar no campo.",
    corBorda: "#007aff",
    carta: true,
    mapa: true,
    duracao: 8
  },
  {
    id: "ponto_duplo",
    nome: "Ponto Duplo",
    descricao: "Cada gol que você marca vale 2 pontos no placar.",
    corBorda: "#ffcc00",
    carta: true,
    mapa: true,
    duracao: 10
  },
  {
    id: "raquete_veloz",
    nome: "Raquete Veloz",
    descricao: "Sua raquete se move 30% mais rápido.",
    corBorda: "#af52de",
    carta: true,
    mapa: true,
    duracao: 10
  }
];

// Acha um power-up da lista pelo id
function acharPowerUp(id) {
  for (let i = 0; i < listaPowerUps.length; i++) {
    if (listaPowerUps[i].id === id) return listaPowerUps[i];
  }
  return null;
}

// Pergunta se um efeito está valendo agora.
// Vale se: tem a carta, OU pegou no mapa e o tempo não acabou,
// OU (só o Assassino) está pronto para uso.
function temEfeito(id) {
  if (cartasAtivas.indexOf(id) !== -1) return true;
  if (temporizadores[id] > 0) return true;
  if (id === "assassino" && assassinoPronto) return true;
  return false;
}

// Sorteia 3 cartas diferentes (só as que podem ser carta e ainda não foram pegas)
function sortearCartas() {
  cartasParaEscolha = [];
  const disponiveis = [];
  for (let i = 0; i < listaPowerUps.length; i++) {
    const p = listaPowerUps[i];
    if (p.carta && cartasAtivas.indexOf(p.id) === -1) disponiveis.push(p);
  }
  for (let i = 0; i < 3 && disponiveis.length > 0; i++) {
    const indice = Math.floor(Math.random() * disponiveis.length);
    cartasParaEscolha.push(disponiveis[indice]);
    disponiveis.splice(indice, 1);
  }
}

// Jogador escolheu uma carta: guarda e vai para o próximo round
function escolherCarta(indice) {
  if (indice < 0 || indice >= cartasParaEscolha.length) return;
  cartasAtivas.push(cartasParaEscolha[indice].id);
  roundAtual++;
  iniciarRound();
}

// A bola encostou num item do mapa: ativa o poder
function pegarItem(item) {
  const p = item.poder;
  if (p.id === "assassino") {
    assassinoPronto = true;
  } else {
    temporizadores[p.id] = p.duracao;
  }
  criarTextoFlutuante(item.x, item.y - 30, p.nome + "!", p.corBorda);
  tocarBip(900, "triangle", 0.2);
}


// ========================================================
// 5. CONTROLES (TECLADO E MOUSE)
// ========================================================

const teclas = {};

window.addEventListener("keydown", function(e) {
  liberarAudio();

  // Impede a página de rolar com setas e espaço
  if (e.code === "Space" || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
  }

  teclas[e.key.toLowerCase()] = true;

  // Barra de espaço: começa ou recomeça
  if (e.code === "Space" && jogoPronto) {
    if (estado === "menu" || estado === "gameover" || estado === "vitoria") {
      reiniciarJogoCompleto();
    }
  }

  // P pausa, M liga/desliga o som
  if (e.key.toLowerCase() === "p" && estado === "jogando") {
    pausado = !pausado;
  }
  if (e.key.toLowerCase() === "m") {
    somLigado = !somLigado;
    if (!somLigado) pararSonsDeGol();
  }

  // Teclas 1, 2 ou 3 escolhem a carta
  if (estado === "escolhendo") {
    if (e.key === "1") escolherCarta(0);
    if (e.key === "2") escolherCarta(1);
    if (e.key === "3") escolherCarta(2);
  }
});

window.addEventListener("keyup", function(e) {
  teclas[e.key.toLowerCase()] = false;
});

// Se a janela perder o foco, solta todas as teclas
// (senão a raquete poderia ficar andando sozinha)
window.addEventListener("blur", function() {
  for (const k in teclas) teclas[k] = false;
});

// Posição do mouse dentro do canvas (funciona mesmo se a tela for redimensionada)
canvas.addEventListener("mousemove", function(e) {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * (canvas.width / r.width);
  mouseY = (e.clientY - r.top) * (canvas.height / r.height);
});

// Medidas das cartas (usadas para desenhar E para detectar clique)
const CARTA = { largura: 190, altura: 250, espaco: 30, y: 140 };

function xDaCarta(i) {
  const inicioX = (canvas.width - (3 * CARTA.largura + 2 * CARTA.espaco)) / 2;
  return inicioX + i * (CARTA.largura + CARTA.espaco);
}

function mouseEmCima(i) {
  const x = xDaCarta(i);
  return (
    mouseX >= x && mouseX <= x + CARTA.largura &&
    mouseY >= CARTA.y - 12 && mouseY <= CARTA.y + CARTA.altura
  );
}

canvas.addEventListener("click", function() {
  liberarAudio();
  if (estado !== "escolhendo") return;
  for (let i = 0; i < cartasParaEscolha.length; i++) {
    if (mouseEmCima(i)) {
      escolherCarta(i);
      break;
    }
  }
});


// ========================================================
// 6. FUNÇÕES DE ATUALIZAR (LÓGICA E FÍSICA)
// ========================================================

// Começa uma partida nova do zero
function reiniciarJogoCompleto() {
  roundAtual = 1;
  cartasAtivas = [];
  pausado = false;
  proximoGolJogador = 0;
  proximoGolInimigo = 0;
  iniciarRound();
}

// Prepara um round (placar zerado, inimigo mais forte)
function iniciarRound() {
  placarJogador = 0;
  placarInimigo = 0;

  // Limpa os poderes do mapa (as cartas continuam)
  temporizadores = {};
  assassinoPronto = false;
  itensNoMapa = [];
  tempoProximoItem = 3;
  textosFlutuantes = [];

  // Inimigo fica mais rápido a cada round
  inimigo.velocidade = inimigo.velocidadeBase + (roundAtual - 1) * 35;
  inimigo.morto = false;
  inimigo.tempoRessurgir = 0;
  inimigo.y = canvas.height / 2 - inimigo.altura / 2;

  jogador.altura = jogador.alturaPadrao;
  jogador.y = canvas.height / 2 - jogador.altura / 2;

  pararSonsDeGol();
  resetarBola(1);
  estado = "jogando";
}

// Coloca a bola no centro. "direcao" = 1 vai para a direita, -1 para a esquerda
function resetarBola(direcao) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  bola.velocidade = bola.velocidadeInicial;

  // Ângulo aleatório entre -30 e +30 graus (nunca totalmente reto)
  let angulo = (Math.random() * 60 - 30) * Math.PI / 180;
  if (Math.abs(angulo) < 0.1) angulo = 0.2;
  bola.dirX = Math.cos(angulo) * direcao;
  bola.dirY = Math.sin(angulo);

  tempoSaque = 1.0; // 1 segundo parada antes de sair
}

// Velocidade de verdade da bola (já considerando a Bola Lenta)
function velocidadeDaBola() {
  let v = bola.velocidade;
  if (temEfeito("bola_lenta")) v = v * 0.8;
  return v;
}

// Move uma raquete para cima/baixo sem sair da tela
function limitarRaquete(r) {
  if (r.y < 0) r.y = 0;
  if (r.y + r.altura > canvas.height) r.y = canvas.height - r.altura;
}

function atualizarJogador(dt) {
  // Raquete Grande: muda a altura mantendo o centro no mesmo lugar
  const alturaAlvo = temEfeito("raquete_grande") ? jogador.alturaPadrao * 1.4 : jogador.alturaPadrao;
  if (alturaAlvo !== jogador.altura) {
    jogador.y -= (alturaAlvo - jogador.altura) / 2;
    jogador.altura = alturaAlvo;
  }

  // Raquete Veloz
  jogador.velocidade = temEfeito("raquete_veloz") ? jogador.velocidadePadrao * 1.3 : jogador.velocidadePadrao;

  if (teclas["w"] || teclas["arrowup"]) jogador.y -= jogador.velocidade * dt;
  if (teclas["s"] || teclas["arrowdown"]) jogador.y += jogador.velocidade * dt;
  limitarRaquete(jogador);
}

function atualizarInimigo(dt) {
  if (!inimigo.morto) {
    // IA: segue a bola, mas com velocidade limitada (dá para vencer!)
    const centro = inimigo.y + inimigo.altura / 2;
    const diferenca = bola.y - centro;
    if (diferenca > 15) inimigo.y += inimigo.velocidade * dt;
    else if (diferenca < -15) inimigo.y -= inimigo.velocidade * dt;
    limitarRaquete(inimigo);
  } else {
    // Morto: conta o tempo para ressurgir
    inimigo.tempoRessurgir -= dt;
    if (inimigo.tempoRessurgir <= 0) {
      inimigo.morto = false;
      inimigo.y = canvas.height / 2 - inimigo.altura / 2;
      criarTextoFlutuante(inimigo.x - 40, inimigo.y - 10, "Ele voltou!", "#ff3b30");
      tocarBip(600, "triangle", 0.2);
    }
  }
}

// Diminui o tempo dos poderes pegos no mapa
function atualizarTemporizadores(dt) {
  for (const id in temporizadores) {
    if (temporizadores[id] > 0) {
      temporizadores[id] -= dt;
      if (temporizadores[id] <= 0) {
        temporizadores[id] = 0;
        const p = acharPowerUp(id);
        criarTextoFlutuante(jogador.x + 60, jogador.y, p.nome + " acabou", "#aaaaaa");
      }
    }
  }
}

// Faz aparecer itens no mapa e vê se a bola pegou algum
function atualizarItens(dt) {
  // Cria um item novo de tempos em tempos (máximo 2 no mapa)
  tempoProximoItem -= dt;
  if (tempoProximoItem <= 0 && itensNoMapa.length < 2) {
    criarItemNoMapa();
    tempoProximoItem = 6 + Math.random() * 3;
  }

  for (let i = itensNoMapa.length - 1; i >= 0; i--) {
    const item = itensNoMapa[i];
    item.vida -= dt;
    item.balanco += dt * 3;

    // Item some se ninguém pegar em 12 segundos
    if (item.vida <= 0) {
      itensNoMapa.splice(i, 1);
      continue;
    }

    // A bola encostou? Pega!
    const dx = bola.x - item.x;
    const dy = bola.y - (item.y + Math.sin(item.balanco) * 6);
    if (Math.hypot(dx, dy) < bola.raio + item.raio) {
      pegarItem(item);
      itensNoMapa.splice(i, 1);
    }
  }
}

function criarItemNoMapa() {
  // Só sorteia poderes que podem aparecer no mapa
  // (e não repete o Assassino se já está pronto ou já tem um no mapa)
  const opcoes = [];
  for (let i = 0; i < listaPowerUps.length; i++) {
    const p = listaPowerUps[i];
    if (!p.mapa) continue;
    if (p.id === "assassino") {
      if (assassinoPronto) continue;
      let jaTem = false;
      for (let j = 0; j < itensNoMapa.length; j++) {
        if (itensNoMapa[j].poder.id === "assassino") jaTem = true;
      }
      if (jaTem) continue;
    }
    opcoes.push(p);
  }
  if (opcoes.length === 0) return;

  itensNoMapa.push({
    poder: opcoes[Math.floor(Math.random() * opcoes.length)],
    x: 260 + Math.random() * 280,  // sempre no meio do campo
    y: 70 + Math.random() * 360,
    raio: 22,
    vida: 12,
    balanco: Math.random() * 6
  });
}

// Move a bola e trata as batidas
function atualizarBola(dt) {
  // Esperando o saque
  if (tempoSaque > 0) {
    tempoSaque -= dt;
    return;
  }

  const v = velocidadeDaBola();
  bola.x += bola.dirX * v * dt;
  bola.y += bola.dirY * v * dt;

  // Topo e chão
  if (bola.y - bola.raio <= 0) {
    bola.y = bola.raio;
    bola.dirY = Math.abs(bola.dirY);
    tocarBip(280, "sine", 0.05);
  }
  if (bola.y + bola.raio >= canvas.height) {
    bola.y = canvas.height - bola.raio;
    bola.dirY = -Math.abs(bola.dirY);
    tocarBip(280, "sine", 0.05);
  }

  // Raquete do jogador (bola indo para a esquerda)
  if (bola.dirX < 0 && bolaTocaRaquete(jogador)) {
    bola.x = jogador.x + jogador.largura + bola.raio; // nunca fica presa
    rebaterBola(jogador, 1);
    tocarBip(440, "square", 0.06);
  }

  // Raquete do inimigo (bola indo para a direita, só se ele estiver vivo)
  if (!inimigo.morto && bola.dirX > 0 && bolaTocaRaquete(inimigo)) {
    bola.x = inimigo.x - bola.raio;

    if (assassinoPronto) {
      // ASSASSINO: a bola mata o inimigo!
      inimigo.morto = true;
      inimigo.tempoRessurgir = 6 + Math.random(); // entre 6 e 7 segundos
      assassinoPronto = false;                    // poder gasto
      bola.dirX = -Math.abs(bola.dirX);
      criarTextoFlutuante(inimigo.x - 60, inimigo.y, "K.O.! Gol aberto!", "#ff3b30");
      tocarBip(150, "sawtooth", 0.3);
    } else {
      rebaterBola(inimigo, -1);
      tocarBip(380, "square", 0.06);
    }
  }
}

// A bola está encostando na raquete?
function bolaTocaRaquete(r) {
  return (
    bola.x + bola.raio >= r.x &&
    bola.x - bola.raio <= r.x + r.largura &&
    bola.y + bola.raio >= r.y &&
    bola.y - bola.raio <= r.y + r.altura
  );
}

// Muda o ângulo da bola conforme onde ela bateu e acelera um pouco.
// "sentido" = 1 manda para a direita, -1 para a esquerda
function rebaterBola(raquete, sentido) {
  let relativo = (bola.y - (raquete.y + raquete.altura / 2)) / (raquete.altura / 2);
  if (relativo > 1) relativo = 1;
  if (relativo < -1) relativo = -1;

  const angulo = relativo * (Math.PI / 3); // máximo 60 graus
  bola.dirX = Math.cos(angulo) * sentido;
  bola.dirY = Math.sin(angulo);

  bola.velocidade = Math.min(bola.velocidade * 1.05, bola.velocidadeMaxima);
}

// Confere se alguém fez gol
function checarGols() {
  // Bola saiu pela DIREITA (gol do jogador)
  if (bola.x + bola.raio >= canvas.width) {
    // Assassino pronto e inimigo vivo: o gol está protegido, a bola volta
    if (assassinoPronto && !inimigo.morto) {
      bola.x = canvas.width - bola.raio;
      bola.dirX = -Math.abs(bola.dirX);
      criarTextoFlutuante(canvas.width - 150, bola.y, "Mate o inimigo primeiro!", "#ff3b30");
      tocarBip(180, "sawtooth", 0.15);
      return;
    }

    placarJogador += temEfeito("ponto_duplo") ? 2 : 1;
    somDeGol("jogador");

    if (placarJogador >= pontosParaVencer) {
      pararBolaNoFimDoRound();
      if (roundAtual >= totalRounds) {
        estado = "vitoria";
      } else {
        sortearCartas();
        estado = "escolhendo";
      }
    } else {
      resetarBola(-1); // próximo saque vai para o lado de quem tomou o gol
    }
    return;
  }

  // Bola saiu pela ESQUERDA (gol do inimigo)
  if (bola.x - bola.raio <= 0) {
    placarInimigo += 1;
    somDeGol("inimigo");

    if (placarInimigo >= pontosParaVencer) {
      pararBolaNoFimDoRound();
      estado = "gameover";
    } else {
      resetarBola(1);
    }
  }
}

// Deixa a bola no centro quando o round termina
function pararBolaNoFimDoRound() {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;
  tempoSaque = 999;
}

function criarTextoFlutuante(x, y, texto, cor) {
  textosFlutuantes.push({ x: x, y: y, texto: texto, cor: cor, vida: 1.4 });
}

function atualizarTextos(dt) {
  for (let i = textosFlutuantes.length - 1; i >= 0; i--) {
    const t = textosFlutuantes[i];
    t.y -= 35 * dt;
    t.vida -= dt;
    if (t.vida <= 0) textosFlutuantes.splice(i, 1);
  }
}

// Função principal de atualização: chama as partes em ordem
function atualizar(dt) {
  if (estado !== "jogando" || pausado) return;

  atualizarJogador(dt);
  atualizarInimigo(dt);
  atualizarTemporizadores(dt);
  atualizarItens(dt);
  atualizarBola(dt);
  checarGols();
  atualizarTextos(dt);
}


// ========================================================
// 7. FUNÇÕES DE DESENHAR
// ========================================================

function desenhar() {
  // Fundo
  ctx.fillStyle = "#161b22";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Linha tracejada central
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Só desenha o jogo "de verdade" depois de entrar na partida
  if (estado !== "menu") {
    desenharBarreiraDoGol();
    desenharItens();
    desenharRaquetes();
    desenharBola();
    desenharTextos();
    desenharPlacar();
    desenharPoderesAtivos();
    desenharAjuda();
  }

  // Telas especiais
  if (estado === "menu") {
    desenharTelaMenu();
  } else if (estado === "escolhendo") {
    desenharTelaEscolha();
  } else if (estado === "gameover") {
    desenharTelaFim("GAME OVER", "Você foi derrotado no Round " + roundAtual, "#ff3b30");
  } else if (estado === "vitoria") {
    desenharTelaFim("VITÓRIA TOTAL!", "Você completou todos os " + totalRounds + " rounds!", "#ffcc00");
  } else if (pausado) {
    desenharPausa();
  }
}

// Desenha um personagem: uma barra (a hitbox de verdade) + a imagem por cima,
// mantendo a proporção da imagem
function desenharPersonagem(img, r, cor) {
  ctx.fillStyle = cor;
  ctx.fillRect(r.x, r.y, r.largura, r.altura);

  if (imagemOk(img)) {
    const escala = Math.min(80 / img.naturalWidth, r.altura / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    let x = r.x + r.largura / 2 - w / 2;
    if (x < 0) x = 0;
    if (x + w > canvas.width) x = canvas.width - w;
    ctx.drawImage(img, x, r.y + r.altura / 2 - h / 2, w, h);
  }
}

function desenharRaquetes() {
  desenharPersonagem(imgJogador, jogador, "rgba(52, 199, 89, 0.55)");

  if (!inimigo.morto) {
    desenharPersonagem(imgInimigo, inimigo, "rgba(255, 59, 48, 0.55)");
  } else {
    // Inimigo morto: fica transparente com contador
    ctx.save();
    ctx.globalAlpha = 0.2;
    desenharPersonagem(imgInimigo, inimigo, "#888888");
    ctx.restore();

    ctx.textAlign = "center";
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#ff3b30";
    ctx.fillText("MORTO", inimigo.x - 30, canvas.height / 2 - 10);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 22px Arial";
    ctx.fillText(Math.max(0, inimigo.tempoRessurgir).toFixed(1) + "s", inimigo.x - 30, canvas.height / 2 + 18);
  }
}

function desenharBola() {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();

  // Contagem do saque (só nos rounds em andamento)
  if (estado === "jogando" && tempoSaque > 0 && tempoSaque < 5) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(tempoSaque), canvas.width / 2, canvas.height / 2 - 30);
  }
}

// Parede vermelha no gol do inimigo quando o Assassino está pronto
function desenharBarreiraDoGol() {
  if (!assassinoPronto || inimigo.morto) return;

  ctx.fillStyle = "rgba(255, 59, 48, 0.35)";
  ctx.fillRect(canvas.width - 10, 0, 10, canvas.height);
  ctx.strokeStyle = "#ff3b30";
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - 10, 0, 10, canvas.height);
}

// Itens (power-ups) que estão no mapa
function desenharItens() {
  for (let i = 0; i < itensNoMapa.length; i++) {
    const item = itensNoMapa[i];
    const y = item.y + Math.sin(item.balanco) * 6;

    // Pisca nos últimos 3 segundos para avisar que vai sumir
    if (item.vida < 3 && Math.floor(item.vida * 6) % 2 === 0) continue;

    // Círculo colorido com brilho
    ctx.save();
    ctx.shadowColor = item.poder.corBorda;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(20, 24, 30, 0.9)";
    ctx.beginPath();
    ctx.arc(item.x, y, item.raio + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = item.poder.corBorda;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(item.x, y, item.raio + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Ícone (ou um raio se a imagem não carregar)
    if (imagemOk(imgPowerUp)) {
      ctx.drawImage(imgPowerUp, item.x - item.raio, y - item.raio, item.raio * 2, item.raio * 2);
    } else {
      ctx.fillStyle = item.poder.corBorda;
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚡", item.x, y + 8);
    }

    // Nome embaixo
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(item.poder.nome, item.x, y + item.raio + 20);
  }
}

function desenharTextos() {
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  for (let i = 0; i < textosFlutuantes.length; i++) {
    const t = textosFlutuantes[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, t.vida));
    ctx.fillStyle = t.cor;
    ctx.fillText(t.texto, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// Placar com ícones (um ícone por ponto)
function desenharPlacar() {
  const tamanhoIcone = 24;
  const espaco = 6;
  const y = 14;

  for (let i = 0; i < placarJogador; i++) {
    const x = canvas.width / 2 - 40 - (i + 1) * (tamanhoIcone + espaco);
    if (imagemOk(imgPontoJogador)) {
      ctx.drawImage(imgPontoJogador, x, y, tamanhoIcone, tamanhoIcone);
    } else {
      ctx.fillStyle = "#34c759";
      ctx.fillRect(x, y, tamanhoIcone, tamanhoIcone);
    }
  }

  for (let i = 0; i < placarInimigo; i++) {
    const x = canvas.width / 2 + 40 + i * (tamanhoIcone + espaco);
    if (imagemOk(imgPontoInimigo)) {
      ctx.drawImage(imgPontoInimigo, x, y, tamanhoIcone, tamanhoIcone);
    } else {
      ctx.fillStyle = "#ff3b30";
      ctx.fillRect(x, y, tamanhoIcone, tamanhoIcone);
    }
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ROUND " + roundAtual + " / " + totalRounds, canvas.width / 2, 54);
}

// Mini-cartas no canto de baixo: cartas permanentes + poderes do mapa com tempo
function desenharPoderesAtivos() {
  const lista = [];

  for (let i = 0; i < cartasAtivas.length; i++) {
    const p = acharPowerUp(cartasAtivas[i]);
    lista.push({ texto: p.nome, cor: p.corBorda });
  }
  for (let i = 0; i < listaPowerUps.length; i++) {
    const p = listaPowerUps[i];
    if (temporizadores[p.id] > 0) {
      lista.push({ texto: p.nome + " " + Math.ceil(temporizadores[p.id]) + "s", cor: p.corBorda });
    }
  }
  if (assassinoPronto) {
    lista.push({ texto: "Assassino: acerte o inimigo!", cor: "#ff3b30" });
  }

  let x = 15;
  const y = canvas.height - 34;
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i < lista.length; i++) {
    const larguraCarta = ctx.measureText(lista[i].texto).width + 16;
    ctx.fillStyle = "#1e242d";
    ctx.fillRect(x, y, larguraCarta, 24);
    ctx.strokeStyle = lista[i].cor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, larguraCarta, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lista[i].texto, x + larguraCarta / 2, y + 16);
    x += larguraCarta + 8;
  }
}

// Dica de teclas no canto de baixo
function desenharAjuda() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.fillText("P: pausar   M: som " + (somLigado ? "ligado" : "desligado"), canvas.width - 12, canvas.height - 10);
}

function desenharPausa() {
  ctx.fillStyle = "rgba(10, 13, 18, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PAUSADO", canvas.width / 2, canvas.height / 2);
  ctx.font = "16px Arial";
  ctx.fillText("Aperte P para continuar", canvas.width / 2, canvas.height / 2 + 32);
}

// Tela de Menu
function desenharTelaMenu() {
  ctx.fillStyle = "rgba(10, 13, 18, 0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PONG ROGUELIKE", canvas.width / 2, 160);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Inspirado em Balatro e Ultrapool", canvas.width / 2, 200);

  ctx.fillStyle = jogoPronto ? "#34c759" : "#aaaaaa";
  ctx.font = "bold 20px Arial";
  ctx.fillText(jogoPronto ? "Pressione ESPAÇO para começar" : "Carregando imagens...", canvas.width / 2, 290);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "14px Arial";
  ctx.fillText("Mover: W / S ou setas ↑ / ↓", canvas.width / 2, 340);
  ctx.fillText("Faça a BOLA encostar nos itens que aparecem no campo!", canvas.width / 2, 365);
  ctx.fillText("P: pausar   M: ligar/desligar som", canvas.width / 2, 390);
}

// Tela de escolha das cartas (estilo Balatro)
function desenharTelaEscolha() {
  ctx.fillStyle = "rgba(10, 13, 18, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ROUND " + roundAtual + " VENCIDO! ESCOLHA UM POWER-UP", canvas.width / 2, 60);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "14px Arial";
  ctx.fillText("Clique em uma carta ou aperte 1, 2 ou 3", canvas.width / 2, 90);

  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const carta = cartasParaEscolha[i];
    const x = xDaCarta(i);
    const emCima = mouseEmCima(i);
    const y = emCima ? CARTA.y - 12 : CARTA.y; // levanta ao passar o mouse

    ctx.fillStyle = "#1e242d";
    ctx.fillRect(x, y, CARTA.largura, CARTA.altura);
    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = emCima ? 4 : 2;
    ctx.strokeRect(x, y, CARTA.largura, CARTA.altura);

    ctx.fillStyle = carta.corBorda;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText("[" + (i + 1) + "]", x + 12, y + 26);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(carta.nome, x + CARTA.largura / 2, y + 60);

    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 75);
    ctx.lineTo(x + CARTA.largura - 20, y + 75);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "13px Arial";
    desenharTextoComQuebra(carta.descricao, x + CARTA.largura / 2, y + 110, CARTA.largura - 30, 20);

    ctx.fillStyle = emCima ? carta.corBorda : "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(x + 20, y + CARTA.altura - 40, CARTA.largura - 40, 26);
    ctx.fillStyle = emCima ? "#000000" : "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ESCOLHER", x + CARTA.largura / 2, y + CARTA.altura - 23);
  }
}

// Quebra um texto grande em várias linhas
function desenharTextoComQuebra(texto, x, y, larguraMaxima, alturaLinha) {
  const palavras = texto.split(" ");
  let linha = "";

  for (let n = 0; n < palavras.length; n++) {
    const teste = linha + palavras[n] + " ";
    if (ctx.measureText(teste).width > larguraMaxima && n > 0) {
      ctx.fillText(linha, x, y);
      linha = palavras[n] + " ";
      y += alturaLinha;
    } else {
      linha = teste;
    }
  }
  ctx.fillText(linha, x, y);
}

// Tela de Game Over ou Vitória
function desenharTelaFim(titulo, subtitulo, corTitulo) {
  ctx.fillStyle = "rgba(10, 13, 18, 0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = corTitulo;
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText(titulo, canvas.width / 2, 200);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText(subtitulo, canvas.width / 2, 240);

  ctx.fillStyle = "#34c759";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Pressione ESPAÇO para recomeçar", canvas.width / 2, 320);
}


// ========================================================
// 8. LOOP PRINCIPAL (requestAnimationFrame + delta time)
// ========================================================

function loop(tempoAtual) {
  // Quanto tempo passou desde o último frame, em segundos
  let dt = (tempoAtual - ultimoTempo) / 1000;
  if (dt > 0.05) dt = 0.05; // se mudar de aba, não deixa a física "pular"
  ultimoTempo = tempoAtual;

  atualizar(dt);
  desenhar();

  requestAnimationFrame(loop);
}

requestAnimationFrame(function(tempo) {
  ultimoTempo = tempo;
  loop(tempo);
});
