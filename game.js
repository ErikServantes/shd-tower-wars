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
}
window.addEventListener('resize', resize);
resize();

// 3. Conversão "Suave" (Ângulo menos pronunciado)
function toIso(col, row) {
    // Reduzimos o multiplicador horizontal para o mapa não sair do ecrã
    // Aumentamos o peso do 'row' no Y para esticar verticalmente
    let isoX = (col - row) * (tileSize * 0.7);
    let isoY = (col + row) * (tileSize * 0.35); 
    
    // Centralização dinâmica
    return { 
        x: isoX + canvas.width / 2, 
        y: isoY + 50 // Margem pequena no topo
    };
}

// 4. Desenho atualizado
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const pos = toIso(c, r);
            const isPath = path.some(p => p.x === c && p.y === r);
            // A linha divisória está na linha 11 (meio de 22)
            const isPlayerSide = r >= gridRows / 2; 
            
            drawTile(pos.x, pos.y, isPath, isPlayerSide);
        }
    }
}

function drawTile(x, y, isPath, isPlayerSide) {
    const scaledTileSize = tileSize; // Não precisamos mais de `scale`
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaledTileSize * 0.7 * 2, y + scaledTileSize * 0.35 * 2 * 0.5);
    ctx.lineTo(x, y + scaledTileSize * 0.35 * 2);
    ctx.lineTo(x - scaledTileSize * 0.7 * 2, y + scaledTileSize * 0.35 * 2 * 0.5);
    ctx.closePath();

    if (isPath) {
        ctx.fillStyle = "#2c3e50"; // Cor do caminho
    } else {
        ctx.fillStyle = isPlayerSide ? "#27ae6088" : "#c0392b88"; 
    }

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.stroke();
}

function gameLoop() {
    drawGrid();
    requestAnimationFrame(gameLoop);
}

gameLoop();
