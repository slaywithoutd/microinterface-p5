// Sankey interativo — p5.js

const TOTAL_CLIENTES = 14569000;

// ── Classes

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

    // Barra
    noStroke();
    if (hovered) {
      fill(this.cor[0], this.cor[1], this.cor[2]);
    } else {
      fill(this.cor[0], this.cor[1], this.cor[2], 200);
    }
    rect(0, 0, this.w, this.h, 3);

    // Texto
    fill(50);
    textSize(14);
    textStyle(BOLD);

    if (this.col >= 2) {
      textAlign(LEFT, CENTER);
      text(this.label, this.w + 8, this.h / 2 - 8);
      textStyle(NORMAL);
      textSize(11);
      fill(120);
      text(formatNum(this.value), this.w + 8, this.h / 2 + 9);
    } else {
      textAlign(RIGHT, CENTER);
      text(this.label, -8, this.h / 2 - 8);
      textStyle(NORMAL);
      textSize(11);
      fill(120);
      text(formatNum(this.value), -8, this.h / 2 + 9);
    }

    pop();
  }

  contains(mx, my) {
    let extra = 90;
    let x1 = this.col >= 2 ? this.x : this.x - extra;
    let x2 = this.col >= 2 ? this.x + this.w + extra : this.x + this.w;
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
    let baseAlpha = hovered ? 100 : 45;
    fill(this.cor[0], this.cor[1], this.cor[2], baseAlpha);

    let cpX = (this.srcX + this.dstX) / 2;

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

    textAlign(LEFT, BOTTOM);
    textSize(12);
    textStyle(BOLD);
    fill(100);
    text(this.label, 0, -10);
    textAlign(RIGHT, BOTTOM);
    fill(40);
    textSize(15);
    text(this.formatFn(this.val), this.w, -10);

    stroke(190);
    strokeWeight(3);
    line(0, 0, this.w, 0);

    let hx = this.getHandleX();
    noStroke();
    fill(this.dragging ? color(50, 110, 190) : color(80, 140, 210));
    ellipse(hx, 0, 16);

    pop();
  }

  getHandleX() {
    return map(this.val, this.minVal, this.maxVal, 0, this.w);
  }

  handlePressed(mx, my) {
    let hx = this.x + this.getHandleX();
    if (dist(mx, my, hx, this.y) < 14) {
      this.dragging = true;
    }
  }

  handleDragged(mx) {
    if (!this.dragging) return false;
    let localX = constrain(mx - this.x, 0, this.w);
    this.val = round(map(localX, 0, this.w, this.minVal, this.maxVal));
    return true;
  }

  handleReleased() {
    this.dragging = false;
  }
}

// ── Cores
const CORES_CLUSTER = [
  [46, 160, 110],  [60, 180, 140],  [80, 170, 190],
  [100, 140, 200], [130, 120, 200], [160, 110, 180],
  [190, 100, 140], [200, 120, 90],  [210, 150, 70],
  [180, 170, 60],
];

// ── Estado
let nodes = [];
let links = [];
let hoveredNode = null;
let hoveredLink = null;
let sliderClusters, sliderElig;
let prevNumClusters = 5;
let clusterFade = 1; // 0 = invisivel, 1 = totalmente visivel
let clusterFading = false; // true = esta no meio de uma animacao

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Inter, Helvetica, Arial, sans-serif");

  sliderClusters = new Slider(60, height - 50, 200,
    "CLUSTERS", 1, 10, 5, v => v + " clusters");
  sliderElig = new Slider(340, height - 50, 200,
    "ELEGIVEIS", 1, 100, 13, v => v + "%");

  rebuildDiagram();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sliderClusters.y = height - 50;
  sliderElig.y = height - 50;
  rebuildDiagram();
}

