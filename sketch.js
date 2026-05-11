// Sankey interativo

const TOTAL_CLIENTES = 14569000;

// Cores dos clusters (ate 10)
const CORES = [
  [46, 160, 110],  [60, 180, 140],  [80, 170, 190],
  [100, 140, 200], [130, 120, 200], [160, 110, 180],
  [190, 100, 140], [200, 120, 90],  [210, 150, 70],
  [180, 170, 60],
];

// Classes

class SankeyNode {
  constructor(id, col, label, value, cor) {
    this.id = id;
    this.col = col;
    this.label = label;
    this.value = value;
    this.cor = cor;
    this.x = 0;
    this.y = 0;
    this.w = 22;
    this.h = 0;
  }

  display(hovered) {
    push();
    translate(this.x, this.y);

    noStroke();
    fill(this.cor[0], this.cor[1], this.cor[2], hovered ? 255 : 200);
    rect(0, 0, this.w, this.h, 3);

    // Label e valor
    let dir = this.col >= 2 ? 1 : -1;
    let ax = this.col >= 2 ? this.w + 8 : -8;
    textAlign(this.col >= 2 ? LEFT : RIGHT, CENTER);

    fill(50);
    textSize(14);
    textStyle(BOLD);
    text(this.label, ax, this.h / 2 - 8);

    fill(120);
    textSize(11);
    textStyle(NORMAL);
    text(formatNum(this.value), ax, this.h / 2 + 9);

    pop();
  }

  contains(mx, my) {
    let x1 = this.col >= 2 ? this.x : this.x - 90;
    let x2 = this.col >= 2 ? this.x + this.w + 90 : this.x + this.w;
    return mx >= x1 && mx <= x2 && my >= this.y && my <= this.y + this.h;
  }
}

class SankeyLink {
  constructor(src, dst, val, cor) {
    this.src = src;
    this.dst = dst;
    this.val = val;
    this.cor = cor;
    this.srcX = 0;
    this.srcY = 0;
    this.srcH = 0;
    this.dstX = 0;
    this.dstY = 0;
    this.dstH = 0;
  }

  display(hovered) {
    noStroke();
    fill(this.cor[0], this.cor[1], this.cor[2], hovered ? 100 : 45);

    let cpX = (this.srcX + this.dstX) / 2;

    // Curva bezier com bordas verticais
    beginShape();
    vertex(this.srcX, this.srcY);
    for (let t = 0; t <= 1; t += 0.05) {
      vertex(
        bezierPoint(this.srcX, cpX, cpX, this.dstX, t),
        bezierPoint(this.srcY, this.srcY, this.dstY, this.dstY, t)
      );
    }
    vertex(this.dstX, this.dstY);
    vertex(this.dstX, this.dstY + this.dstH);
    for (let t = 1; t >= 0; t -= 0.05) {
      vertex(
        bezierPoint(this.srcX, cpX, cpX, this.dstX, t),
        bezierPoint(this.srcY + this.srcH, this.srcY + this.srcH,
                    this.dstY + this.dstH, this.dstY + this.dstH, t)
      );
    }
    vertex(this.srcX, this.srcY + this.srcH);
    endShape(CLOSE);
  }

  contains(mx, my) {
    if (mx < this.srcX || mx > this.dstX) return false;
    let t = (mx - this.srcX) / (this.dstX - this.srcX);
    let topY = lerp(this.srcY, this.dstY, t);
    let botY = lerp(this.srcY + this.srcH, this.dstY + this.dstH, t);
    return my >= topY && my <= botY;
  }
}

class Slider {
  constructor(x, y, w, label, minVal, maxVal, val, formatFn) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.label = label;
    this.minVal = minVal;
    this.maxVal = maxVal;
    this.val = val;
    this.formatFn = formatFn;
    this.dragging = false;
  }

  display() {
    push();
    translate(this.x, this.y);

    // Label
    textAlign(LEFT, BOTTOM);
    textSize(12);
    textStyle(BOLD);
    fill(100);
    text(this.label, 0, -10);

    // Valor
    textAlign(RIGHT, BOTTOM);
    fill(40);
    textSize(15);
    text(this.formatFn(this.val), this.w, -10);

    // Trilho
    stroke(190);
    strokeWeight(3);
    line(0, 0, this.w, 0);

    // Bolinha
    let hx = map(this.val, this.minVal, this.maxVal, 0, this.w);
    noStroke();
    fill(this.dragging ? color(50, 110, 190) : color(80, 140, 210));
    ellipse(hx, 0, 16);

    pop();
  }

  handlePressed(mx, my) {
    let hx = this.x + map(this.val, this.minVal, this.maxVal, 0, this.w);
    if (dist(mx, my, hx, this.y) < 14) this.dragging = true;
  }

  handleDragged(mx) {
    if (!this.dragging) return false;
    this.val = round(map(constrain(mx - this.x, 0, this.w), 0, this.w, this.minVal, this.maxVal));
    return true;
  }

  handleReleased() {
    this.dragging = false;
  }
}

// Estado

