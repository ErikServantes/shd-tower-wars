
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const goldSpan = document.getElementById('gold');
    const hpSpan = document.getElementById('hp');
    const timerSpan = document.getElementById('timer');

    const buttonContainer = document.getElementById('button-container');
    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const allActionButtons = document.querySelectorAll('.action-btn');
    const towerActionButtons = document.querySelectorAll('.tower-action');
    const monsterActionButtons = document.querySelectorAll('.monster-action');

    function log(message) { console.log(message); }
    log('UI com Fontes JS-Driven Inicializada.');

    // ============== CONFIGURAÇÃO DO JOGO (CARREGADO DE JSON) ==============
    let towerData, monsterData;

    // ============== CONFIGURAÇÃO DO FIREBASE ==============
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============== ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    let gold, playerHealth, monsters, towers, playerActions, selectedAction;
    let gameStarted, roundTime, lastTime = 0;
    
    // --- Estado do Ghost ---
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex, ghostActionQueue;

    const path = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const ghostPath = [...path].reverse().map(p => ({ x: p.x, y: (gridRows - 1) - p.y }));

    function updateGold(amount) { gold += amount; goldSpan.textContent = Math.floor(gold); }
    function updateHealth(amount) { playerHealth += amount; hpSpan.textContent = playerHealth; if (playerHealth <= 0) endGame(false); }
    
    function resize() { /* ... */ }
    window.addEventListener('resize', resize);

    function project(c,r){/* ... */} function drawGrid(){/* ... */} function drawTile(i,p,c,r){/* ... */} function screenToGrid(sX,sY){/* ... */} function getTileCenter(c,r){/* ... */}
    
    // ============== CLASSES DO JOGO (AGORA USAM CONFIGS) ==============
    class Monster {
        constructor(type, level, monsterPath, isGhost = false) {
            const config = monsterData[type].levels[level - 1];
            this.path = monsterPath;
            this.pathIndex = 0;
            const startPos = getTileCenter(this.path[0].x, this.path[0].y);
            this.x = startPos.x;
            this.y = startPos.y;
            this.speed = config.speed;
            this.radius = 8; // Pode ser adicionado ao JSON se desejar
            this.maxHealth = config.health;
            this.health = this.maxHealth;
            this.reward = config.reward;
            this.reachedEnd = false;
            this.isGhost = isGhost;
        }
        takeDamage(a){this.health-=a}
        move(dT){if(this.pathIndex>=this.path.length-1){this.reachedEnd=true;return}const tN=this.path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD}}
        draw(){ctx.fillStyle=this.isGhost?'#ff8c00':'red';ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5)}
    }

    class Tower {
        constructor(type, level, col, row, isGhost = false) {
            const config = towerData[type].levels[level - 1];
            const center = getTileCenter(col, row);
            this.x = center.x;
            this.y = center.y;
            this.col = col;
            this.row = row;
            this.level = level;
            this.type = type;
            this.damage = config.damage;
            this.range = config.range;
            this.fireRate = config.fireRate;
            this.fireCooldown = 0;
            this.target = null;
            this.isGhost = isGhost;
        }
        draw(){ctx.fillStyle=this.isGhost?"#ff00ff":"#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill()}
        findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M}}}
        attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate}}
    }

    // ============== LÓGICA DE UI E AÇÕES ==============
    towerMenuBtn.addEventListener('click',()=>showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click',()=>showActionButtons('monsters'));
    allActionButtons.forEach(btn=>btn.addEventListener('click',()=>handleActionButtonClick(btn)));
    canvas.addEventListener('click',handleCanvasClick);

    function showActionButtons(menuType){/* ... */}
    function handleActionButtonClick(btn){/* ... */}

    function handleCanvasClick(e) {
        if (!selectedAction) return;
        const rect = canvas.getBoundingClientRect(), sX = e.clientX - rect.left, sY = e.clientY - rect.top;
        const { col, row } = screenToGrid(sX, sY);
        const unitType = selectedAction.unit;

        if (selectedAction.type === 'tower') {
            const config = towerData[unitType].levels[0]; // Nível 1 por defeito
            const isValidBuild = col >= 0 && row >= 15 && !path.some(p => p.x === col && p.y === row) && !towers.some(t => t.col === col && t.row === row) && gold >= config.cost;
            if (isValidBuild) {
                startGameIfNeeded();
                updateGold(-config.cost);
                towers.push(new Tower(unitType, 1, col, row));
                playerActions.push({ action: 'build', type: unitType, level: 1, col: col, row: row, timestamp: roundTime });
                log(`Torre ${config.name} construída.`);
            } else {
                log("Construção inválida.");
            }
        } 
        // A lógica para criar monstros pelo jogador pode ser reativada se necessário
        
        allActionButtons.forEach(b => b.classList.remove("selected"));
        selectedAction = null;
    }

    // ============== CICLO DE JOGO E LÓGICA DO GHOST ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();log("A ronda começou!");requestAnimationFrame(gameLoop);}
    
    function executeGhostAction(action) {
        const level = action.level || 1;
        if (action.action === 'build') {
            const config = towerData[action.type].levels[level - 1];
            ghostGold -= config.cost;
            const mirroredRow = (gridRows - 1) - action.row;
            ghostTowers.push(new Tower(action.type, level, action.col, mirroredRow, true));
            log(`Ghost construiu ${config.name}`);
        } else if (action.action === 'spawn') {
            const config = monsterData[action.type].levels[level - 1];
            ghostGold -= config.cost;
            ghostMonsters.push(new Monster(action.type, level, ghostPath, true));
            log(`Ghost enviou ${config.name}`);
        }
    }

    function gameLoop(timestamp) {
        if (!gameStarted) return;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        roundTime += deltaTime;

        gold += 1 * deltaTime;
        goldSpan.textContent = Math.floor(gold);
        if (ghost) ghostGold += 1 * deltaTime;

        // --- Processar Fila de Ações do Ghost ---
        if (ghostActionQueue.length > 0) {
            const waitingAction = ghostActionQueue[0];
            const level = waitingAction.level || 1;
            const cost = waitingAction.action === 'build' ? towerData[waitingAction.type].levels[level-1].cost : monsterData[waitingAction.type].levels[level-1].cost;
            if (ghostGold >= cost) {
                executeGhostAction(waitingAction);
                ghostActionQueue.shift();
            }
        }

        // --- Processar Ações Agendadas do Ghost ---
        if (ghost && nextGhostActionIndex < ghostActions.length) {
            const nextAction = ghostActions[nextGhostActionIndex];
            if (roundTime >= nextAction.timestamp) {
                 const level = nextAction.level || 1;
                const cost = nextAction.action === 'build' ? towerData[nextAction.type].levels[level-1].cost : monsterData[nextAction.type].levels[level-1].cost;
                if (ghostGold >= cost) {
                    executeGhostAction(nextAction);
                } else {
                    log(`Ação do Ghost adiada por falta de ouro. Colocada na fila.`);
                    ghostActionQueue.push(nextAction);
                }
                nextGhostActionIndex++;
            }
        }
        
        monsters.forEach(m => m.move(deltaTime));
        ghostMonsters.forEach(m => m.move(deltaTime));

        towers.forEach(t => { t.findTarget(ghostMonsters); t.attack(deltaTime); });
        ghostTowers.forEach(t => { t.findTarget(monsters); t.attack(deltaTime); });

        const ghostMonstersReachedEnd = ghostMonsters.filter(m => m.reachedEnd);
        if (ghostMonstersReachedEnd.length > 0) updateHealth(-10 * ghostMonstersReachedEnd.length); // O dano pode vir do JSON

        monsters = monsters.filter(m => m.health > 0 && !m.reachedEnd);
        ghostMonsters = ghostMonsters.filter(m => m.health > 0 && !m.reachedEnd);

        drawGrid();
        towers.forEach(t => t.draw());
        ghostTowers.forEach(t => t.draw());
        monsters.forEach(m => m.draw());
        ghostMonsters.forEach(m => m.draw());
        
        const min = Math.floor(roundTime / 60).toString().padStart(2, '0');
        const sec = Math.floor(roundTime % 60).toString().padStart(2, '0');
        timerSpan.textContent = `${min}:${sec}`;
        
        if (ghost && nextGhostActionIndex >= ghostActions.length && ghostActionQueue.length === 0 && ghostMonsters.length === 0) {
            endGame(true);
            return;
        }

        requestAnimationFrame(gameLoop);
    }

    async function saveGhost(actions) { /* ... */ }
    async function loadGhost() { /* ... */ }
    function endGame(isVictory) { /* ... */ }

    // ============== INICIALIZAÇÃO E CARREGAMENTO DE DADOS ==============
    async function loadGameData() {
        try {
            const [towersResponse, monstersResponse] = await Promise.all([
                fetch('towers.json'),
                fetch('monsters.json')
            ]);
            towerData = await towersResponse.json();
            monsterData = await monstersResponse.json();
            log("Configurações de torres e monstros carregadas com sucesso!");
        } catch (error) {
            console.error("Falha ao carregar os ficheiros de configuração do jogo:", error);
        }
    }

    async function resetGame() {
        gameStarted = false;
        log('A carregar nova ronda... Prepare-se!');
        gold = 500; playerHealth = 100; monsters = []; towers = []; playerActions = [];
        ghost = null; ghostActions = []; ghostGold = 500; ghostHealth = 100; ghostTowers = []; ghostMonsters = []; nextGhostActionIndex = 0; ghostActionQueue = [];
        roundTime = 0; selectedAction = null;
        updateGold(0); updateHealth(0);
        timerSpan.textContent = "00:00";
        showActionButtons('towers');
        monsterMenuBtn.style.display = 'none';
        await loadGhost();
        resize();
    }
    
    // ============== PONTO DE ENTRADA ==============
    async function main() {
        await loadGameData();
        resetGame();
    }

    main();
});