// ── Gerar dados
function rebuildDiagram() {
  nodes = [];
  links = [];

  let eligPct = sliderElig.val;
  let numC = sliderClusters.val;
  let eligCount = round(TOTAL_CLIENTES * eligPct / 100);
  let nonEligCount = TOTAL_CLIENTES - eligCount;

  let nTotal = new SankeyNode("total", 0, "Clientes", TOTAL_CLIENTES, [100, 120, 160]);
  let nElig = new SankeyNode("elig", 1, "Elegiveis", eligCount, [60, 140, 200]);
  let nNaoElig = new SankeyNode("nao_elig", 1, "Nao Elegiveis", nonEligCount, [160, 160, 170]);
  nodes.push(nTotal, nElig, nNaoElig);

  let weights = [];
  for (let i = 0; i < numC; i++) weights.push(numC - i);
  let totalW = weights.reduce((a, b) => a + b, 0);

  let remaining = eligCount;
  let clusterNodes = [];
  let limitNodes = [];

  for (let i = 0; i < numC; i++) {
    let isLast = i === numC - 1;
    let cVal = isLast ? remaining : round(eligCount * weights[i] / totalW);
    remaining -= cVal;

    let letra = String.fromCharCode(65 + i);
    let cor = CORES_CLUSTER[i % CORES_CLUSTER.length];

    let nc = new SankeyNode("c" + i, 2, "Cluster " + letra, cVal, cor);
    nodes.push(nc);
    clusterNodes.push(nc);

    let isUltimo = isLast && numC > 1;
    let limite = isUltimo ? 0 : max(200, round(5000 - i * (4800 / (numC - 1 || 1))));
    let limLabel = isUltimo ? "Sem oferta" : "R$ " + nf(limite, 0, 0);
    let limCor = isUltimo ? [200, 80, 70] : cor;

    let nl = new SankeyNode("lim" + i, 3, limLabel, cVal, limCor);
    nodes.push(nl);
    limitNodes.push(nl);
  }

  links.push(new SankeyLink(nTotal, nElig, eligCount, nElig.cor));
  links.push(new SankeyLink(nTotal, nNaoElig, nonEligCount, nNaoElig.cor));

  for (let i = 0; i < numC; i++) {
    links.push(new SankeyLink(nElig, clusterNodes[i], clusterNodes[i].value, clusterNodes[i].cor));
    links.push(new SankeyLink(clusterNodes[i], limitNodes[i], limitNodes[i].value, limitNodes[i].cor));
  }

  calcLayout();
}

function calcLayout() {
  let marginTop = 70;
  let marginBottom = 90;
  let marginX = 80;
  let nodeW = 22;
  let padY = 10;
  let usableW = width - 2 * marginX;
  let usableH = height - marginTop - marginBottom;
  let colSpacing = usableW / 3;

  let columns = [[], [], [], []];
  for (let n of nodes) columns[n.col].push(n);

  for (let c = 0; c < 4; c++) {
    let col = columns[c];
    let totalVal = col.reduce((s, n) => s + n.value, 0);
    let totalPad = (col.length - 1) * padY;
    let availH = usableH - totalPad;

    let yOff = marginTop;
    for (let node of col) {
      node.h = max(12, (node.value / totalVal) * availH);
      node.x = marginX + c * colSpacing - nodeW / 2;
      node.y = yOff;
      node.w = nodeW;
      yOff += node.h + padY;
    }

    let totalH = yOff - padY - marginTop;
    let offsetY = (usableH - totalH) / 2;
    for (let node of col) node.y += offsetY;
  }

  // Posicionar links
  let outOff = {};
  let inOff = {};
  for (let n of nodes) { outOff[n.id] = 0; inOff[n.id] = 0; }

  for (let lk of links) {
    let srcTotalOut = links.filter(l => l.src.id === lk.src.id).reduce((s, l) => s + l.val, 0);
    let dstTotalIn = links.filter(l => l.dst.id === lk.dst.id).reduce((s, l) => s + l.val, 0);

    lk.srcH = (lk.val / srcTotalOut) * lk.src.h;
    lk.dstH = (lk.val / dstTotalIn) * lk.dst.h;
    lk.srcX = lk.src.x + lk.src.w;
    lk.srcY = lk.src.y + outOff[lk.src.id];
    lk.dstX = lk.dst.x;
    lk.dstY = lk.dst.y + inOff[lk.dst.id];

    outOff[lk.src.id] += lk.srcH;
    inOff[lk.dst.id] += lk.dstH;
  }
}

