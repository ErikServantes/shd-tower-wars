
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
    const PERSPECTIVE_WIDTH = 0.7;
    const PERSPECTIVE_HEIGHT = 0.6;

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

    // ============== LÓGICA DE GRELHA E PERSPETIVA ==============

    function resize() {
        log('Redimensionando o canvas...');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        log(`Canvas redimensionado para ${canvas.width}x${canvas.height}`);
        drawGrid(); // Desenha a grelha sempre que o tamanho da janela muda
    }
    window.addEventListener('resize', resize);

    function toIso(col, row) {
        let isoX = (col - row) * (tileSize * PERSPECTIVE_WIDTH);
        let isoY = (col + row) * (tileSize * PERSPECTIVE_HEIGHT);
        return {
            x: isoX + canvas.width / 2,
            y: isoY + 20
        };
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
        log("Grelha desenhada.");
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

    // NOVA FUNÇÃO: Converte coordenadas do ecrã para a grelha
    function screenToGrid(screenX, screenY) {
        const TILE_W_HALF = tileSize * PERSPECTIVE_WIDTH;
        const TILE_H_HALF = tileSize * PERSPECTIVE_HEIGHT;

        // Ajusta para a origem da grelha (centro do canvas + offset Y)
        const mapX = screenX - (canvas.width / 2);
        const mapY = screenY - 20; // O mesmo offset Y da função toIso

        // Converte de volta para coordenadas da grelha
        const col = Math.round((mapX / TILE_W_HALF + mapY / TILE_H_HALF) / 2);
        const row = Math.round((mapY / TILE_H_HALF - mapX / TILE_W_HALF) / 2);

        return { col, row };
    }

    // ============== CLASSES: MONSTROS E TORRES ==============
    let monsters = [];
    let towers = [];
    let gameStarted = false;

    class Monster {
        constructor() {
            this.pathIndex = 0;
            const startPos = toIso(path[this.pathIndex].x, path[this.pathIndex].y);
            this.x = startPos.x;
            this.y = startPos.y;
            this.speed = 1.5;
            this.radius = 8;
            this.maxHealth = 100;
            this.health = this.maxHealth;
            log('Novo monstro criado na posição inicial.');
        }

        takeDamage(amount) {
            this.health -= amount;
            log(`Monstro sofreu ${amount} de dano, vida restante: ${this.health}`);
        }

        move() {
            if (this.pathIndex < path.length - 1) {
                const targetNode = path[this.pathIndex + 1];
                const targetPos = toIso(targetNode.x, targetNode.y);

                const dx = targetPos.x - this.x;
                const dy = targetPos.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.speed) {
                    this.pathIndex++;
                    this.x = targetPos.x;
                    this.y = targetPos.y;
                } else {
                    this.x += (dx / distance) * this.speed;
                    this.y += (dy / distance) * this.speed;
                }
            }
        }

        draw() {
            // Desenha o monstro
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();

            // Desenha a barra de vida
            const healthBarWidth = 20;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#ff0000'; // Fundo vermelho
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 10, healthBarWidth, 5);
            ctx.fillStyle = '#00ff00'; // Vida verde
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 10, healthBarWidth * healthPercentage, 5);
        }
    }

    class Tower {
        constructor(col, row) {
            const pos = toIso(col, row);
            this.x = pos.x;
            this.y = pos.y + (tileSize * PERSPECTIVE_HEIGHT); // Ajusta para a base do tile
            this.col = col;
            this.row = row;

            this.range = 3; // Alcance em tiles
            this.damage = 10;
            this.fireRate = 1; // 1 tiro por segundo
            this.fireCooldown = 0;
            this.target = null;

            log(`Torre construída em [${col}, ${row}]`);
        }

        draw() {
            ctx.fillStyle = "#0000ff"; // Cor azul para a torre
            ctx.beginPath();
            ctx.arc(this.x, this.y - 10, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        findTarget(monsterList) {
            if (this.target && this.target.health > 0) {
                // Verifica se o alvo ainda está no alcance
                const monsterGridPos = path[this.target.pathIndex];
                const dist = Math.sqrt(Math.pow(this.col - monsterGridPos.x, 2) + Math.pow(this.row - monsterGridPos.y, 2));
                if (dist <= this.range) return; // Mantém o alvo
            }
            this.target = null;
            let closestDist = this.range + 1;

            for (const monster of monsterList) {
                const monsterGridPos = path[monster.pathIndex];
                const dist = Math.sqrt(Math.pow(this.col - monsterGridPos.x, 2) + Math.pow(this.row - monsterGridPos.y, 2));
                if (dist < closestDist) {
                    closestDist = dist;
                    this.target = monster;
                }
            }
        }

        attack(deltaTime) {
            this.fireCooldown -= deltaTime;
            if (this.fireCooldown <= 0 && this.target) {
                this.target.takeDamage(this.damage);
                this.fireCooldown = 1 / this.fireRate; // Reinicia o cooldown
            }
        }
    }

    // ============== LÓGICA DE CONSTRUÇÃO ==============

    canvas.addEventListener('click', (e) => {
        if (!gameStarted) return; // Não permite construir antes de o jogo começar
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const { col, row } = screenToGrid(clickX, clickY);
        log(`Clique detetado nas coordenadas [${clickX}, ${clickY}] -> Grelha [${col}, ${row}]`);

        // Validações para construir
        const TOWER_COST = 100;
        const isPlayerSide = row >= gridRows / 2;
        const isPath = path.some(p => p.x === col && p.y === row);
        const isOccupied = towers.some(t => t.col === col && t.row === row);

        if (!isPlayerSide) {
            log('Falha ao construir: Fora da área do jogador.');
            return;
        }
        if (isPath) {
            log('Falha ao construir: Não pode construir no caminho.');
            return;
        }
        if (isOccupied) {
            log('Falha ao construir: Já existe uma torre no local.');
            return;
        }
        if (gold < TOWER_COST) {
            log(`Falha ao construir: Ouro insuficiente (Custo: ${TOWER_COST}, Ouro: ${gold})`);
            return;
        }

        // Se todas as validações passarem
        updateGold(-TOWER_COST);
        towers.push(new Tower(col, row));
    });


    // ============== CICLO DE JOGO (GAMELOOP) ==============\n    let lastTime = 0;

    function gameLoop(timestamp) {
        if (!gameStarted) return;
        const deltaTime = (timestamp - lastTime) / 1000; // Tempo em segundos
        lastTime = timestamp;

        // 1. Limpa e desenha a grelha
        drawGrid();

        // 2. Desenha as torres
        towers.forEach(tower => tower.draw());

        // 3. Atualiza, move e desenha monstros
        monsters.forEach(monster => {
            monster.move(deltaTime);
            monster.draw();
        });

        // 4. Lógica de ataque das torres
        towers.forEach(tower => {
            tower.findTarget(monsters);
            tower.attack(deltaTime);
        });

        // 5. Remove monstros mortos
        monsters = monsters.filter(monster => monster.health > 0);

        requestAnimationFrame(gameLoop);
    }

    startButton.addEventListener('click', () => {
        if (gameStarted) return;
        gameStarted = true;
        startButton.style.display = 'none';
        log('O jogo começou!');
        // Spawn de um monstro para teste inicial
        monsters.push(new Monster());
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    
    log('DOM pronto. Inicializando o jogo.');
    resize(); // Chama resize para configurar o canvas e desenhar a grelha inicial
    updateGold(0); // Força a atualização inicial do HUD

});
