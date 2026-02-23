
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', () => {
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

    // ============== CONFIGURAÇÃO DO FIREBASE ==============
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============== CONFIGURAÇÕES E ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    let gold, playerHealth, monsters, towers, playerActions, selectedAction;
    let gameStarted, roundTime, lastTime = 0;
    
    // --- Estado do Ghost ---
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex, ghostActionQueue;

    const path = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const ghostPath = [...path].reverse().map(p => ({ x: p.x, y: (gridRows - 1) - p.y }));

    function updateGold(amount) { gold += amount; goldSpan.textContent = Math.floor(gold); }
    function updateHealth(amount) { playerHealth += amount; hpSpan.textContent = playerHealth; if (playerHealth <= 0) endGame(false); }
    
    function resize() { /* ... (código de redimensionamento omitido para brevidade) ... */ }
    window.addEventListener('resize', resize);

    function project(c,r){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=15,c,r)}
    function drawTile(isPath,isPlayerArea,c,r){const C=project(c,r),N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=isPath?"#2c3e50":(isPlayerArea?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}
    
    class Monster{constructor(monsterPath,isGhost=false){this.path=monsterPath;this.pathIndex=0;const s=this.path[0],c=getTileCenter(s.x,s.y);this.x=c.x;this.y=c.y;this.speed=80;this.radius=8;this.maxHealth=100;this.health=this.maxHealth;this.reachedEnd=false;this.isGhost=isGhost}takeDamage(a){this.health-=a}move(dT){if(this.pathIndex>=this.path.length-1){this.reachedEnd=true;return}const tN=this.path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD}}draw(){ctx.fillStyle=this.isGhost?'#ff8c00':'red';ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5)}}
    class Tower{constructor(c,r,isGhost=false){const C=getTileCenter(c,r);this.x=C.x;this.y=C.y;this.col=c;this.row=r;this.range=150;this.damage=10;this.fireRate=1;this.fireCooldown=0;this.target=null;this.isGhost=isGhost}draw(){ctx.fillStyle=this.isGhost?"#ff00ff":"#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill()}findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M}}}attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate}}}

    towerMenuBtn.addEventListener('click',()=>showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click',()=>showActionButtons('monsters'));
    allActionButtons.forEach(btn=>btn.addEventListener('click',()=>handleActionButtonClick(btn)));
    canvas.addEventListener('click',handleCanvasClick);

    function showActionButtons(menuType){if(menuType==="towers"){towerActionButtons.forEach(b=>b.classList.remove("hidden"));monsterActionButtons.forEach(b=>b.classList.add("hidden"));towerMenuBtn.classList.add("active");monsterMenuBtn.classList.remove("active")}else{towerActionButtons.forEach(b=>b.classList.add("hidden"));monsterActionButtons.forEach(b=>b.classList.remove("hidden"));monsterMenuBtn.classList.add("active");towerMenuBtn.classList.remove("active")}allActionButtons.forEach(b=>b.classList.remove("selected"));selectedAction=null}
    function handleActionButtonClick(btn){const type=btn.dataset.type,unit=btn.dataset.unit;allActionButtons.forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");selectedAction={type:type,unit:unit};log(`Modo de ação: ${unit}`)}
    function handleCanvasClick(e){if(!selectedAction)return;const rect=canvas.getBoundingClientRect(),sX=e.clientX-rect.left,sY=e.clientY-rect.top;const{col,row}=screenToGrid(sX,sY);if(selectedAction.type==='tower'){const isValidBuild=col>=0&&row>=15&&!path.some(p=>p.x===col&&p.y===row)&&!towers.some(t=>t.col===col&&t.row===row)&&gold>=100;if(isValidBuild){startGameIfNeeded();updateGold(-100);towers.push(new Tower(col,row));playerActions.push({action:'build',type:selectedAction.unit,col:col,row:row,timestamp:roundTime});log(`Torre ${selectedAction.unit} construída.`)}else{log("Construção inválida.")}}else if(selectedAction.type==='monster'){startGameIfNeeded();monsters.push(new Monster(path));playerActions.push({action:'spawn',type:selectedAction.unit,timestamp:roundTime});log(`Monstro ${selectedAction.unit} enviado.`)}allActionButtons.forEach(b=>b.classList.remove("selected"));selectedAction=null}

    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();log("A ronda começou!");requestAnimationFrame(gameLoop);}
    
    function executeGhostAction(action) {
        if (action.action === 'build') {
            ghostGold -= 100;
            const mirroredRow = (gridRows - 1) - action.row;
            ghostTowers.push(new Tower(action.col, mirroredRow, true));
            log(`Ghost construiu torre em (${action.col}, ${mirroredRow})`);
        } else if (action.action === 'spawn') {
            ghostGold -= 50; // Custo exemplo
            ghostMonsters.push(new Monster(ghostPath, true));
            log("Ghost enviou um monstro.");
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
            const canAfford = (waitingAction.action === 'build' && ghostGold >= 100) || (waitingAction.action === 'spawn' && ghostGold >= 50);
            if (canAfford) {
                executeGhostAction(waitingAction);
                ghostActionQueue.shift();
            }
        }

        // --- Processar Ações Agendadas do Ghost ---
        if (ghost && nextGhostActionIndex < ghostActions.length) {
            const nextAction = ghostActions[nextGhostActionIndex];
            if (roundTime >= nextAction.timestamp) {
                const canAfford = (nextAction.action === 'build' && ghostGold >= 100) || (nextAction.action === 'spawn' && ghostGold >= 50);
                if (canAfford) {
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
        if (ghostMonstersReachedEnd.length > 0) updateHealth(-10 * ghostMonstersReachedEnd.length);

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

    async function saveGhost(actions) { /* ... (código de salvar omitido) ... */ }
    async function loadGhost() { /* ... (código de carregar omitido) ... */ }
    function endGame(isVictory) { /* ... (código de fim de jogo omitido) ... */ }

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
    resetGame();
});