// Ponto de origem da expansao (borda direita do no "elig")
function getExpandOriginX() {
  for (let n of nodes) {
    if (n.id === "elig") return n.x + n.w;
  }
  return width / 3;
}

// ── Draw
function draw() {
  background(240, 241, 243);

  // Animar expansao dos clusters
  if (clusterFading) {
    clusterFade = min(clusterFade + 0.05, 1);
    if (clusterFade >= 1) clusterFading = false;
  }

  // Detectar hover
  hoveredNode = null;
  hoveredLink = null;
  for (let n of nodes) {
    if (n.contains(mouseX, mouseY)) {
      hoveredNode = n;
      break;
    }
  }
  if (!hoveredNode) {
    for (let lk of links) {
      if (lk.contains(mouseX, mouseY)) {
        hoveredLink = lk;
        break;
      }
    }
  }

  // Titulo
  push();
  translate(width / 2, 0);
  textAlign(CENTER, TOP);
  noStroke();
  fill(40);
  textSize(19);
  textStyle(BOLD);
  text("Fluxo de Concessao de Credito Pre-Aprovado", 0, 12);
  textSize(12);
  textStyle(NORMAL);
  fill(140);
  text("Passe o mouse para explorar | Arraste os controles abaixo", 0, 38);
  pop();

  // Titulos das colunas
  let titles = ["BASE TOTAL", "ELEGIBILIDADE", "CLUSTERS", "LIMITE"];
  push();
  textSize(11);
  textStyle(BOLD);
  fill(150);
  textAlign(CENTER, TOP);
  noStroke();
  for (let c = 0; c < 4; c++) {
    text(titles[c], 80 + c * ((width - 160) / 3), 54);
  }
  pop();

  // Desenhar elementos da esquerda (col 0 e 1) normalmente
  for (let lk of links) {
    if (lk.dst.col <= 1) {
      let destaque = lk.src === hoveredNode || lk.dst === hoveredNode || lk === hoveredLink;
      lk.display(destaque);
    }
  }
  for (let n of nodes) {
    if (n.col <= 1) {
      let destaque = n === hoveredNode ||
                     (hoveredLink && (hoveredLink.src === n || hoveredLink.dst === n));
      n.display(destaque);
    }
  }

  // Desenhar clusters (col 2+) com animacao de expansao
  let originX = getExpandOriginX();
  push();
  translate(originX, 0);
  scale(clusterFade, 1);
  translate(-originX, 0);

  for (let lk of links) {
    if (lk.dst.col >= 2) {
      let destaque = lk.src === hoveredNode || lk.dst === hoveredNode || lk === hoveredLink;
      lk.display(destaque);
    }
  }
  for (let n of nodes) {
    if (n.col >= 2) {
      let destaque = n === hoveredNode ||
                     (hoveredLink && (hoveredLink.src === n || hoveredLink.dst === n));
      n.display(destaque);
    }
  }
  pop();

  // Sliders
  sliderClusters.display();
  sliderElig.display();

  // Tooltip
  let tooltipNode = hoveredNode;
  if (!tooltipNode && hoveredLink) {
    tooltipNode = hoveredLink.dst;
  }

  if (tooltipNode) {
    push();
    let txt = tooltipNode.label + " : " + formatNum(tooltipNode.value);
    let bw = textWidth(txt) + 30;
    let tx = mouseX + 16;
    let ty = mouseY - 20;
    if (tx + bw > width - 10) tx = mouseX - bw - 16;

    translate(tx, ty);
    fill(255);
    stroke(200);
    strokeWeight(1);
    rect(0, 0, bw, 34, 5);
    noStroke();
    fill(tooltipNode.cor[0], tooltipNode.cor[1], tooltipNode.cor[2]);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text(txt, 10, 17);
    pop();
  }

  cursor((hoveredNode || hoveredLink) ? HAND : ARROW);
}

// ── Eventos de mouse
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
      // Comeca a animacao de fade-in nos clusters novos
      clusterFade = 0;
      clusterFading = true;
      applyClusterFade();
    }
  }
}

function mouseReleased() {
  sliderClusters.handleReleased();
  sliderElig.handleReleased();
}

// ── Helper
function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}
