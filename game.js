
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const copyLogBtn = document.getElementById('copy-log-btn');
    const debugConsole = document.getElementById('debug-console');
    const goldSpan = document.getElementById('gold'); // Elemento do ouro no HUD

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
    
    // Fatores da nova projeção oblíqua
    const TILE_WIDTH = tileSize * 1.5;
    const TILE_HEIGHT = tileSize * 0.7;
    const SHEAR_FACTOR = 0.5; // Fator de inclinação para o efeito 3D

    let gold = 500; // Ouro inicial

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

    function updateGold(amount) {
        gold += amount;
        goldSpan.textContent = gold;
    }

    // ============== LÓGICA DE GRELHA E PERSPETIVA (OBLÍQUA) ==============

    function resize() {
        log('Redimensionando o canvas...');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        log(`Canvas redimensionado para ${canvas.width}x${canvas.height}`);
        drawGrid();
    }
    window.addEventListener('resize', resize);

    // Função de projeção OBLÍQUA para alinhar a grelha verticalmente
    function toIso(col, row) {
        const shearAmount = TILE_WIDTH * SHEAR_FACTOR;
        const screenX = col * TILE_WIDTH - row * shearAmount;
        const screenY = row * TILE_HEIGHT;

        // Centraliza a grelha
        const totalGridWidth = (gridCols - 1) * TILE_WIDTH;
        const offsetX = (canvas.width - totalGridWidth) / 2;

        return { x: screenX + offsetX, y: screenY + 100 };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const { x, y } = toIso(col, row);
                const isPath = path.some(p => p.x === col && p.y === row);
                const isPlayerSide = row >= gridRows / 2;
                drawTile(x, y, isPath, isPlayerSide);
            }
        }
    }

    // Desenha um tile como um paralelogramo para a projeção oblíqua
    function drawTile(x, y, isPath, isPlayerSide) {
        const shearAmount = TILE_WIDTH * SHEAR_FACTOR;
        
        ctx.beginPath();
        ctx.moveTo(x, y); // Canto superior esquerdo
        ctx.lineTo(x + TILE_WIDTH, y); // Canto superior direito
        ctx.lineTo(x + TILE_WIDTH - shearAmount, y + TILE_HEIGHT); // Canto inferior direito
        ctx.lineTo(x - shearAmount, y + TILE_HEIGHT); // Canto inferior esquerdo
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

    // Converte coordenadas do ecrã para a nova grelha oblíqua
    function screenToGrid(screenX, screenY) {
        const shearAmount = TILE_WIDTH * SHEAR_FACTOR;
        
        const totalGridWidth = (gridCols-1) * TILE_WIDTH;
        const offsetX = (canvas.width - totalGridWidth) / 2;
        const relativeX = screenX - offsetX;
        const relativeY = screenY - 100;

        // Inverte a fórmula de projeção
        const row = Math.round(relativeY / TILE_HEIGHT);
        const col = Math.round((relativeX + row * shearAmount) / TILE_WIDTH);

        return { col, row };
    }

    // ============== CLASSES: MONSTROS E TORRES ==============
    let monsters = [];
    let towers = [];
    let gameStarted = false;

    class Monster {
        constructor() {
            this.pathIndex = 0;
            const startNode = path[this.pathIndex];
            const startPos = toIso(startNode.x, startNode.y);
            // Posiciona o monstro no centro do tile
            this.x = startPos.x + (TILE_WIDTH / 2) - (TILE_WIDTH * SHEAR_FACTOR / 2);
            this.y = startPos.y + (TILE_HEIGHT / 2);
            this.speed = 40; // Pixels por segundo
            this.radius = 8;
            this.maxHealth = 100;
            this.health = this.maxHealth;
        }

        takeDamage(amount) {
            this.health -= amount;
        }

        move(deltaTime) {
            if (this.pathIndex < path.length - 1) {
                const targetNode = path[this.pathIndex + 1];
                const targetPosRaw = toIso(targetNode.x, targetNode.y);
                const targetX = targetPosRaw.x + (TILE_WIDTH / 2) - (TILE_WIDTH * SHEAR_FACTOR / 2);
                const targetY = targetPosRaw.y + (TILE_HEIGHT / 2);

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const moveDistance = this.speed * deltaTime;

                if (distance < moveDistance) {
                    this.pathIndex++;
                    this.x = targetX;
                    this.y = targetY;
                } else {
                    this.x += (dx / distance) * moveDistance;
                    this.y += (dy / distance) * moveDistance;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            
            const healthBarWidth = 20;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 10, healthBarWidth, 5);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 10, healthBarWidth * healthPercentage, 5);
        }
    }

    class Tower {
        constructor(col, row) {
            const pos = toIso(col, row);
            this.x = pos.x + (TILE_WIDTH / 2) - (TILE_WIDTH * SHEAR_FACTOR / 2);
            this.y = pos.y + (TILE_HEIGHT / 2);
            this.col = col;
            this.row = row;

            this.range = 150; // Alcance em pixels
            this.damage = 10;
            this.fireRate = 1; // 1 tiro por segundo
            this.fireCooldown = 0;
            this.target = null;
        }

        draw() {
            ctx.fillStyle = "#0000ff";
            ctx.beginPath();
            ctx.arc(this.x, this.y - 10, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        findTarget(monsterList) {
            this.target = null;
            let closestDist = this.range + 1;

            for (const monster of monsterList) {
                const dist = Math.sqrt(Math.pow(this.x - monster.x, 2) + Math.pow(this.y - monster.y, 2));
                if (dist < closestDist) {
                    closestDist = dist;
                    this.target = monster;
                }
            }
        }

        attack(deltaTime) {
            this.fireCooldown -= deltaTime;
            if (this.fireCooldown <= 0 && this.target && this.target.health > 0) {
                this.target.takeDamage(this.damage);
                this.fireCooldown = 1 / this.fireRate;
            }
        }
    }

    // ============== LÓGICA DE CONSTRUÇÃO ==============

    canvas.addEventListener('click', (e) => {
        if (!gameStarted) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const { col, row } = screenToGrid(clickX, clickY);
        log(`Clique na grelha [${col}, ${row}]`);

        const TOWER_COST = 100;
        if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return;

        const isPlayerSide = row >= gridRows / 2;
        const isPath = path.some(p => p.x === col && p.y === row);
        const isOccupied = towers.some(t => t.col === col && t.row === row);

        if (!isPlayerSide) { log('Não pode construir fora da sua área.'); return; }
        if (isPath) { log('Não pode construir no caminho.'); return; }
        if (isOccupied) { log('Já existe uma torre aí.'); return; }
        if (gold < TOWER_COST) { log('Ouro insuficiente.'); return; }

        updateGold(-TOWER_COST);
        towers.push(new Tower(col, row));
    });

    // ============== CICLO DE JOGO (GAMELOOP) ==============
    let lastTime = 0;

    function gameLoop(timestamp) {
        if (!gameStarted) return;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        drawGrid();
        towers.forEach(tower => tower.draw());
        
        monsters.forEach(monster => {
            monster.move(deltaTime);
            monster.draw();
        });

        towers.forEach(tower => {
            tower.findTarget(monsters);
            tower.attack(deltaTime);
        });

        monsters = monsters.filter(monster => monster.health > 0);

        requestAnimationFrame(gameLoop);
    }

    startButton.addEventListener('click', () => {
        if (gameStarted) return;
        gameStarted = true;
        startButton.style.display = 'none';
        log('O jogo começou!');
        monsters.push(new Monster());
        setInterval(() => monsters.push(new Monster()), 3000);
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    
    log('DOM pronto. Inicializando o jogo.');
    resize();
    updateGold(0);

});
