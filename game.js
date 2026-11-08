// ========================================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

// Estado do jogo: "menu", "jogando", "escolhendo", "gameover", "vitoria"
let estado = "menu";

// Rounds e pontuação
let roundAtual = 1;
const totalRounds = 5;
let placarJogador = 0;
let placarInimigo = 0;
const pontosParaVencer = 5;

// Raquete do Jogador (esquerda)
const jogador = {
  x: 25,
  y: 200,
  largura: 30,
  alturaPadrao: 90,
  altura: 90,
  velocidade: 360 // pixels por segundo
};

// Raquete do Inimigo (direita)
const inimigo = {
  x: 745,
  y: 200,
  largura: 30,
  altura: 90,
  velocidadeBase: 210,
  velocidade: 210,
  morto: false,
  tempoRessurgir: 0,
  tempoMorteTotal: 0
};

// A Bola
const bola = {
  x: 400,
  y: 250,
  raio: 9,
  velocidadeBase: 300,
  velX: 300,
  velY: 150,
  fatorVelocidade: 1.0, // Alterado por power-up (ex: Bola Lenta)
  tocouInimigo: false   // Importante para a mecânica do Assassino
};

// Delta Time para física independente de FPS
let ultimoTempo = performance.now();

// Lista de power-ups que o jogador já coletou
let powerUpsAtivos = [];

// Três cartas sorteadas para a tela de escolha
let cartasParaEscolha = [];

// Posição do mouse para interação com as cartas na tela de escolha
let mouseX = 0;
let mouseY = 0;


// ========================================================
// 2. CARREGAR IMAGENS (COM FALLBACK COLORIDO)
// ========================================================

let totalImagens = 4;
let imagensCarregadas = 0;
let jogoPronto = false;

function checarCarregamento() {
  imagensCarregadas++;
  if (imagensCarregadas >= totalImagens) {
    jogoPronto = true;
  }
}

// Imagens dos Personagens (Raquetes)
const imgJogador = new Image();
imgJogador.onload = checarCarregamento;
imgJogador.onerror = checarCarregamento;
imgJogador.src = "assets/player.png";

const imgInimigo = new Image();
imgInimigo.onload = checarCarregamento;
imgInimigo.onerror = checarCarregamento;
imgInimigo.src = "assets/enemy.png";

// Imagens dos Ícones de Ponto do Placar
const imgPontoJogador = new Image();
imgPontoJogador.onload = checarCarregamento;
imgPontoJogador.onerror = checarCarregamento;
imgPontoJogador.src = "assets/ponto_jogador.png";

const imgPontoInimigo = new Image();
imgPontoInimigo.onload = checarCarregamento;
imgPontoInimigo.onerror = checarCarregamento;
imgPontoInimigo.src = "assets/ponto_inimigo.png";


// ========================================================
// 3. LISTA DE POWER-UPS (FÁCIL DE ADICIONAR NOVOS)
// ========================================================

const listaPowerUps = [
  {
    id: "assassino",
    nome: "Assassino",
    descricao: "Gol só vale se matar o inimigo com a bola! Ele ressurge em 6 a 7s.",
    corBorda: "#ff3b30",
    aplicar: function() {
      // Ativado via verificação de colisão durante a partida
    }
  },
  {
    id: "raquete_grande",
    nome: "Raquete Grande",
    descricao: "Sua raquete fica 40% maior para defender melhor.",
    corBorda: "#34c759",
    aplicar: function() {
      jogador.altura = jogador.alturaPadrao * 1.4;
    }
  },
  {
    id: "bola_lenta",
    nome: "Bola Lenta",
    descricao: "A bola se move 20% mais devagar no campo.",
    corBorda: "#007aff",
    aplicar: function() {
      bola.fatorVelocidade *= 0.8;
    }
  },
  {
    id: "ponto_duplo",
    nome: "Ponto Duplo",
    descricao: "Cada gol que você marca vale 2 pontos no placar.",
    corBorda: "#ffcc00",
    aplicar: function() {
      // Ativado ao marcar gol
    }
  }
];

// Função que verifica se um determinado power-up está ativo
function temPowerUp(id) {
  for (let i = 0; i < powerUpsAtivos.length; i++) {
    if (powerUpsAtivos[i].id === id) return true;
  }
  return false;
}

// Sorteia 3 cartas de power-up sem repetir
function sortearCartas() {
  cartasParaEscolha = [];
  let disponiveis = [...listaPowerUps];

  // Sorteia até 3 cartas
  for (let i = 0; i < 3 && disponiveis.length > 0; i++) {
    const indice = Math.floor(Math.random() * disponiveis.length);
    cartasParaEscolha.push(disponiveis[indice]);
    disponiveis.splice(indice, 1);
  }
}

