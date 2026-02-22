
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const copyLogBtn = document.getElementById('copy-log-btn');
    const debugConsole = document.getElementById('debug-console');

    function log(message) {
        console.log(message);
        const timestamp = new Date().toLocaleTimeString();
        const p = document.createElement('p');
        p.innerHTML = `<strong>${timestamp}:</strong> ${message}`;
        debugConsole.appendChild(p);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }

    log('Script game.js carregado.');

    copyLogBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(debugConsole.innerText)
            .then(() => log('Log copiado para o clipboard!'))
            .catch(err => log('Erro ao copiar log: ' + err));
    });

    // ============== CONFIGURAÇÕES DO JOGO ==============

    const gridCols = 8;
    const gridRows = 22;
    const tileSize = 30;

    // --- NOVA PERSPETIVA 2.5D (Ajuste Agressivo) ---
    const PERSPECTIVE_WIDTH = 0.7;  // Mais estreito
    const PERSPECTIVE_HEIGHT = 0.6; // Muito mais alto para maior profundidade

    const path = [
        {x: 4, y: 0}, {x: 4, y: 1}, {x: 4, y: 2},
        {x: 5, y: 2}, {x: 6, y: 2}, {x: 6, y: 3}, {x: 6, y: 4}, {x: 6, y: 5},
        {x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}, {x: 1, y: 5},
        {x: 1, y: 6}, {x: 1, y: 7}, {x: 1, y: 8}, {x: 1, y: 9},
        {x: 2, y: 9}, {x: 3, y: 9}, {x: 4, y: 9}, {x: 5, y: 9}, {x: 6, y: 9},
        {x: 6, y: 10}, {x: 6, y: 11}, {x: 6, y: 12},
        {x: 5, y: 12}, {x: 4, y: 12}, {x: 3, y: 12},
        {x: 3, y: 13}, {x: 3, y: 14}, {x: 3, y: 15},
        {x: 4, y: 15}, {x: 5, y: 15}, {x: 5, y: 16}, {x: 5, y: 17}, {x: 5, y: 18},
        {x: 4, y: 18}, {x: 4, y: 19}, {x: 4, y: 20}, {x: 4, y: 21}
    ];

    function resize() {
        log('Redimensionando o canvas...');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawGrid();
        log(`Canvas redimensionado para ${canvas.width}x${canvas.height}`);
    }
    window.addEventListener('resize', resize);

    // Função de projeção isométrica MODIFICADA
    function toIso(col, row) {
        let isoX = (col - row) * (tileSize * PERSPECTIVE_WIDTH);
        let isoY = (col + row) * (tileSize * PERSPECTIVE_HEIGHT);
        return { 
            x: isoX + canvas.width / 2, 
            y: isoY + 20 // Puxa a grelha para baixo para começar perto do fundo
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
        const tileWidthHalf = tileSize * PERSPECTIVE_WIDTH;
        const tileHeightHalf = tileSize * PERSPECTIVE_HEIGHT;
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

    const monsters = [];
    let gameStarted = false;

    class Monster {
        constructor() {
            this.pathIndex = 0;
            const startPos = toIso(path[this.pathIndex].x, path[this.pathIndex].y);
            this.x = startPos.x;
            this.y = startPos.y;
            this.speed = 1.5;
            this.radius = 8;
            log('Novo monstro criado na posição inicial.');
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

    startButton.addEventListener('click', () => {
        log('Botão START pressionado.');
        if (!gameStarted) {
            gameStarted = true;
            log('O loop do jogo foi iniciado!');
            gameLoop();
        }
        monsters.push(new Monster());
    });

    function gameLoop() {
        if (!gameStarted) return;
        drawGrid();
        monsters.forEach(monster => {
            monster.move();
            monster.draw();
        });
        requestAnimationFrame(gameLoop);
    }

    log('DOM pronto. Inicializando o jogo.');
    resize();
});
