// Firebase foi comentado anteriormente para evitar erros de inicialização

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 1. Configuração para ecrã vertical (Mobile)
const gridCols = 8;  // Mais estreito
const gridRows = 22; // Mais comprido
const tileSize = 30; // Ajusta conforme o ecrã

// 2. Caminho que serpenteia de CIMA para BAIXO
const path = [
    // Topo (Base Inimiga)
    {x: 4, y: 0}, {x: 4, y: 1}, {x: 4, y: 2},
    // Primeira curva (S para a direita)
    {x: 5, y: 2}, {x: 6, y: 2}, {x: 6, y: 3}, {x: 6, y: 4}, {x: 6, y: 5},
    // Segunda curva (S para a esquerda)
    {x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}, {x: 1, y: 5},
    {x: 1, y: 6}, {x: 1, y: 7}, {x: 1, y: 8}, {x: 1, y: 9},
    // Terceira curva (Volta ao centro/direita)
    {x: 2, y: 9}, {x: 3, y: 9}, {x: 4, y: 9}, {x: 5, y: 9}, {x: 6, y: 9},
    {x: 6, y: 10}, {x: 6, y: 11}, {x: 6, y: 12}, // ATRAVESSA O MEIO
    {x: 5, y: 12}, {x: 4, y: 12}, {x: 3, y: 12},
    {x: 3, y: 13}, {x: 3, y: 14}, {x: 3, y: 15},
    {x: 4, y: 15}, {x: 5, y: 15}, {x: 5, y: 16}, {x: 5, y: 17}, {x: 5, y: 18},
    {x: 4, y: 18}, {x: 4, y: 19}, {x: 4, y: 20}, {x: 4, y: 21} // Fundo (Tua Base)
];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid(); // Redesenha a grelha sempre que a janela muda de tamanho
}
window.addEventListener('resize', resize);


function toIso(col, row) {
    let isoX = (col - row) * (tileSize * 0.7);
    let isoY = (col + row) * (tileSize * 0.35); 
    return { 
        x: isoX + canvas.width / 2, 
        y: isoY + 50
    };
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const pos = toIso(c, r);
            const isPath = path.some(p => p.x === c && p.y === r);
            const isPlayerSide = r >= gridRows / 2; 
            drawTile(pos.x, pos.y, isPath, isPlayerSide);
        }
    }
}

function drawTile(x, y, isPath, isPlayerSide) {
    const tileWidthHalf = tileSize * 0.7;
    const tileHeightHalf = tileSize * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tileWidthHalf, y + tileHeightHalf);
    ctx.lineTo(x, y + tileHeightHalf * 2);
    ctx.lineTo(x - tileWidthHalf, y + tileHeightHalf);
    ctx.closePath();
    if (isPath) {
        ctx.fillStyle = "#2c3e50";
    } else {
        ctx.fillStyle = isPlayerSide ? "#27ae6088" : "#c0392b88"; 
    }
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.stroke();
}

// ============== FASE 2: ENTIDADES E MOVIMENTO ==============

const monsters = [];
let gameStarted = false;

class Monster {
    constructor() {
        this.pathIndex = 0;
        const startPos = toIso(path[this.pathIndex].x, path[this.pathIndex].y);
        this.x = startPos.x;
        this.y = startPos.y;
        this.speed = 1.5; // Velocidade de movimento
        this.radius = 8; // Tamanho do monstro
    }

    move() {
        if (this.pathIndex >= path.length - 1) return;

        const targetGridPos = path[this.pathIndex + 1];
        const targetIsoPos = toIso(targetGridPos.x, targetGridPos.y);

        const dx = targetIsoPos.x - this.x;
        const dy = targetIsoPos.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            // Para garantir que não ultrapassa o fim do caminho
            if(this.pathIndex >= path.length) {
                this.pathIndex = path.length - 1;
                return;
            }
            const nextGridPos = path[this.pathIndex];
            const nextIsoPos = toIso(nextGridPos.x, nextGridPos.y);
            this.x = nextIsoPos.x;
            this.y = nextIsoPos.y;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
    }
}

document.getElementById('startButton').addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
        gameLoop(); // Inicia o loop do jogo
    }
    monsters.push(new Monster());
});

function gameLoop() {
    if (!gameStarted) return; // Garante que o loop não corre antes do tempo

    drawGrid(); // Limpa e desenha o fundo a cada frame
    
    monsters.forEach(monster => {
        monster.move();
        monster.draw();
    });

    requestAnimationFrame(gameLoop);
}

// Chama resize() uma vez para desenhar o estado inicial
resize();