// Escolhe a carta e ativa seu efeito
function escolherPowerUp(indice) {
  if (indice >= 0 && indice < cartasParaEscolha.length) {
    const carta = cartasParaEscolha[indice];
    powerUpsAtivos.push(carta);
    carta.aplicar();

    // Avança para o próximo round
    roundAtual++;
    iniciarRound();
  }
}


// ========================================================
// 4. CONTROLES (TECLADO E MOUSE)
// ========================================================

const teclas = {};

window.addEventListener("keydown", function(e) {
  teclas[e.key] = true;

  // Barra de espaço para iniciar ou recomeçar
  if (e.code === "Space") {
    if (estado === "menu") {
      reiniciarJogoCompleto();
    } else if (estado === "gameover" || estado === "vitoria") {
      reiniciarJogoCompleto();
    }
  }

  // Teclas 1, 2 ou 3 para escolher carta
  if (estado === "escolhendo") {
    if (e.key === "1") escolherPowerUp(0);
    if (e.key === "2") escolherPowerUp(1);
    if (e.key === "3") escolherPowerUp(2);
  }
});

window.addEventListener("keyup", function(e) {
  teclas[e.key] = false;
});

// Acompanhar o mouse no canvas
canvas.addEventListener("mousemove", function(e) {
  const retangulo = canvas.getBoundingClientRect();
  mouseX = e.clientX - retangulo.left;
  mouseY = e.clientY - retangulo.top;
});

// Clique do mouse para escolher cartas
canvas.addEventListener("click", function() {
  if (estado === "escolhendo") {
    const larguraCarta = 190;
    const alturaCarta = 250;
    const espaco = 30;
    const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;
    const y = 140;

    for (let i = 0; i < cartasParaEscolha.length; i++) {
      const x = inicioX + i * (larguraCarta + espaco);
      if (
        mouseX >= x &&
        mouseX <= x + larguraCarta &&
        mouseY >= y &&
        mouseY <= y + alturaCarta
      ) {
        escolherPowerUp(i);
        break;
      }
    }
  }
});


// ========================================================
// 5. FUNÇÕES DE ATUALIZAR (LÓGICA E FÍSICA)
// ========================================================

function reiniciarJogoCompleto() {
  roundAtual = 1;
  powerUpsAtivos = [];
  jogador.altura = jogador.alturaPadrao;
  bola.fatorVelocidade = 1.0;
  iniciarRound();
}

function iniciarRound() {
  placarJogador = 0;
  placarInimigo = 0;

  // Inimigo fica mais rápido a cada round
  inimigo.velocidade = inimigo.velocidadeBase + (roundAtual - 1) * 35;
  inimigo.morto = false;
  inimigo.tempoRessurgir = 0;

  resetarBola(1);
  estado = "jogando";
}

function resetarBola(direcao = 1) {
  bola.x = canvas.width / 2;
  bola.y = canvas.height / 2;

  // Velocidade inicial da bola
  const velXBase = bola.velocidadeBase * bola.fatorVelocidade;
  bola.velX = velXBase * direcao;

  // Pequeno ângulo aleatório vertical
  const velYAleatoria = (Math.random() * 160 - 80);
  bola.velY = Math.abs(velYAleatoria) < 40 ? 50 : velYAleatoria;

  bola.tocouInimigo = false;
}

