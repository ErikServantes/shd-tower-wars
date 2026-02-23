
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Novos elementos da HUD
    const playerHpSpan = document.getElementById('player-hp');
    const playerGoldSpan = document.getElementById('player-gold');
    const enemyHpSpan = document.getElementById('enemy-hp');
    const enemyGoldSpan = document.getElementById('enemy-gold');

    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const allActionButtons = document.querySelectorAll('.action-btn');
    const towerActionButtons = document.querySelectorAll('.tower-action');
    const monsterActionButtons = document.querySelectorAll('.monster-action');

    function log(message) { console.log(message); }

    // ============== CONFIGURAÇÃO DO JOGO (CARREGADO DE JSON) ==============
    let towerData, monsterData;

    // ============== CONFIGURAÇÃO DO FIREBASE ==============
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============== ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    let playerGold, playerHealth, monsters, towers, playerActions, selectedAction;
    let gameStarted, roundTime, lastTime = 0;
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex, ghostActionQueue;

    const path = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const ghostPath = [...path].reverse().map(p => ({ x: p.x, y: (gridRows - 1) - p.y }));

    // Funções de atualização da HUD
    function updatePlayerGold(amount) { playerGold += amount; playerGoldSpan.textContent = Math.floor(playerGold); }
    function updatePlayerHealth(amount) { playerHealth += amount; playerHpSpan.textContent = playerHealth; if (playerHealth <= 0) endGame(false); }
    function updateGhostGold(amount) { ghostGold += amount; enemyGoldSpan.textContent = Math.floor(ghostGold); }
    function updateGhostHealth(amount) { ghostHealth += amount; enemyHpSpan.textContent = ghostHealth; if (ghostHealth <= 0) endGame(true); }

    // ============== FUNÇÕES DE DESENHO E PROJEÇÃO ==============
    function resize() { /* ... código mantido ... */ drawGrid(); }
    window.addEventListener('resize', resize);
    function project(c,r){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=15,c,r)}
    function drawTile(isPath,isPlayerArea,c,r){const C=project(c,r),N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=isPath?"#2c3e50":(isPlayerArea?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}
    
    // ============== CLASSES DO JOGO ==============
    class Monster{ /* ... código mantido ... */}
    class Tower{ /* ... código mantido ... */}

    // ============== LÓGICA DE UI E AÇÕES ==============
    towerMenuBtn.addEventListener('click', () => showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click', () => showActionButtons('monsters'));
    allActionButtons.forEach(btn => btn.addEventListener('click', () => handleActionButtonClick(btn)));
    canvas.addEventListener('click', handleCanvasClick);

    function showActionButtons(menuType) { /* ... código mantido ... */ }
    function handleActionButtonClick(btn) { /* ... código mantido ... */ }

    function handleCanvasClick(e) {
        if (!selectedAction || !towerData || !monsterData) return;
        const rect = canvas.getBoundingClientRect(), sX = e.clientX - rect.left, sY = e.clientY - rect.top;
        const { col, row } = screenToGrid(sX, sY);
        const unitType = selectedAction.unit;
        const level = 1;

        if (selectedAction.type === 'tower') {
            if (!towerData[unitType]) { log(`Configuração de torre inválida: ${unitType}`); return; }
            const config = towerData[unitType].levels[level - 1];
            if (playerGold >= config.cost && col >= 0 && row >= 15 && !path.some(p => p.x === col && p.y === row) && !towers.some(t => t.col === col && t.row === row)) {
                startGameIfNeeded();
                updatePlayerGold(-config.cost);
                towers.push(new Tower(unitType, level, col, row));
                playerActions.push({ action: 'build', type: unitType, level: level, col: col, row: row, timestamp: roundTime });
            }
        } else if (selectedAction.type === 'monster') {
            if (!monsterData[unitType]) { log(`Configuração de monstro inválida: ${unitType}`); return; }
            const config = monsterData[unitType].levels[level - 1];
            if (playerGold >= config.cost) {
                startGameIfNeeded();
                updatePlayerGold(-config.cost);
                monsters.push(new Monster(unitType, level, path));
                playerActions.push({ action: 'spawn', type: unitType, level: level, timestamp: roundTime });
            }
        }
    }

    // ============== CICLO DE JOGO ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();requestAnimationFrame(gameLoop);}
    
    function gameLoop(timestamp){
        if(!gameStarted)return;
        const dT=(timestamp-lastTime)/1000;
        lastTime=timestamp;
        roundTime+=dT;

        updatePlayerGold(1 * dT); // Ganho de ouro do jogador
        if(ghost) updateGhostGold(1 * dT); // Ganho de ouro do Ghost

        monsters.forEach(m=>m.move(dT));
        ghostMonsters.forEach(m=>m.move(dT));
        towers.forEach(t=>{t.findTarget(ghostMonsters);t.attack(dT)});
        ghostTowers.forEach(t=>{t.findTarget(monsters);t.attack(dT)});
        
        const pMRE=monsters.filter(m=>m.reachedEnd);
        if(pMRE.length>0) updateGhostHealth(-10 * pMRE.length);
        
        const gMRE=ghostMonsters.filter(m=>m.reachedEnd);
        if(gMRE.length>0) updatePlayerHealth(-10 * gMRE.length);

        monsters=monsters.filter(m=>m.health>0&&!m.reachedEnd);
        ghostMonsters=ghostMonsters.filter(m=>m.health>0&&!m.reachedEnd);

        drawGrid();
        towers.forEach(t=>t.draw());
        ghostTowers.forEach(t=>t.draw());
        monsters.forEach(m=>m.draw());
        ghostMonsters.forEach(m=>m.draw());
        
        if(ghost&&nextGhostActionIndex>=ghostActions.length&&ghostActionQueue.length===0&&ghostMonsters.length===0&&monsters.length===0){endGame(true)}
        requestAnimationFrame(gameLoop)
    }

    // ============== FUNÇÕES DE ESTADO DO JOGO ==============
    async function loadGameData() { /* ... código mantido ... */ }
    function endGame(isVictory){ /* ... código mantido ... */}
    async function saveGhost(actions){/* ... */}
    async function loadGhost(){/* ... */}

    async function resetGame() {
        gameStarted = false;
        playerGold = 500; playerHealth = 100; monsters = []; towers = []; playerActions = [];
        ghost = null; ghostActions = []; ghostGold = 500; ghostHealth = 100; ghostTowers = []; ghostMonsters = []; nextGhostActionIndex = 0; ghostActionQueue = [];
        roundTime = 0; selectedAction = null;

        // Atualizar a HUD no reset
        updatePlayerGold(0);
        updatePlayerHealth(0);
        updateGhostGold(0);
        updateGhostHealth(0);

        monsterMenuBtn.style.display = 'inline-block';
        await loadGhost();
        showActionButtons('towers');
        resize();
    }
    
    // ============== PONTO DE ENTRADA ==============
    async function main() {
        await loadGameData();
        await resetGame();
    }

    main();
});