let nodes = [];
let links = [];
let hoveredNode = null;
let hoveredLink = null;
let sliderClusters, sliderElig;
let prevNumClusters = 5;
let clusterFade = 1;
let clusterFading = false;
let totalCreditoConcedido = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Inter, Helvetica, Arial, sans-serif");

  sliderClusters = new Slider(60, height - 50, 200, "CLUSTERS", 1, 10, 5, v => v + " clusters");
  sliderElig = new Slider(340, height - 50, 200, "ELEGIVEIS", 1, 100, 13, v => v + "%");

  rebuildDiagram();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sliderClusters.y = height - 50;
  sliderElig.y = height - 50;
  rebuildDiagram();
}

// Gerar nos e links a partir dos sliders

function rebuildDiagram() {
  nodes = [];
  links = [];

  let eligPct = sliderElig.val;
  let numC = sliderClusters.val;
  let eligCount = round(TOTAL_CLIENTES * eligPct / 100);
  let nonEligCount = TOTAL_CLIENTES - eligCount;

  // Nos fixos
  let nTotal = new SankeyNode("total", 0, "Clientes", TOTAL_CLIENTES, [100, 120, 160]);
  let nElig = new SankeyNode("elig", 1, "Elegiveis", eligCount, [60, 140, 200]);
  let nNaoElig = new SankeyNode("nao_elig", 1, "Nao Elegiveis", nonEligCount, [160, 160, 170]);
  nodes.push(nTotal, nElig, nNaoElig);

  links.push(new SankeyLink(nTotal, nElig, eligCount, nElig.cor));
  links.push(new SankeyLink(nTotal, nNaoElig, nonEligCount, nNaoElig.cor));

  // Pesos decrescentes pra distribuir elegiveis
  let weights = [];
  for (let i = 0; i < numC; i++) weights.push(numC - i);
  let totalW = weights.reduce((a, b) => a + b, 0);

  let remaining = eligCount;
  totalCreditoConcedido = 0;

  for (let i = 0; i < numC; i++) {
    let isLast = i === numC - 1;
    let cVal = isLast ? remaining : round(eligCount * weights[i] / totalW);
    remaining -= cVal;

    let cor = CORES[i % CORES.length];
    let nc = new SankeyNode("c" + i, 2, "Cluster " + String.fromCharCode(65 + i), cVal, cor);
    nodes.push(nc);

    // No de limite
    let isUltimo = isLast && numC > 1;
    let limite = isUltimo ? 0 : max(200, round(5000 - i * (4800 / (numC - 1 || 1))));
    let limCor = isUltimo ? [200, 80, 70] : cor;
    let nl = new SankeyNode("lim" + i, 3, isUltimo ? "Sem oferta" : "R$ " + nf(limite, 0, 0), cVal, limCor);
    nodes.push(nl);

    // Somar credito concedido (limite * clientes)
    if (!isUltimo) totalCreditoConcedido += limite * cVal;

    links.push(new SankeyLink(nElig, nc, cVal, cor));
    links.push(new SankeyLink(nc, nl, cVal, limCor));
  }

  calcLayout();
}

// Posicionar nos e links no canvas

function calcLayout() {
  let mTop = 90, mBot = 80, mX = 80, nW = 22, pad = 10;
  let uW = width - 2 * mX;
  let uH = height - mTop - mBot;
  let colSp = uW / 3;

  let columns = [[], [], [], []];
  for (let n of nodes) columns[n.col].push(n);

  for (let c = 0; c < 4; c++) {
    let col = columns[c];
    let totalVal = col.reduce((s, n) => s + n.value, 0);
    let availH = uH - (col.length - 1) * pad;

    let yOff = mTop;
    for (let node of col) {
      node.h = max(12, (node.value / totalVal) * availH);
      node.x = mX + c * colSp - nW / 2;
      node.y = yOff;
      node.w = nW;
      yOff += node.h + pad;
    }

    // Centralizar verticalmente
    let totalH = yOff - pad - mTop;
    let off = (uH - totalH) / 2;
    for (let node of col) node.y += off;
  }

  // Empilhar saidas e entradas dos links
  let outOff = {}, inOff = {};
  for (let n of nodes) { outOff[n.id] = 0; inOff[n.id] = 0; }

  for (let lk of links) {
    let srcOut = links.filter(l => l.src.id === lk.src.id).reduce((s, l) => s + l.val, 0);
    let dstIn = links.filter(l => l.dst.id === lk.dst.id).reduce((s, l) => s + l.val, 0);

    lk.srcH = (lk.val / srcOut) * lk.src.h;
    lk.dstH = (lk.val / dstIn) * lk.dst.h;
    lk.srcX = lk.src.x + lk.src.w;
    lk.srcY = lk.src.y + outOff[lk.src.id];
    lk.dstX = lk.dst.x;
    lk.dstY = lk.dst.y + inOff[lk.dst.id];

    outOff[lk.src.id] += lk.srcH;
    inOff[lk.dst.id] += lk.dstH;
  }
}

// Origem da animacao de expansao (borda direita do no "elig")
function getExpandOriginX() {
  for (let n of nodes) {
    if (n.id === "elig") return n.x + n.w;
  }
  return width / 3;
}