function atualizar(dt) {
  if (estado !== "jogando") return;

  // 1. Mover raquete do Jogador (W/S ou Setas)
  if (teclas["w"] || teclas["W"] || teclas["ArrowUp"]) {
    jogador.y -= jogador.velocidade * dt;
  }
  if (teclas["s"] || teclas["S"] || teclas["ArrowDown"]) {
    jogador.y += jogador.velocidade * dt;
  }

  // Prevenir que o jogador saia da tela
  if (jogador.y < 0) jogador.y = 0;
  if (jogador.y + jogador.altura > canvas.height) {
    jogador.y = canvas.height - jogador.altura;
  }

  // 2. Inimigo (IA): segue a bola se estiver vivo
  if (!inimigo.morto) {
    const centroInimigo = inimigo.y + inimigo.altura / 2;
    const diferenca = bola.y - centroInimigo;

    if (diferenca > 15) {
      inimigo.y += inimigo.velocidade * dt;
    } else if (diferenca < -15) {
      inimigo.y -= inimigo.velocidade * dt;
    }

    // Prevenir que o inimigo saia da tela
    if (inimigo.y < 0) inimigo.y = 0;
    if (inimigo.y + inimigo.altura > canvas.height) {
      inimigo.y = canvas.height - inimigo.altura;
    }
  } else {
    // Se o inimigo estiver morto (mecânica do Assassino):
    inimigo.tempoRessurgir -= dt;
    if (inimigo.tempoRessurgir <= 0) {
      inimigo.morto = false;
      inimigo.y = canvas.height / 2 - inimigo.altura / 2;
    }
  }

  // 3. Mover a bola
  bola.x += bola.velX * dt;
  bola.y += bola.velY * dt;

  // 4. Colisão com topo e chão do canvas
  if (bola.y - bola.raio <= 0) {
    bola.y = bola.raio;
    bola.velY = Math.abs(bola.velY);
  }
  if (bola.y + bola.raio >= canvas.height) {
    bola.y = canvas.height - bola.raio;
    bola.velY = -Math.abs(bola.velY);
  }

  // 5. Colisão com a Raquete do Jogador (Esquerda)
  if (
    bola.x - bola.raio <= jogador.x + jogador.largura &&
    bola.x + bola.raio >= jogador.x &&
    bola.y >= jogador.y &&
    bola.y <= jogador.y + jogador.altura &&
    bola.velX < 0
  ) {
    // Garante que a bola nunca fique presa dentro da raquete
    bola.x = jogador.x + jogador.largura + bola.raio;

    // Ângulo varia conforme onde bateu na raquete
    const pontoRelativo = (bola.y - (jogador.y + jogador.altura / 2)) / (jogador.altura / 2);
    const angulo = pontoRelativo * (Math.PI / 3); // Máximo de 60 graus

    // Aumenta ligeiramente a velocidade a cada rebatida (estilo Pong clássico)
    const velocidadeAtual = Math.hypot(bola.velX, bola.velY) * 1.05;
    bola.velX = Math.abs(Math.cos(angulo) * velocidadeAtual);
    bola.velY = Math.sin(angulo) * velocidadeAtual;
  }

  // 6. Colisão com o Inimigo (Direita - se vivo)
  if (!inimigo.morto) {
    if (
      bola.x + bola.raio >= inimigo.x &&
      bola.x - bola.raio <= inimigo.x + inimigo.largura &&
      bola.y >= inimigo.y &&
      bola.y <= inimigo.y + inimigo.altura &&
      bola.velX > 0
    ) {
      bola.x = inimigo.x - bola.raio;
      bola.tocouInimigo = true;

      // Mecânica do Power-up Assassino: a bola mata o inimigo ao bater nele!
      if (temPowerUp("assassino")) {
        inimigo.morto = true;
        // Tempo aleatório entre 6 e 7 segundos
        inimigo.tempoMorteTotal = 6.0 + Math.random();
        inimigo.tempoRessurgir = inimigo.tempoMorteTotal;

        // Rebate a bola de volta
        bola.velX = -Math.abs(bola.velX);
      } else {
        // Rebatida normal da raquete inimiga
        const pontoRelativo = (bola.y - (inimigo.y + inimigo.altura / 2)) / (inimigo.altura / 2);
        const angulo = pontoRelativo * (Math.PI / 3);
        const velocidadeAtual = Math.hypot(bola.velX, bola.velY) * 1.05;

        bola.velX = -Math.abs(Math.cos(angulo) * velocidadeAtual);
        bola.velY = Math.sin(angulo) * velocidadeAtual;
      }
    }
  }

  // 7. Gols e Pontuação
  // GOL DO JOGADOR (Direita)
  if (bola.x + bola.raio >= canvas.width) {
    // Se o jogador tem a carta "Assassino", só vale gol se o inimigo tiver sido atingido/morto
    if (temPowerUp("assassino") && !inimigo.morto && !bola.tocouInimigo) {
      // Não conta ponto! A bola quica na parede do fundo e volta
      bola.x = canvas.width - bola.raio;
      bola.velX = -Math.abs(bola.velX);
    } else {
      // Gol válido!
      const pontosGanhos = temPowerUp("ponto_duplo") ? 2 : 1;
      placarJogador += pontosGanhos;

      // Verificar vitória do round
      if (placarJogador >= pontosParaVencer) {
        if (roundAtual >= totalRounds) {
          estado = "vitoria";
        } else {
          sortearCartas();
          estado = "escolhendo";
        }
      } else {
        resetarBola(-1);
      }
    }
  }

  // GOL DO INIMIGO (Esquerda)
  if (bola.x - bola.raio <= 0) {
    placarInimigo += 1;

    // Verificar derrota no round
    if (placarInimigo >= pontosParaVencer) {
      estado = "gameover";
    } else {
      resetarBola(1);
    }
  }
}


