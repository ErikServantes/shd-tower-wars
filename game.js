
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
    // As constantes de perspectiva foram ajustadas para uma orientação vertical
    const PERSPECTIVE_WIDTH = 0.4;  // Reduzido para comprimir horizontalmente
    const PERSPECTIVE_HEIGHT = 0.5; // Aumentado para esticar verticalmente

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
        // A fórmula de projeção isométrica cria a vista 2.5D
        let isoX = (col - row) * (tileSize * PERSPECTIVE_WIDTH);
        let isoY = (col + row) * (tileSize * PERSPECTIVE_HEIGHT / 2); // O divisor / 2 achata a perspetiva para ser mais "top-down"
        return {
            x: isoX + canvas.width / 2, // Centra a grelha horizontalmente
            y: isoY + 50 // Adiciona um offset vertical para a grelha começar mais abaixo
        };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Adiciona um fundo à grelha para contraste
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const { x, y } = toIso(col, row);
                const isPath = path.some(p => p.x === col && p.y === row);
                const isPlayerSide = row >= gridRows / 2;
                drawTile(x, y, isPath, isPlayerSide);
            }
        }
        log("Grelha desenhada com nova orientação vertical.");
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
            ctx.fillStyle = "#3c5a78"; // Cor do caminho mais clara
        } else {
            // Cores mais vivas para as áreas do jogador e inimigo
            ctx.fillStyle = isPlayerSide ? "#2ecc71" : "#e74c3c";
        }
        ctx.globalAlpha = 0.5; // Adiciona transparência para um look mais suave
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "rgba(255,255,255,0.05)"; // Contorno subtil
        ctx.stroke();
    }
    
    // ... (restante do código permanece igual)
    // ============== LÓGICA DE CONSTRUÇÃO, CLASSES, GAMELOOP, ETC. ==============

    // NOVA FUNÇÃO: Converte coordenadas do ecrã para a grelha
    function screenToGrid(screenX, screenY) {
        const TILE_W_HALF = tileSize * PERSPECTIVE_WIDTH;
        const TILE_H_HALF = tileSize * PERSPECTIVE_HEIGHT / 2; // Usar a mesma escala de toIso
        
        // Ajusta para a origem da grelha (centro do canvas + offset Y)
        const mapX = screenX - (canvas.width / 2);
        const mapY = screenY - 50;

        // Converte de volta para coordenadas da grelha (inverso de toIso)
        const row = (mapY / TILE_H_HALF - mapX / TILE_W_HALF) / 2;
        const col = (mapX / TILE_W_HALF + mapY / TILE_H_HALF) / 2;

        return { col: Math.round(col), row: Math.round(row) };
    }

    // ============== CLASSES: MONSTROS E TORRES ==============\n    let monsters = [];
    let towers = [];
    let gameStarted = false;

    class Monster {
        constructor() {
            this.pathIndex = 0;
            const startPos = toIso(path[this.pathIndex].x, path[this.pathIndex].y);
            this.x = startPos.x;
            this.y = startPos.y + (tileSize * PERSPECTIVE_HEIGHT); // Ajustar a altura do monstro
            this.speed = 25; // Velocidade em pixeis por segundo
            this.radius = 8;
            this.maxHealth = 100;
            this.health = this.maxHealth;
            log('Novo monstro criado na posição inicial.');
        }

        takeDamage(amount) {
            this.health -= amount;
            log(`Monstro sofreu ${amount} de dano, vida restante: ${this.health}`);
        }

        move(deltaTime) {
            if (this.pathIndex < path.length - 1) {
                const targetNode = path[this.pathIndex + 1];
                const targetPos = toIso(targetNode.x, targetNode.y);
                targetPos.y += (tileSize * PERSPECTIVE_HEIGHT); // Ajustar altura do alvo

                const dx = targetPos.x - this.x;
                const dy = targetPos.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.speed * deltaTime) {
                    this.pathIndex++;
                    this.x = targetPos.x;
                    this.y = targetPos.y;
                } else {
                    this.x += (dx / distance) * this.speed * deltaTime;
                    this.y += (dy / distance) * this.speed * deltaTime;
                }
            }
        }

        draw() {
            // Desenha o monstro
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f'; // Cor do monstro mais visível
            ctx.fill();

            // Desenha a barra de vida
            const healthBarWidth = 20;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#e74c3c'; // Fundo vermelho
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 10, healthBarWidth, 5);
            ctx.fillStyle = '#2ecc71'; // Vida verde
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
            ctx.fillStyle = "#3498db"; // Cor azul clara para a torre
            ctx.beginPath();
            // Desenha uma forma de torre simples
            ctx.rect(this.x - 8, this.y - 16, 16, 16);
            ctx.fill();
        }

        findTarget(monsterList) {
            if (this.target && this.target.health > 0) {
                const monsterGridPos = path[this.target.pathIndex];
                const dist = Math.sqrt(Math.pow(this.col - monsterGridPos.x, 2) + Math.pow(this.row - monsterGridPos.y, 2));
                if (dist <= this.range) return; // Mantém o alvo
            }
            this.target = null;
            let closestDist = Infinity;

            for (const monster of monsterList) {
                const monsterGridPos = path[monster.pathIndex];
                const dist = Math.sqrt(Math.pow(this.col - monsterGridPos.x, 2) + Math.pow(this.row - monsterGridPos.y, 2));
                if (dist <= this.range && dist < closestDist) {
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
                 // Efeito visual do tiro
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 8);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.strokeStyle = '#ecf0f1';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    // ============== LÓGICA DE CONSTRUÇÃO ==============\n
    canvas.addEventListener('click', (e) => {
        if (!gameStarted) return; // Não permite construir antes de o jogo começar
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const { col, row } = screenToGrid(clickX, clickY);
        log(`Clique detetado nas coordenadas [${clickX}, ${clickY}] -> Grelha [${Math.round(col)}, ${Math.round(row)}]`);

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
        setInterval(() => monsters.push(new Monster()), 5000); // Gera um novo monstro a cada 5s
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    
    log('DOM pronto. Inicializando o jogo.');
    resize(); // Chama resize para configurar o canvas e desenhar a grelha inicial
    updateGold(0); // Força a atualização inicial do HUD

});
