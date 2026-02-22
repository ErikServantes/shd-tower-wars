
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

    const gridCols = 15;
    const gridRows = 30;

    let gold = 500; // Ouro inicial

    const path = [
        {x: 4, y: 0}, {x: 4, y: 1}, {x: 6, y: 1}, {x: 7, y: 1}, {x: 8, y: 1}, {x: 4, y: 2}, 
        {x: 6, y: 2}, {x: 8, y: 2}, {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}, {x: 8, y: 3}, 
        {x: 8, y: 4}, {x: 8, y: 5}, {x: 9, y: 5}, {x: 10, y: 5}, {x: 11, y: 5}, {x: 12, y: 5}, 
        {x: 13, y: 5}, {x: 2, y: 6}, {x: 3, y: 6}, {x: 4, y: 6}, {x: 5, y: 6}, {x: 6, y: 6}, 
        {x: 13, y: 6}, {x: 2, y: 7}, {x: 6, y: 7}, {x: 13, y: 7}, {x: 2, y: 8}, {x: 6, y: 8}, 
        {x: 13, y: 8}, {x: 2, y: 9}, {x: 6, y: 9}, {x: 7, y: 9}, {x: 8, y: 9}, {x: 9, y: 9}, 
        {x: 10, y: 9}, {x: 11, y: 9}, {x: 12, y: 9}, {x: 13, y: 9}, {x: 2, y: 10}, {x: 2, y: 11}, 
        {x: 2, y: 12}, {x: 2, y: 13}, {x: 3, y: 13}, {x: 4, y: 13}, {x: 5, y: 13}, {x: 6, y: 13}, 
        {x: 7, y: 13}, {x: 7, y: 14}, {x: 7, y: 15}, {x: 7, y: 16}, {x: 8, y: 16}, {x: 9, y: 16}, 
        {x: 10, y: 16}, {x: 11, y: 16}, {x: 12, y: 16}, {x: 12, y: 17}, {x: 12, y: 18}, {x: 12, y: 19}, 
        {x: 2, y: 20}, {x: 3, y: 20}, {x: 4, y: 20}, {x: 5, y: 20}, {x: 6, y: 20}, {x: 7, y: 20}, 
        {x: 8, y: 20}, {x: 9, y: 20}, {x: 12, y: 20}, {x: 2, y: 21}, {x: 9, y: 21}, {x: 12, y: 21}, 
        {x: 2, y: 22}, {x: 9, y: 22}, {x: 12, y: 22}, {x: 2, y: 23}, {x: 9, y: 23}, {x: 10, y: 23}, 
        {x: 11, y: 23}, {x: 12, y: 23}, {x: 2, y: 24}, {x: 3, y: 24}, {x: 4, y: 24}, {x: 5, y: 24}, 
        {x: 6, y: 24}, {x: 7, y: 24}, {x: 7, y: 25}, {x: 3, y: 26}, {x: 4, y: 26}, {x: 5, y: 26}, 
        {x: 7, y: 26}, {x: 3, y: 27}, {x: 5, y: 27}, {x: 7, y: 27}, {x: 3, y: 28}, {x: 5, y: 28}, 
        {x: 6, y: 28}, {x: 7, y: 28}, {x: 3, y: 29}
    ];

    function updateGold(amount) {
        gold += amount;
        goldSpan.textContent = gold;
    }

    // ============== LÓGICA DE GRELHA E PERSPETIVA (1 PONTO) ==============

    function resize() {
        log('Redimensionando o canvas...');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        log(`Canvas redimensionado para ${canvas.width}x${canvas.height}`);
        drawGrid();
    }
    window.addEventListener('resize', resize);

    // Função de projeção de perspetiva de 1 ponto
    function project(col, row) {
        const PERSPECTIVE_STRENGTH = 0.3; // REDUZIDO de 0.7 para 0.3 para uma vista mais de cima
        const Y_TOP = 100;
        const Y_BOTTOM = canvas.height - 50;
        const TOTAL_Y_SPAN = Y_BOTTOM - Y_TOP;
        const WIDTH_BOTTOM = canvas.width * 0.9;
        const WIDTH_TOP = WIDTH_BOTTOM * (1 - PERSPECTIVE_STRENGTH);

        const rowRatio = row / (gridRows - 1);
        const y = Y_TOP + rowRatio * TOTAL_Y_SPAN;
        const width = WIDTH_TOP + rowRatio * (WIDTH_BOTTOM - WIDTH_TOP);
        const tileWidth = width / gridCols;
        const startX = (canvas.width - width) / 2;
        const x = startX + col * tileWidth;

        return { x, y, tileWidth };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < gridRows -1; row++) {
            for (let col = 0; col < gridCols; col++) {
                const isPath = path.some(p => p.x === col && p.y === row);
                const isPlayerSide = row >= gridRows / 2;
                drawTile(isPath, isPlayerSide, col, row);
            }
        }
    }

    // Desenha um tile como um trapézio para a nova projeção
    function drawTile(isPath, isPlayerSide, col, row) {
        const current = project(col, row);
        if (row >= gridRows - 1) return;
        const next = project(col, row + 1);

        ctx.beginPath();
        ctx.moveTo(current.x, current.y); // top-left
        ctx.lineTo(current.x + current.tileWidth, current.y); // top-right
        ctx.lineTo(next.x + next.tileWidth, next.y); // bottom-right
        ctx.lineTo(next.x, next.y); // bottom-left
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

    // Converte coordenadas do ecrã para a nova grelha
    function screenToGrid(screenX, screenY) {
        const PERSPECTIVE_STRENGTH = 0.3; // REDUZIDO de 0.7 para 0.3 para uma vista mais de cima
        const Y_TOP = 100;
        const Y_BOTTOM = canvas.height - 50;
        const TOTAL_Y_SPAN = Y_BOTTOM - Y_TOP;
        const WIDTH_BOTTOM = canvas.width * 0.9;
        const WIDTH_TOP = WIDTH_BOTTOM * (1 - PERSPECTIVE_STRENGTH);

        if (screenY < Y_TOP || screenY > Y_BOTTOM) return { col: -1, row: -1 };
        const yRatio = (screenY - Y_TOP) / TOTAL_Y_SPAN;
        const row = Math.floor(yRatio * (gridRows - 1));

        const rowRatio = row / (gridRows - 1);
        const width = WIDTH_TOP + rowRatio * (WIDTH_BOTTOM - WIDTH_TOP);
        const tileWidth = width / gridCols;
        const startX = (canvas.width - width) / 2;
        const col = Math.floor((screenX - startX) / tileWidth);

        return { col, row };
    }

    function getTileCenter(col, row) {
        const current = project(col, row);
        if (row >= gridRows - 1) {
           return { x: current.x + current.tileWidth / 2, y: current.y };
        }
        const next = project(col, row + 1);
        const midX = ((current.x + current.tileWidth / 2) + (next.x + next.tileWidth / 2)) / 2;
        const midY = (current.y + next.y) / 2;
        return { x: midX, y: midY };
    }

    // ============== CLASSES: MONSTROS E TORRES ==============
    let monsters = [];
    let towers = [];
    let gameStarted = false;

    class Monster {
        constructor() {
            this.pathIndex = 0;
            const startNode = path[this.pathIndex];
            const center = getTileCenter(startNode.x, startNode.y);
            this.x = center.x;
            this.y = center.y;
            this.speed = 80; // Pixels por segundo
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
                const targetCenter = getTileCenter(targetNode.x, targetNode.y);

                const dx = targetCenter.x - this.x;
                const dy = targetCenter.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const moveDistance = this.speed * deltaTime;

                if (distance < moveDistance) {
                    this.pathIndex++;
                    this.x = targetCenter.x;
                    this.y = targetCenter.y;
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
            const center = getTileCenter(col, row);
            this.x = center.x;
            this.y = center.y;
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
            ctx.arc(this.x, this.y - 5, 10, 0, Math.PI * 2);
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
        if (col < 0 || col >= gridCols || row < 0 || row >= gridRows-1) return;

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
    let monsterSpawnCooldown = 3; // Cooldown em segundos

    function gameLoop(timestamp) {
        if (!gameStarted) return;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // Spawning de monstros
        monsterSpawnCooldown -= deltaTime;
        if (monsterSpawnCooldown <= 0) {
            monsters.push(new Monster());
            monsterSpawnCooldown = 3; // Reinicia o cooldown
        }

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
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    
    log('DOM pronto. Inicializando o jogo.');
    resize();
    updateGold(0);

});