// ========================================================
// 6. FUNÇÕES DE DESENHAR
// ========================================================

function desenhar() {
  // Limpar tela com fundo escuro
  ctx.fillStyle = "#161b22";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Linha tracejada central da mesa de Pong
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Desenhar Raquete do Jogador (Imagem ou Retângulo Colorido de Fallback)
  if (imgJogador.complete && imgJogador.naturalWidth > 0) {
    ctx.drawImage(imgJogador, jogador.x, jogador.y, jogador.largura, jogador.altura);
  } else {
    ctx.fillStyle = "#34c759";
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);
  }

  // Desenhar Raquete do Inimigo
  if (!inimigo.morto) {
    if (imgInimigo.complete && imgInimigo.naturalWidth > 0) {
      ctx.drawImage(imgInimigo, inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    } else {
      ctx.fillStyle = "#ff3b30";
      ctx.fillRect(inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    }
  } else {
    // Efeito do inimigo morto pelo poder Assassino (transparente e contador)
    ctx.save();
    ctx.globalAlpha = 0.25;
    if (imgInimigo.complete && imgInimigo.naturalWidth > 0) {
      ctx.drawImage(imgInimigo, inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    } else {
      ctx.fillStyle = "#888888";
      ctx.fillRect(inimigo.x, inimigo.y, inimigo.largura, inimigo.altura);
    }
    ctx.restore();

    // Texto com contador regressivo do ressurgimento
    ctx.fillStyle = "#ff3b30";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀 MORTO", inimigo.x + inimigo.largura / 2, inimigo.y - 10);
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(inimigo.tempoRessurgir.toFixed(1) + "s", inimigo.x + inimigo.largura / 2, inimigo.y + inimigo.altura + 18);
  }

  // Desenhar a Bola
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fill();

  // Desenhar o Placar com Ícones
  desenharPlacar();

  // Desenhar os Power-Ups Ativos no canto
  desenharPowerUpsAtivos();

  // Telas especiais conforme o estado
  if (estado === "menu") {
    desenharTelaMenu();
  } else if (estado === "escolhendo") {
    desenharTelaEscolha();
  } else if (estado === "gameover") {
    desenharTelaFim("GAME OVER", "Você foi derrotado no Round " + roundAtual, "#ff3b30");
  } else if (estado === "vitoria") {
    desenharTelaFim("VITÓRIA TOTAL!", "Você completou todos os 5 rounds!", "#ffcc00");
  }
}

// Desenha os pontos como ícones na parte superior
function desenharPlacar() {
  const tamanhoIcone = 24;
  const espaco = 6;
  const y = 16;

  // Placar do Jogador (à esquerda do centro)
  for (let i = 0; i < placarJogador; i++) {
    const x = canvas.width / 2 - 40 - (i + 1) * (tamanhoIcone + espaco);
    if (imgPontoJogador.complete && imgPontoJogador.naturalWidth > 0) {
      ctx.drawImage(imgPontoJogador, x, y, tamanhoIcone, tamanhoIcone);
    } else {
      ctx.fillStyle = "#34c759";
      ctx.fillRect(x, y, tamanhoIcone, tamanhoIcone);
    }
  }

  // Placar do Inimigo (à direita do centro)
  for (let i = 0; i < placarInimigo; i++) {
    const x = canvas.width / 2 + 40 + i * (tamanhoIcone + espaco);
    if (imgPontoInimigo.complete && imgPontoInimigo.naturalWidth > 0) {
      ctx.drawImage(imgPontoInimigo, x, y, tamanhoIcone, tamanhoIcone);
    } else {
      ctx.fillStyle = "#ff3b30";
      ctx.fillRect(x, y, tamanhoIcone, tamanhoIcone);
    }
  }

  // Informação do Round atual
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ROUND " + roundAtual + " / " + totalRounds, canvas.width / 2, 34);
}

// Mostra pequenos cartões com os power-ups ativos no canto inferior
function desenharPowerUpsAtivos() {
  const xInicial = 15;
  const y = canvas.height - 35;
  let offsetX = 0;

  for (let i = 0; i < powerUpsAtivos.length; i++) {
    const p = powerUpsAtivos[i];
    const texto = p.nome;
    ctx.font = "bold 11px Arial";
    const larguraTexto = ctx.measureText(texto).width + 16;

    // Fundo da mini-carta
    ctx.fillStyle = "#1e242d";
    ctx.fillRect(xInicial + offsetX, y, larguraTexto, 24);

    // Borda colorida
    ctx.strokeStyle = p.corBorda;
    ctx.lineWidth = 2;
    ctx.strokeRect(xInicial + offsetX, y, larguraTexto, 24);

    // Texto
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(texto, xInicial + offsetX + larguraTexto / 2, y + 16);

    offsetX += larguraTexto + 8;
  }
}

// Tela de Menu Inicial
function desenharTelaMenu() {
  ctx.fillStyle = "rgba(10, 13, 18, 0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PONG ROGUELIKE", canvas.width / 2, 180);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Inspirado em Balatro e Ultrapool", canvas.width / 2, 220);

  ctx.fillStyle = "#34c759";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Pressione ESPAÇO para começar", canvas.width / 2, 310);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "14px Arial";
  ctx.fillText("Controles: W / S ou Setas Cima / Baixo", canvas.width / 2, 360);
}

// Tela de Escolha de Cartas (estilo Balatro)
function desenharTelaEscolha() {
  ctx.fillStyle = "rgba(10, 13, 18, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ESCOLHA UM POWER-UP", canvas.width / 2, 60);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "14px Arial";
  ctx.fillText("Clique em uma carta ou aperte 1, 2 ou 3", canvas.width / 2, 90);

  const larguraCarta = 190;
  const alturaCarta = 250;
  const espaco = 30;
  const inicioX = (canvas.width - (3 * larguraCarta + 2 * espaco)) / 2;
  const yBase = 140;

  for (let i = 0; i < cartasParaEscolha.length; i++) {
    const carta = cartasParaEscolha[i];
    const x = inicioX + i * (larguraCarta + espaco);

    // Efeito de hover: a carta levanta um pouco ao passar o mouse
    const estaComMouse = (
      mouseX >= x &&
      mouseX <= x + larguraCarta &&
      mouseY >= yBase &&
      mouseY <= yBase + alturaCarta
    );
    const y = estaComMouse ? yBase - 12 : yBase;

    // Fundo da carta
    ctx.fillStyle = "#1e242d";
    ctx.fillRect(x, y, larguraCarta, alturaCarta);

    // Borda da carta com a cor do power-up
    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = estaComMouse ? 4 : 2;
    ctx.strokeRect(x, y, larguraCarta, alturaCarta);

    // Número de atalho [1], [2], [3]
    ctx.fillStyle = carta.corBorda;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText("[" + (i + 1) + "]", x + 12, y + 26);

    // Nome do Power-Up
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(carta.nome, x + larguraCarta / 2, y + 60);

    // Linha decorativa
    ctx.strokeStyle = carta.corBorda;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 75);
    ctx.lineTo(x + larguraCarta - 20, y + 75);
    ctx.stroke();

    // Descrição do Power-Up (quebra de linha simples)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "13px Arial";
    desenharTextoComQuebra(carta.descricao, x + larguraCarta / 2, y + 110, larguraCarta - 30, 20);

    // Botão / Instrução de clique
    ctx.fillStyle = estaComMouse ? carta.corBorda : "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(x + 20, y + alturaCarta - 40, larguraCarta - 40, 26);

    ctx.fillStyle = estaComMouse ? "#000000" : "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ESCOLHER", x + larguraCarta / 2, y + alturaCarta - 23);
  }
}

// Função auxiliar para quebrar texto longo nas cartas
function desenharTextoComQuebra(texto, x, y, larguraMaxima, alturaLinha) {
  const palavras = texto.split(" ");
  let linha = "";

  for (let n = 0; n < palavras.length; n++) {
    const linhaTeste = linha + palavras[n] + " ";
    const largura = ctx.measureText(linhaTeste).width;
    if (largura > larguraMaxima && n > 0) {
      ctx.fillText(linha, x, y);
      linha = palavras[n] + " ";
      y += alturaLinha;
    } else {
      linha = linhaTeste;
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
// 7. LOOP PRINCIPAL COM REQUESTANIMATIONFRAME (E DELTA TIME)
// ========================================================

function loop(tempoAtual) {
  // Cálculo simples do Delta Time em segundos
  let dt = (tempoAtual - ultimoTempo) / 1000;
  if (dt > 0.1) dt = 0.1; // Limita o dt caso mude de aba para não bugar a física
  ultimoTempo = tempoAtual;

  atualizar(dt);
  desenhar();

  requestAnimationFrame(loop);
}

// Inicia o loop
requestAnimationFrame(function(tempo) {
  ultimoTempo = tempo;
  loop(tempo);
});