// Verifica se um elemento esta destacado
function isDestaque(n) {
  return n === hoveredNode || (hoveredLink && (hoveredLink.src === n || hoveredLink.dst === n));
}

function isLinkDestaque(lk) {
  return lk === hoveredLink || lk.src === hoveredNode || lk.dst === hoveredNode;
}

// Draw

function draw() {
  background(240, 241, 243);

  // Animacao de expansao dos clusters
  if (clusterFading) {
    clusterFade = min(clusterFade + 0.05, 1);
    if (clusterFade >= 1) clusterFading = false;
  }

  // Detectar hover (nos primeiro, depois links)
  hoveredNode = null;
  hoveredLink = null;
  for (let n of nodes) {
    if (n.contains(mouseX, mouseY)) { hoveredNode = n; break; }
  }
  if (!hoveredNode) {
    for (let lk of links) {
      if (lk.contains(mouseX, mouseY)) { hoveredLink = lk; break; }
    }
  }

  // Titulo (canto esquerdo)
  push();
  noStroke();
  textAlign(LEFT, TOP);
  fill(40);
  textSize(17);
  textStyle(BOLD);
  text("Fluxo de Concessao de Credito Pre-Aprovado", 20, 12);
  fill(140);
  textSize(10);
  textStyle(NORMAL);
  text("Passe o mouse para explorar | Arraste os controles abaixo", 20, 34);
  pop();

  // Total de credito (canto direito)
  push();
  noStroke();
  textAlign(RIGHT, TOP);
  fill(120);
  textSize(10);
  textStyle(NORMAL);
  text("CREDITO CONCEDIDO", width - 20, 12);
  fill(60, 140, 200);
  textSize(18);
  textStyle(BOLD);
  text("R$ " + formatCredito(totalCreditoConcedido), width - 20, 26);
  pop();

  // Titulos das colunas e processos
  let colSp = (width - 160) / 3;
  push();
  noStroke();
  textAlign(CENTER, TOP);

  // Nomes das colunas
  textSize(10);
  textStyle(BOLD);
  fill(140);
  let titles = ["BASE TOTAL", "ELEGIBILIDADE", "CLUSTERS", "LIMITE"];
  for (let c = 0; c < 4; c++) {
    text(titles[c], 80 + c * colSp, 56);
  }

  // Subtitulos entre colunas (processos)
  textSize(11);
  textStyle(BOLD);
  fill(80, 130, 190);
  text("Filtro por flag", 80 + colSp * 0.5, 70);
  text("Clusterizacao por perfil", 80 + colSp * 1.5, 70);
  text("Modelo de otimizacao", 80 + colSp * 2.5, 70);
  pop();

  // Col 0 e 1 (parte esquerda, sem animacao)
  for (let lk of links) { if (lk.dst.col <= 1) lk.display(isLinkDestaque(lk)); }
  for (let n of nodes) { if (n.col <= 1) n.display(isDestaque(n)); }

  // Col 2 e 3 (clusters, com animacao de expansao)
  let originX = getExpandOriginX();
  push();
  translate(originX, 0);
  scale(clusterFade, 1);
  translate(-originX, 0);
  for (let lk of links) { if (lk.dst.col >= 2) lk.display(isLinkDestaque(lk)); }
  for (let n of nodes) { if (n.col >= 2) n.display(isDestaque(n)); }
  pop();

  // Sliders
  sliderClusters.display();
  sliderElig.display();

  // Tooltip
  let tip = hoveredNode || (hoveredLink ? hoveredLink.dst : null);
  if (tip) {
    push();
    let txt = tip.label + " : " + formatNum(tip.value);
    let bw = textWidth(txt) + 30;
    let tx = mouseX + 16;
    if (tx + bw > width - 10) tx = mouseX - bw - 16;

    translate(tx, mouseY - 20);
    fill(255);
    stroke(200);
    strokeWeight(1);
    rect(0, 0, bw, 34, 5);
    noStroke();
    fill(tip.cor[0], tip.cor[1], tip.cor[2]);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text(txt, 10, 17);
    pop();
  }

  cursor((hoveredNode || hoveredLink) ? HAND : ARROW);
}

// Eventos de mouse

function mousePressed() {
  sliderClusters.handlePressed(mouseX, mouseY);
  sliderElig.handlePressed(mouseX, mouseY);
}

function mouseDragged() {
  let changed = false;
  let clusterChanged = false;

  if (sliderClusters.handleDragged(mouseX)) {
    changed = true;
    if (sliderClusters.val !== prevNumClusters) {
      clusterChanged = true;
      prevNumClusters = sliderClusters.val;
    }
  }
  if (sliderElig.handleDragged(mouseX)) changed = true;

  if (changed) {
    rebuildDiagram();
    if (clusterChanged) {
      clusterFade = 0;
      clusterFading = true;
    }
  }
}

function mouseReleased() {
  sliderClusters.handleReleased();
  sliderElig.handleReleased();
}

// Formatar numeros grandes

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}

// Formatar valores de credito (bilhoes/milhoes)
function formatCredito(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " bi";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " mi";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " mil";
  return n.toString();
}
