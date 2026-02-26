// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Elementos da HUD
    const playerHpSpan = document.getElementById('player-hp');
    const playerGoldSpan = document.getElementById('player-gold');
    const enemyHpSpan = document.getElementById('enemy-hp');
    const enemyGoldSpan = document.getElementById('enemy-gold');
    const roundNumberSpan = document.getElementById('round-number');
    const timerDisplaySpan = document.getElementById('timer-display');

    // Botões e Overlays
    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const endGameOverlay = document.getElementById('end-game-overlay');
    const endGameMessage = document.getElementById('end-game-message');
    const replayBtn = document.getElementById('replay-btn');

    function log(message) { console.log(message); }

    // --- Variáveis de Dados do Jogo ---
    let towerData, monsterData;
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // --- Variáveis de Estado do Jogo ---
    const gridCols = 15, gridRows = 30;
    let playerGold = 500, playerHealth = 100, monsters = [], towers = [], playerActions = [], selectedAction = null, hoveredTower = null, projectiles = [];
    let ghost = null, ghostActions = [], ghostGold = 500, ghostHealth = 100, ghostTowers = [], ghostMonsters = [], nextGhostActionIndex = 0;
    let camera;

    // --- Novas Variáveis para Multi-ronda ---
    let currentRound = 1;
    let roundTimer = 120; // 2 minutos por ronda
    let isRoundOver = false;
    let gameLoopTimestamp = null; // Para controlar o requestAnimationFrame
    let lastTime = null; // Variável para controlar o tempo do loop
    let timeWithoutMonsters = 0; // Tempo sem monstros no mapa
    const ROUND_DURATION = 120;
    let gameStarted = false; // Estado para controlar o início do jogo
    let roundGhostActions = []; // Ações do ghost para a ronda atual


    // --- Paths ---
    const ghostPath = (() => { const v = [{x: 4, y: 0}, {x: 4, y: 3}, {x: 6, y: 3}, {x: 6, y: 1}, {x: 8, y: 1}, {x: 8, y: 5}, {x: 13, y: 5}, {x: 13, y: 9}, {x: 6, y: 9}, {x: 6, y: 6}, {x: 2, y: 6}, {x: 2, y: 13}, {x: 7, y: 13}, {x: 7, y: 16}, {x: 12, y: 16}, {x: 12, y: 23}, {x: 9, y: 23}, {x: 8, y: 23}, {x: 8, y: 20}, {x: 1, y: 20}, {x: 1, y: 24}, {x: 6, y: 24}, {x: 6, y: 28}, {x: 8, y: 28}, {x: 8, y: 26}, {x: 10, y: 26}, {x: 10, y: 29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const playerPath = [...ghostPath].reverse();
    const ghostFlyingPath = [{x: 4, y: 0}, {x: 10, y: 29}];
    const playerFlyingPath = [...ghostFlyingPath].reverse();

    class Camera {
        constructor(canvas) { this.canvas = canvas; this.perspective = 0.35; this.verticalScale = 1.0; }
        project(c, r) { const P = this.perspective, Y_T = 0, Y_B = this.canvas.height * this.verticalScale, T_Y = Y_B - Y_T, W_B = this.canvas.width, W_T = W_B * (1 - P), rR = r / (gridRows - 1), y = Y_T + rR * T_Y, w = W_T + rR * (W_B - W_T), tW = w / gridCols, sX = (this.canvas.width - w) / 2, x = sX + c * tW; return { x, y, tileWidth: tW }; }
        screenToGrid(sX, sY) { const P = this.perspective, Y_T = 0, Y_B = this.canvas.height * this.verticalScale, T_Y = Y_B - Y_T, W_B = this.canvas.width, W_T = W_B * (1 - P); if (sY < Y_T || sY > Y_B) return { col: -1, row: -1 }; const rR = (sY - Y_T) / T_Y, row = Math.floor(rR * (gridRows - 1)), w = W_T + rR * (W_B - W_T), tW = w / gridCols, sX_ = (this.canvas.width - w) / 2; if (sX < sX_ || sX > sX_ + w) return { col: -1, row: -1 }; const col = Math.floor((sX - sX_) / tW); return { col, row }; }
        getTileCenter(c, r) { const C = this.project(c, r); if (r >= gridRows - 1) return { x: C.x + C.tileWidth / 2, y: C.y }; const N = this.project(c, r + 1); return { x: (C.x + C.tileWidth / 2 + (N.x + N.tileWidth / 2)) / 2, y: (C.y + N.y) / 2 }; }
    }

    // --- Funções de Atualização da HUD ---
    function updatePlayerGold(amount) { playerGold += amount; playerGoldSpan.textContent = Math.floor(playerGold); }
    function updateGhostGold(amount) { ghostGold += amount; enemyGoldSpan.textContent = Math.floor(ghostGold); }
    function updatePlayerHealth(amount) {
        playerHealth += amount;
        playerHpSpan.textContent = Math.max(0, playerHealth);
        if (playerHealth <= 0) endGame(false); // Game Over imediato se HP chegar a 0
    }
    function updateGhostHealth(amount) {
        ghostHealth += amount;
        enemyHpSpan.textContent = Math.max(0, ghostHealth);
        if (ghostHealth <= 0) endGame(true); // Game Over imediato se HP chegar a 0
    }
    
    // --- Funções de Formatação de Tempo ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}'${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // --- Funções de Desenho ---
    function drawGrid() { ctx.clearRect(0, 0, canvas.width, canvas.height); for (let r = 0; r < gridRows; r++) { for (let c = 0; c < gridCols; c++) { drawTile(ghostPath.some(p => p.x === c && p.y === r), r >= 15, c, r); } } }
    function drawTile(isPath, isPlayerArea, c, r) {
        const C = camera.project(c, r), N = camera.project(c, r + 1);
        if (C.y > canvas.height) return;
        ctx.beginPath();
        ctx.moveTo(C.x, C.y);
        ctx.lineTo(C.x + C.tileWidth, C.y);
        ctx.lineTo(N.x + N.tileWidth, N.y);
        ctx.lineTo(N.x, N.y);
        ctx.closePath();
        ctx.fillStyle = isPath ? "#2c3e50" : isPlayerArea ? "#27ae6088" : "#c0392b88";
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
    function drawGameScene() { if (!camera) return; drawGrid(); towers.forEach(t => t.draw()); ghostTowers.forEach(t => t.draw()); monsters.forEach(m => m.draw()); ghostMonsters.forEach(m => m.draw()); projectiles.forEach(p => p.draw()); if (hoveredTower) { ctx.beginPath(); ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, 2 * Math.PI); ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; ctx.fill(); } if (selectedAction && selectedAction.type === 'tower' && selectedAction.ghostTower.visible) { const { x, y, rangeInPixels, isValid } = selectedAction.ghostTower; ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.fillStyle = isValid ? "rgba(0, 100, 255, 0.5)" : "rgba(255, 0, 0, 0.5)"; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, rangeInPixels, 0, 2 * Math.PI); ctx.fillStyle = isValid ? "rgba(0, 100, 255, 0.2)" : "rgba(255, 0, 0, 0.2)"; ctx.fill(); } }
    function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; drawGameScene(); }

    // --- Classes do Jogo ---
    class Projectile{constructor(x,y,target,damage,owner){this.x=x,this.y=y,this.target=target,this.damage=damage,this.owner=owner,this.speed=400}move(dT){if(!this.target||this.target.health<=0)return;const dX=this.target.x-this.x,dY=this.target.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),moveDist=this.speed*dT;if(dist<moveDist){this.x=this.target.x,this.y=this.target.y}else{this.x+=dX/dist*moveDist,this.y+=dY/dist*moveDist}}draw(){ctx.fillStyle="yellow",ctx.beginPath(),ctx.arc(this.x,this.y,3,0,2*Math.PI),ctx.fill()}}
    class Monster {
        constructor(t, l, p, owner) {
            const c = monsterData[t].levels[l - 1];
            this.type = t; this.level = l; this.isFlying = c.isFlying || false;
            this.path = this.isFlying ? (p === playerPath ? playerFlyingPath : ghostFlyingPath) : p;
            this.pathIndex = 0; this.health = c.health; this.maxHealth = c.health;
            this.speed = c.speed; 
            // Custo do monstro / 10 arredondado para baixo
            this.reward = Math.floor(c.cost / 10); 
            this.owner = owner;
            const s = camera.getTileCenter(this.path[0].x, this.path[0].y);
            this.x = s.x; this.y = s.y; this.reachedEnd = false;
        }
        move(dT) {
            if (this.reachedEnd) return; let moveDist = (this.speed || 0) * dT; if (moveDist <= 0) return;
            while (moveDist > 0 && !this.reachedEnd) {
                if (this.pathIndex >= this.path.length) { this.reachedEnd = true; continue; }
                const targetWaypoint = this.path[this.pathIndex]; const targetCenter = camera.getTileCenter(targetWaypoint.x, targetWaypoint.y);
                const dX = targetCenter.x - this.x; const dY = targetCenter.y - this.y; const distToWaypoint = Math.sqrt(dX * dX + dY * dY);
                if (distToWaypoint < 0.1) { this.pathIndex++; continue; }
                if (moveDist >= distToWaypoint) { this.x = targetCenter.x; this.y = targetCenter.y; this.pathIndex++; moveDist -= distToWaypoint; }
                else { this.x += (dX / distToWaypoint) * moveDist; this.y += (dY / distToWaypoint) * moveDist; moveDist = 0; }
            }
        }
        draw() {
            ctx.fillStyle = this.owner === 'player' ? '#2ecc71' : '#e74c3c'; ctx.beginPath(); ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI); ctx.fill();
            if (this.isFlying) { ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke(); }
            if (this.health < this.maxHealth) { const p = this.y - 20, w = 30, h = 5; ctx.fillStyle = "#444"; ctx.fillRect(this.x - w / 2, p, w, h); ctx.fillStyle = "#0f0"; ctx.fillRect(this.x - w / 2, p, w * (this.health / this.maxHealth), h) }
        }
    }
    class Tower {
        constructor(t, l, c, r, owner) {
            const d = towerData[t].levels[l - 1];
            this.type = t; this.level = l; this.col = c; this.row = r; this.damage = d.damage;
            this.canAttackFlying = d.canAttackFlying || false; this.canAttackGround = d.canAttackGround || false;
            const tileWidthAtTower = camera.project(c, r).tileWidth; this.range = d.range * tileWidthAtTower;
            this.fireRate = d.fireRate; this.cost = d.cost; this.owner = owner;
            const p = camera.getTileCenter(c, r); this.x = p.x; this.y = p.y; this.target = null; this.fireCooldown = 0
        }
        findTarget(monsters) {
            if (this.target && this.target.health > 0 && Math.sqrt(Math.pow(this.x - this.target.x, 2) + Math.pow(this.y - this.target.y, 2)) <= this.range) return;
            this.target = null; let closestTarget = null, minDistance = Infinity;
            for (const monster of monsters) {
                if ((monster.isFlying && !this.canAttackFlying) || (!monster.isFlying && !this.canAttackGround)) continue;
                const distance = Math.sqrt(Math.pow(this.x - monster.x, 2) + Math.pow(this.y - monster.y, 2));
                if (distance <= this.range && distance < minDistance) { minDistance = distance; closestTarget = monster; }
            }
            this.target = closestTarget;
        }
        attack(dT) { if (!this.target) return; this.fireCooldown -= dT; if (this.fireCooldown <= 0) { projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.owner)); this.fireCooldown = 1 / this.fireRate } }
        draw() { const p = camera.getTileCenter(this.col, this.row); ctx.fillStyle = this.owner === 'player' ? '#3498db' : '#9b59b6'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 2 * Math.PI); ctx.fill() }
    }

    // --- Handlers de Eventos ---
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect(), sX = e.clientX - rect.left, sY = e.clientY - rect.top, { col, row } = camera.screenToGrid(sX, sY);
        if (selectedAction && selectedAction.type === 'tower') {
            hoveredTower = null;
            if (col < 0 || row < 0) { selectedAction.ghostTower.visible = false; }
            else {
                selectedAction.ghostTower.visible = true; const p = camera.getTileCenter(col, row);
                selectedAction.ghostTower.x = p.x; selectedAction.ghostTower.y = p.y; selectedAction.ghostTower.col = col; selectedAction.ghostTower.row = row;
                const t = selectedAction.unit, o = towerData[t].levels[0]; const tileWidthAtGhost = camera.project(col, row).tileWidth;
                selectedAction.ghostTower.rangeInPixels = o.range * tileWidthAtGhost;
                selectedAction.ghostTower.isValid = playerGold >= o.cost && row >= 15 && !ghostPath.some(t => t.x === col && t.y === row) && !towers.some(t => t.col === col && t.row === row);
            }
        } else { hoveredTower = (col < 0 || row < 0) ? null : [...towers, ...ghostTowers].find(t => t.col === col && t.row === row) || null; }
        drawGameScene();
    }
    function handleActionButtonClick(btn) { const unit = btn.dataset.unit, type = btn.dataset.type; if (type === 'monster') { spawnPlayerMonster(unit); } else if (type === 'tower' && towerData && towerData[unit]) { if (selectedAction && selectedAction.button === btn) { btn.classList.remove("selected"); selectedAction = null; } else { if (selectedAction) { selectedAction.button.classList.remove("selected"); } btn.classList.add("selected"); selectedAction = { button: btn, type: type, unit: unit, ghostTower: { visible: false, x: 0, y: 0, col: -1, row: -1, rangeInPixels: 0, isValid: false } }; } } drawGameScene(); }
    function handleCanvasClick() { if (!selectedAction || selectedAction.type !== 'tower' || !selectedAction.ghostTower.isValid) return; const unitType = selectedAction.unit, level = 1, config = towerData[unitType].levels[level-1]; if (playerGold < config.cost) return; updatePlayerGold(-config.cost); towers.push(new Tower(unitType, level, selectedAction.ghostTower.col, selectedAction.ghostTower.row, 'player')); playerActions.push({ action: "build", type: unitType, level: level, col: selectedAction.ghostTower.col, row: selectedAction.ghostTower.row, timestamp: ROUND_DURATION - roundTimer, round: currentRound }); selectedAction.button.classList.remove("selected"); selectedAction = null; drawGameScene(); }
    function handleKeyPress(e) { if (e.key === "Escape" && selectedAction) { selectedAction.button.classList.remove("selected"); selectedAction = null; drawGameScene(); } const keyNum = parseInt(e.key); if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 7) { const unitTypes = Object.keys(monsterData); if (unitTypes[keyNum - 1]) { spawnPlayerMonster(unitTypes[keyNum - 1]); } } }
    
    // --- Lógica de Spawning e Início de Jogo ---
    function spawnPlayerMonster(unitType) {
        if (!monsterData[unitType]) return; 
        const level = 1, config = monsterData[unitType].levels[level-1]; 
        if (playerGold < config.cost) return; 
        
        // Começa o jogo se for o primeiro monstro
        if (!gameStarted) {
            gameStarted = true;
            log("Jogo iniciado pelo spawn do primeiro monstro.");

            // Executa instantaneamente as jogadas do ghost ANTERIORES ao primeiro spawn
            // (Simula a 'Build Phase' do Ghost para esta ronda)
            if (roundGhostActions.length > 0) {
                while (nextGhostActionIndex < roundGhostActions.length) {
                    const action = roundGhostActions[nextGhostActionIndex];
                    // Se encontrarmos um spawn de monstro ou se a ação for muito tarde (opcional, mas o user pediu "até o primeiro monstro"), paramos.
                    // A interpretação do user é: "até o primeiro monstro".
                    if (action.action === 'spawn') {
                        break; 
                    }
                    
                    // Executa a ação (Build Tower)
                    if (action.action === 'build') {
                        buildGhostTower(action.type, action.level, gridCols - 1 - action.col, gridRows - 1 - action.row); 
                    }
                    nextGhostActionIndex++;
                }
            }
        }

        updatePlayerGold(-config.cost); 
        monsters.push(new Monster(unitType, level, playerPath, 'player')); 
        playerActions.push({ action: 'spawn', type: unitType, level: level, timestamp: ROUND_DURATION - roundTimer, round: currentRound }); 
    }

    function spawnGhostMonster(unitType, level) {
        if (!monsterData[unitType]) { console.warn(`GHOST: Monstro desconhecido '${unitType}' ignorado.`); return; }
        const config = monsterData[unitType].levels[level-1]; if(ghostGold >= config.cost){ updateGhostGold(-config.cost); ghostMonsters.push(new Monster(unitType, level, ghostPath, 'ghost')); } 
    }
    function buildGhostTower(unitType, level, col, row) {
        if (!towerData[unitType]) { console.warn(`GHOST: Torre desconhecida '${unitType}' ignorada.`); return; }
        const config = towerData[unitType].levels[level-1]; if(ghostGold >= config.cost){ updateGhostGold(-config.cost); ghostTowers.push(new Tower(unitType,level,col,row,'ghost')); } 
    }
    
    // --- UI e Botões ---
    function updateActionButtons(){ document.querySelectorAll(".action-btn").forEach(btn => { const unit = btn.dataset.unit, type = btn.dataset.type, data = type === 'tower' ? towerData : monsterData, symbolEl = btn.querySelector(".unit-symbol"), costEl = btn.querySelector(".unit-cost"); if(symbolEl) symbolEl.textContent = ''; if(costEl) costEl.textContent = ''; if(data && data[unit] && data[unit].levels && data[unit].levels[0]){ if(symbolEl) symbolEl.textContent = data[unit].symbol || ''; if(costEl) costEl.textContent = `$${data[unit].levels[0].cost}`; } }); }
    function showActionButtons(type){ const isTowers = type === 'towers'; document.querySelectorAll(".tower-action").forEach(el => el.classList.toggle("hidden", !isTowers)); document.querySelectorAll(".monster-action").forEach(el => el.classList.toggle("hidden", isTowers)); towerMenuBtn.classList.toggle("active", isTowers); monsterMenuBtn.classList.toggle("active", !isTowers); if (selectedAction) { selectedAction.button.classList.remove("selected"); selectedAction = null; } drawGameScene(); }

    // --- Lógica Principal do Jogo (Game Loop) ---
    function gameLoop(timestamp) {
        gameLoopTimestamp = requestAnimationFrame(gameLoop);
        if (lastTime === null) {
            lastTime = timestamp;
        }
        const dT = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (gameStarted && !isRoundOver) {
            // Atualiza o timer da ronda
            roundTimer -= dT;
            timerDisplaySpan.textContent = formatTime(roundTimer);
            if (roundTimer <= 0) {
                endRound(false); // Round finished due to time limit
                return;
            }

            // Lógica de income passivo
            updatePlayerGold(1 * dT);
            if (ghost) updateGhostGold(1 * dT);

            // Ações do Ghost
            const elapsedTime = ROUND_DURATION - roundTimer;
            
            // Usamos roundGhostActions em vez de ghostActions global
            if (ghost && nextGhostActionIndex < roundGhostActions.length) { 
                while (nextGhostActionIndex < roundGhostActions.length && elapsedTime >= roundGhostActions[nextGhostActionIndex].timestamp) { 
                    const action = roundGhostActions[nextGhostActionIndex]; 
                    if (action.action === 'spawn') spawnGhostMonster(action.type, action.level); 
                    else if (action.action === 'build') buildGhostTower(action.type, action.level, gridCols - 1 - action.col, gridRows - 1 - action.row); 
                    nextGhostActionIndex++; 
                } 
            }
            
            // Stalemate condition (re-adicionado)
            if (monsters.length === 0 && ghostMonsters.length === 0) {
                timeWithoutMonsters += dT;
            } else {
                timeWithoutMonsters = 0;
            }

            const elapsedTimeInRound = ROUND_DURATION - roundTimer;
            if (elapsedTimeInRound >= 30 && timeWithoutMonsters >= 5) {
                console.log(`%c[ROUND END]: Stalemate condition met (Round > 30s and no monsters for 5s).`, 'color: orange; font-weight: bold;');
                endRound(false); // Round finished due to stalemate
                return;
            }

            // Movimentação e Ataques
            monsters.forEach(m => m.move(dT)); ghostMonsters.forEach(m => m.move(dT));
            towers.forEach(t => { t.findTarget(ghostMonsters); t.attack(dT); });
            ghostTowers.forEach(t => { t.findTarget(monsters); t.attack(dT); });

            // Atualiza projéteis
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                if (!p.target || p.target.health <= 0) { projectiles.splice(i, 1); continue; }
                p.move(dT);
                const dX = p.target.x - p.x, dY = p.target.y - p.y;
                if (Math.sqrt(dX * dX + dY * dY) < 5) {
                    p.target.health -= p.damage;
                    if (p.target.health <= 0) { if (p.owner === 'player') updatePlayerGold(p.target.reward); else updateGhostGold(p.target.reward); }
                    projectiles.splice(i, 1);
                }
            }
            // Verifica monstros que chegaram ao fim
            const pLeaked = monsters.filter(m => m.reachedEnd), gLeaked = ghostMonsters.filter(m => m.reachedEnd);
            if (pLeaked.length > 0) updateGhostHealth(-10 * pLeaked.length);
            if (gLeaked.length > 0) updatePlayerHealth(-10 * gLeaked.length);
            monsters = monsters.filter(m => m.health > 0 && !m.reachedEnd);
            ghostMonsters = ghostMonsters.filter(m => m.health > 0 && !m.reachedEnd);
        } else if (!gameStarted) {
            timerDisplaySpan.textContent = formatTime(ROUND_DURATION);
        }

        if (!document.hidden) drawGameScene();
    }

    // --- Gestão de Rondas e Jogo ---
    async function loadGameData(){try{const t=`?v=${Date.now()}`,[e,o]=await Promise.all([fetch(`towers.json${t}`),fetch(`monsters.json${t}`)]);towerData=await e.json();monsterData=await o.json();log("Dados de Torres e Monstros carregados.")}catch(t){log(`Erro ao carregar dados do jogo: ${t}`)} }
    
    function endRound(gameEndedByWinLoss) {
        if (isRoundOver) return;
        isRoundOver = true;
        gameStarted = false; // Pausa o jogo até a próxima ronda começar
        
        // Para o loop de jogo temporariamente
        cancelAnimationFrame(gameLoopTimestamp);
        
        console.log(`%c[ROUND END]: Round ${currentRound} finished.`, 'color: blue; font-weight: bold;');

        if (currentRound >= 3) {
            endGame(playerHealth >= ghostHealth);
            return;
        }

        // Dá 125 de ouro a cada jogador no final da ronda
        updatePlayerGold(125);
        updateGhostGold(125);

        // Se não for o fim do jogo, prepara a próxima ronda.
        endGameMessage.textContent = `Round ${currentRound} Complete`;
        endGameOverlay.classList.remove('hidden');
        replayBtn.classList.add('hidden'); // Esconde botão replay

        setTimeout(() => {
            endGameOverlay.classList.add('hidden');
            startNextRound();
        }, 3000); 
    }

    function startNextRound() {
        currentRound++;
        roundNumberSpan.textContent = currentRound;
        log(`%c[ROUND START]: Starting Round ${currentRound}`, 'color: green; font-weight: bold;');
        
        resetRoundState(); // Agora mantém o ouro e torres!
        
        // Filtra e prepara as ações do ghost para a nova ronda
        if (ghostActions.length > 0) {
            roundGhostActions = ghostActions.filter(a => a.round === currentRound);
            roundGhostActions.sort((a,b) => a.timestamp - b.timestamp);
        } else {
            roundGhostActions = [];
        }
        nextGhostActionIndex = 0;
        
        isRoundOver = false;
        
        // Reinicia o loop de jogo
        lastTime = null;
        gameLoopTimestamp = requestAnimationFrame(gameLoop);
    }
    
    function endGame(playerIsVictor) {
        cancelAnimationFrame(gameLoopTimestamp);
        isRoundOver = true;
        log(`%c[GAME END]: Final Winner: ${playerIsVictor ? "Player" : "Ghost"}`, 'color: red; font-weight: bold;');
        
        endGameMessage.textContent = playerIsVictor ? "Vitória Final!" : "Derrota Final!";
        endGameOverlay.classList.remove('hidden');
        replayBtn.classList.remove('hidden'); // Mostra botão de replay
        if (playerIsVictor) {
            saveGhost(playerActions);
        }
    }

    async function saveGhost(actions){
        if(actions.length > 0){
            // Normaliza as ações? Não, para multi-ronda precisamos dos dados exatos de cada ronda.
            // Apenas ordenamos.
            // Nota: Se quisermos normalizar, teríamos de normalizar POR RONDA, mas o timestamp já é relativo à ronda.
            // Então basta guardar como está.
            
            // Mas espera, se tivermos muitas ações, convém garantir a ordem.
            actions.sort((a,b) => {
                if (a.round !== b.round) return a.round - b.round;
                return a.timestamp - b.timestamp;
            });
            
            try{ await db.collection("ghosts").add({actions: actions, timestamp:firebase.firestore.FieldValue.serverTimestamp()}); log("Ghost salvo com sucesso.") }
            catch(e) { log("Erro ao salvar ghost: "+e) }
        } else { log("Nenhuma ação para salvar."); }
    }

    async function loadGhost(){ 
        try { 
            const t = await db.collection("ghosts").orderBy("timestamp","desc").limit(1).get(); if(t.empty) throw new Error("Nenhum ghost no Firebase."); 
            ghost = t.docs[0].data(); ghostActions = ghost.actions || []; 
            // Ordenação global inicial
            if (ghostActions.length > 0) {
                 ghostActions.sort((a,b) => {
                    if (a.round !== b.round) return a.round - b.round;
                    return a.timestamp - b.timestamp;
                });
            }
            log("Ghost carregado do Firebase."); 
        } catch(t) { 
            log(`${t.message} A carregar ghost local...`); 
            try { 
                const res = await fetch(`ghost.json?v=${Date.now()}`); if(!res.ok) throw new Error("Falha ao carregar ghost.json"); 
                ghost = await res.json(); ghostActions = ghost.actions || []; 
                if (ghostActions.length > 0) {
                     ghostActions.sort((a,b) => {
                        if (a.round !== b.round) return a.round - b.round;
                        return a.timestamp - b.timestamp;
                    });
                }
                log("Ghost local carregado com sucesso."); 
            } catch(e) { log(`Erro ao carregar ghost local: ${e.message}`); ghost = null; ghostActions = []; } 
        } 
    }

    // Reseta apenas o estado da ronda (monstros, projéteis, timer)
    // MODIFICADO: Não reseta torres nem ouro!
    function resetRoundState() {
        monsters = []; projectiles = []; ghostMonsters = [];
        roundTimer = ROUND_DURATION;
        selectedAction = null; hoveredTower = null;
        nextGhostActionIndex = 0;
        timeWithoutMonsters = 0;
        
        showActionButtons('towers');
        log("Round state has been reset (keeping towers and gold).");
    }
    
    // Reseta o jogo inteiro para o estado inicial (incluindo ouro e torres)
    async function fullReset() {
        endGameOverlay.classList.add('hidden');
        isRoundOver = false;
        gameStarted = false; // Reset gameStarted
        
        // Para o loop de jogo se estiver a correr
        if (gameLoopTimestamp) cancelAnimationFrame(gameLoopTimestamp);
        
        currentRound = 1;
        playerHealth = 100;
        ghostHealth = 100;
        playerActions = [];
        
        updatePlayerHealth(0);
        updateGhostHealth(0);
        roundNumberSpan.textContent = currentRound;
        
        // No full reset, resetamos tudo
        playerGold = 500;
        ghostGold = 500;
        updatePlayerGold(0);
        updateGhostGold(0);
        towers = [];
        ghostTowers = [];

        await loadGhost();
        
        // Prepara as ações do ghost para a ronda 1
        if (ghostActions.length > 0) {
            roundGhostActions = ghostActions.filter(a => a.round === currentRound);
            roundGhostActions.sort((a,b) => a.timestamp - b.timestamp);
        } else {
            roundGhostActions = [];
        }

        // Chamamos resetRoundState para limpar monstros e timer
        resetRoundState();

        // Reinicia o game loop
        lastTime = null;
        gameLoopTimestamp = requestAnimationFrame(gameLoop);
        log("Game has been fully reset.");
    }
    
    async function main() { 
        camera = new Camera(canvas);
        camera.verticalScale = 0.95;
        await loadGameData();
        updateActionButtons(); 
        
        // Event Listeners
        window.addEventListener("resize", resize);
        towerMenuBtn.addEventListener('click',()=>showActionButtons('towers'));
        monsterMenuBtn.addEventListener('click',()=>showActionButtons('monsters'));
        document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',()=>handleActionButtonClick(btn)));
        canvas.addEventListener('click',handleCanvasClick);
        canvas.addEventListener('mousemove',handleMouseMove);
        canvas.addEventListener("mouseleave",()=>{hoveredTower=null; if(selectedAction) selectedAction.ghostTower.visible = false; drawGameScene();});
        document.addEventListener('keydown',handleKeyPress);
        replayBtn.addEventListener('click', fullReset); // O botão de replay agora faz um reset completo

        resize();
        await fullReset(); // Começa o jogo com um reset completo
    }

    main();
});
