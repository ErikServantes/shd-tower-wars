
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const goldSpan = document.getElementById('gold');
    const hpSpan = document.getElementById('hp');
    const timerSpan = document.getElementById('timer');

    // Seleciona os botões que existem no HTML
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
    let gold, playerHealth, monsters, towers, playerActions, selectedAction;
    let gameStarted, roundTime, lastTime = 0;
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex, ghostActionQueue;

    const path = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const ghostPath = [...path].reverse().map(p => ({ x: p.x, y: (gridRows - 1) - p.y }));

    function updateGold(amount) { gold += amount; goldSpan.textContent = Math.floor(gold); }
    function updateHealth(amount) { playerHealth += amount; hpSpan.textContent = playerHealth; if (playerHealth <= 0) endGame(false); }
    function updateGhostHealth(amount) { ghostHealth += amount; if (ghostHealth <= 0) endGame(true); }

    // ============== FUNÇÕES DE DESENHO E PROJEÇÃO (RESTAURADAS E COMPLETAS) ==============
    function resize() {
        const targetAspectRatio = 1/2, windowAspectRatio = window.innerWidth / window.innerHeight;
        let w, h;
        if (windowAspectRatio > targetAspectRatio) { h = window.innerHeight; w = h * targetAspectRatio; } else { w = window.innerWidth; h = w / targetAspectRatio; }
        canvas.width = w; canvas.height = h;
        drawGrid(); // Garante que a grelha é desenhada
    }
    window.addEventListener('resize', resize);
    function project(c,r){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=15,c,r)}
    function drawTile(isPath,isPlayerArea,c,r){const C=project(c,r),N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=isPath?"#2c3e50":(isPlayerArea?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}
    
    // ============== CLASSES DO JOGO (USANDO DADOS JSON) ==============
    class Monster{constructor(t,l,p,i=false){const d=monsterData[t].levels[l-1],s=getTileCenter(p[0].x,p[0].y);this.path=p;this.pathIndex=0;this.x=s.x;this.y=s.y;this.speed=d.speed;this.radius=8;this.maxHealth=d.health;this.health=this.maxHealth;this.reward=d.reward;this.reachedEnd=false;this.isGhost=i}takeDamage(a){this.health-=a}move(dT){if(this.pathIndex>=this.path.length-1){this.reachedEnd=true;return}const tN=this.path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD}}draw(){ctx.fillStyle=this.isGhost?'#ff8c00':'red';ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5)}}
    class Tower{constructor(t,l,c,r,i=false){const d=towerData[t].levels[l-1],n=getTileCenter(c,r);this.x=n.x;this.y=n.y;this.col=c;this.row=r;this.level=l;this.type=t;this.damage=d.damage;this.range=d.range;this.fireRate=d.fireRate;this.fireCooldown=0;this.target=null;this.isGhost=i}draw(){ctx.fillStyle=this.isGhost?"#ff00ff":"#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill()}findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M}}}attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate}}}

    // ============== LÓGICA DE UI E AÇÕES (RESTAURADA) ==============
    towerMenuBtn.addEventListener('click', () => showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click', () => showActionButtons('monsters'));
    allActionButtons.forEach(btn => btn.addEventListener('click', () => handleActionButtonClick(btn)));
    canvas.addEventListener('click', handleCanvasClick);

    function showActionButtons(menuType) {
        towerActionButtons.forEach(b => b.classList.toggle('hidden', menuType !== 'towers'));
        monsterActionButtons.forEach(b => b.classList.toggle('hidden', menuType !== 'monsters'));
        towerMenuBtn.classList.toggle('active', menuType === 'towers');
        monsterMenuBtn.classList.toggle('active', menuType === 'monsters');
        allActionButtons.forEach(b => b.classList.remove('selected'));
        selectedAction = null;
    }

    function handleActionButtonClick(btn) {
        const currentUnit = selectedAction ? selectedAction.unit : null;
        allActionButtons.forEach(b => b.classList.remove('selected'));
        if (currentUnit === btn.dataset.unit) {
            selectedAction = null; // Desseleciona se clicar no mesmo botão
        } else {
            btn.classList.add('selected');
            selectedAction = { type: btn.dataset.type, unit: btn.dataset.unit };
        }
    }

    function handleCanvasClick(e) {
        if (!selectedAction || !towerData || !monsterData) return;
        const rect = canvas.getBoundingClientRect(), sX = e.clientX - rect.left, sY = e.clientY - rect.top;
        const { col, row } = screenToGrid(sX, sY);
        const unitType = selectedAction.unit;
        const level = 1;

        if (selectedAction.type === 'tower') {
            if (!towerData[unitType]) { log(`Configuração de torre inválida: ${unitType}`); return; }
            const config = towerData[unitType].levels[level - 1];
            if (gold >= config.cost && col >= 0 && row >= 15 && !path.some(p => p.x === col && p.y === row) && !towers.some(t => t.col === col && t.row === row)) {
                startGameIfNeeded();
                updateGold(-config.cost);
                towers.push(new Tower(unitType, level, col, row));
                playerActions.push({ action: 'build', type: unitType, level: level, col: col, row: row, timestamp: roundTime });
            }
        } else if (selectedAction.type === 'monster') {
            if (!monsterData[unitType]) { log(`Configuração de monstro inválida: ${unitType}`); return; }
            const config = monsterData[unitType].levels[level - 1];
            if (gold >= config.cost) {
                startGameIfNeeded();
                updateGold(-config.cost);
                monsters.push(new Monster(unitType, level, path));
                playerActions.push({ action: 'spawn', type: unitType, level: level, timestamp: roundTime });
            }
        }
    }

    // ============== CICLO DE JOGO E LÓGICA DO GHOST ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();requestAnimationFrame(gameLoop);}
    function executeGhostAction(action){/* ... */}
    function gameLoop(timestamp){if(!gameStarted)return;const dT=(timestamp-lastTime)/1000;lastTime=timestamp;roundTime+=dT;gold+=1*dT;goldSpan.textContent=Math.floor(gold);if(ghost)ghostGold+=1*dT;/* ... Lógica de ações e movimento ...*/monsters.forEach(m=>m.move(dT));ghostMonsters.forEach(m=>m.move(dT));towers.forEach(t=>{t.findTarget(ghostMonsters);t.attack(dT)});ghostTowers.forEach(t=>{t.findTarget(monsters);t.attack(dT)});const pMRE=monsters.filter(m=>m.reachedEnd);if(pMRE.length>0)updateGhostHealth(-10*pMRE.length);const gMRE=ghostMonsters.filter(m=>m.reachedEnd);if(gMRE.length>0)updateHealth(-10*gMRE.length);monsters=monsters.filter(m=>m.health>0&&!m.reachedEnd);ghostMonsters=ghostMonsters.filter(m=>m.health>0&&!m.reachedEnd);drawGrid();towers.forEach(t=>t.draw());ghostTowers.forEach(t=>t.draw());monsters.forEach(m=>m.draw());ghostMonsters.forEach(m=>m.draw());const min=Math.floor(roundTime/60).toString().padStart(2,'0'),sec=Math.floor(roundTime%60).toString().padStart(2,'0');timerSpan.textContent=`${min}:${sec}`;if(ghost&&nextGhostActionIndex>=ghostActions.length&&ghostActionQueue.length===0&&ghostMonsters.length===0&&monsters.length===0){endGame(true)}requestAnimationFrame(gameLoop)}

    // ============== FUNÇÕES DE ESTADO DO JOGO ==============
    async function saveGhost(actions){/* ... */}
    async function loadGhost(){/* ... */}
    function endGame(isVictory){if(!gameStarted)return;gameStarted=false;if(isVictory){saveGhost(playerActions);alert("VITÓRIA! O seu Ghost foi guardado.")}else{alert("Fim de jogo! Foi derrotado.")}setTimeout(resetGame,3000)}

    // ============== INICIALIZAÇÃO E CARREGAMENTO ==============
    async function loadGameData() {
        try {
            const [towersRes, monstersRes] = await Promise.all([fetch('towers.json'), fetch('monsters.json')]);
            towerData = await towersRes.json();
            monsterData = await monstersRes.json();
            log("Configurações de jogo carregadas dos ficheiros JSON.");
        } catch (error) { console.error("Falha ao carregar os ficheiros de configuração do jogo:", error); }
    }

    async function resetGame() {
        gameStarted = false;
        gold = 500; playerHealth = 100; monsters = []; towers = []; playerActions = [];
        ghost = null; ghostActions = []; ghostGold = 500; ghostHealth = 100; ghostTowers = []; ghostMonsters = []; nextGhostActionIndex = 0; ghostActionQueue = [];
        roundTime = 0; selectedAction = null;
        updateGold(0); 
        updateHealth(0); 
        timerSpan.textContent = "00:00";
        monsterMenuBtn.style.display = 'inline-block';
        await loadGhost();
        showActionButtons('towers');
        resize(); // Chama resize, que por sua vez chama drawGrid para desenhar o tabuleiro
    }
    
    // ============== PONTO DE ENTRADA ==============
    async function main() {
        await loadGameData();
        await resetGame(); // Garante que o jogo é reiniciado e desenhado após carregar os dados
    }

    main();
});
