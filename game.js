
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const playerHpSpan = document.getElementById('player-hp');
    const playerGoldSpan = document.getElementById('player-gold');
    const enemyHpSpan = document.getElementById('enemy-hp');
    const enemyGoldSpan = document.getElementById('enemy-gold');

    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');

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
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex;

    const ghostPath = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const playerPath = [...ghostPath].reverse();

    // Funções de atualização da HUD
    function updatePlayerGold(amount) { playerGold += amount; playerGoldSpan.textContent = Math.floor(playerGold); }
    function updatePlayerHealth(amount) { playerHealth += amount; playerHpSpan.textContent = playerHealth; if (playerHealth <= 0) endGame(false); }
    function updateGhostGold(amount) { ghostGold += amount; enemyGoldSpan.textContent = Math.floor(ghostGold); }
    function updateGhostHealth(amount) { ghostHealth += amount; enemyHpSpan.textContent = ghostHealth; if (ghostHealth <= 0) endGame(true); }

    // ============== FUNÇÕES DE DESENHO E PROJEÇÃO ==============
    function resize(){canvas.width=canvas.clientWidth,canvas.height=canvas.clientHeight,drawGrid()}window.addEventListener("resize",resize);function project(c,r){const P=.35,Y_T=0,Y_B=canvas.height,T_Y=Y_B-Y_T,W_B=canvas.width,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}function screenToGrid(sX,sY){const P=.35,Y_T=0,Y_B=canvas.height,T_Y=Y_B-Y_T,W_B=canvas.width,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const rR=(sY-Y_T)/T_Y,row=Math.floor(rR*(gridRows-1)),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2;if(sX<sX_||sX>sX_+w)return{col:-1,row:-1};const col=Math.floor((sX-sX_)/tW);return{col,row}}function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(ghostPath.some(p=>p.x===c&&p.y===r),r>=15,c,r)}function drawTile(isPath,isPlayerArea,c,r){const C=project(c,r),N=project(c,r+1);if(C.y>canvas.height)return;ctx.beginPath(),ctx.moveTo(C.x,C.y),ctx.lineTo(C.x+C.tileWidth,C.y),ctx.lineTo(N.x+N.tileWidth,N.y),ctx.lineTo(N.x,N.y),ctx.closePath(),ctx.fillStyle=isPath?"#2c3e50":isPlayerArea?"#27ae6088":"#c0392b88",ctx.strokeStyle="rgba(255,255,255,0.1)",ctx.fill(),ctx.stroke()}function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:(C.x+C.tileWidth/2+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2}}

    // ============== CLASSES DO JOGO ==============
    class Monster{constructor(t,l,p){const c=monsterData[t].levels[l-1];this.type=t,this.level=l,this.path=p,this.pathIndex=0,this.health=c.health,this.maxHealth=c.health,this.speed=c.speed,this.reward=c.reward;const s=getTileCenter(p[0].x,p[0].y);this.x=s.x,this.y=s.y,this.reachedEnd=!1}move(dT){if(this.reachedEnd)return;const tI=this.pathIndex,tP=this.path[tI],tC=getTileCenter(tP.x,tP.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD)this.pathIndex++,this.pathIndex>=this.path.length?this.reachedEnd=!0:this.move(dT-dist/this.speed);else this.x+=dX/dist*mD,this.y+=dY/dist*mD}draw(){ctx.fillStyle='red',ctx.beginPath(),ctx.arc(this.x,this.y,10,0,2*Math.PI),ctx.fill()}}
    class Tower{constructor(t,l,c,r){const d=towerData[t].levels[l-1];this.type=t,this.level=l,this.col=c,this.row=r,this.damage=d.damage,this.range=d.range,this.fireRate=d.fireRate,this.cost=d.cost;const p=getTileCenter(c,r);this.x=p.x,this.y=p.y,this.target=null,this.fireCooldown=0}findTarget(m){if(this.target&&this.target.health>0&&Math.sqrt(Math.pow(this.x-this.target.x,2)+Math.pow(this.y-this.target.y,2))<=this.range)return;this.target=null;let cT=null,mD=1/0;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));d<=this.range&&d<mD&&(mD=d,cT=M)}this.target=cT}attack(dT){if(!this.target)return;this.fireCooldown-=dT,this.fireCooldown<=0&&(this.target.health-=this.damage,this.target.health<=0&&(updatePlayerGold(this.target.reward),this.target=null),this.fireCooldown=1/this.fireRate)}draw(){const p=getTileCenter(this.col,this.row);ctx.fillStyle='blue',ctx.beginPath(),ctx.arc(p.x,p.y,10,0,2*Math.PI),ctx.fill()}}

    // ============== LÓGICA DE UI E AÇÕES ==============
    towerMenuBtn.addEventListener('click',()=>showActionButtons('towers'));monsterMenuBtn.addEventListener('click',()=>showActionButtons('monsters'));document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',()=>handleActionButtonClick(btn)));canvas.addEventListener('click',handleCanvasClick);document.addEventListener('keydown',handleKeyPress);

    function spawnPlayerMonster(unitType){const level=1,config=monsterData[unitType].levels[level-1];playerGold>=config.cost&&(startGameIfNeeded(),updatePlayerGold(-config.cost),monsters.push(new Monster(unitType,level,playerPath)),playerActions.push({action:'spawn',type:unitType,level:level,timestamp:roundTime}))}
    function spawnGhostMonster(unitType,level){const config=monsterData[unitType].levels[level-1];ghostGold>=config.cost&&(updateGhostGold(-config.cost),ghostMonsters.push(new Monster(unitType,level,ghostPath)))}
    function buildGhostTower(unitType,level,col,row){const config=towerData[unitType].levels[level-1];ghostGold>=config.cost&&(updateGhostGold(-config.cost),ghostTowers.push(new Tower(unitType,level,col,row)))}
    function handleKeyPress(e){const keyNum=parseInt(e.key);if(isNaN(keyNum)||keyNum<1||keyNum>7)return;const monsterTypes=Object.keys(monsterData),unitType=monsterTypes[keyNum-1];unitType&&spawnPlayerMonster(unitType)}
    function handleActionButtonClick(btn){const unit=btn.dataset.unit,type=btn.dataset.type;'monster'===type?spawnPlayerMonster(unit):'tower'===type&&(towerData&&towerData[unit]&& (selectedAction&&selectedAction.button===btn?(btn.classList.remove('selected'),selectedAction=null):(selectedAction&&selectedAction.button.classList.remove('selected'),btn.classList.add('selected'),selectedAction={button:btn,type:type,unit:unit})))}
    function handleCanvasClick(e){if(!selectedAction||'tower'!==selectedAction.type)return;const rect=canvas.getBoundingClientRect(),sX=e.clientX-rect.left,sY=e.clientY-rect.top,{col,row}=screenToGrid(sX,sY);if(col<0||row<0)return;const unitType=selectedAction.unit,level=1,config=towerData[unitType].levels[level-1];playerGold>=config.cost&&row>=15&&!ghostPath.some(p=>p.x===col&&p.y===row)&&!towers.some(t=>t.col===col&&t.row===row)&&(startGameIfNeeded(),updatePlayerGold(-config.cost),towers.push(new Tower(unitType,level,col,row)),playerActions.push({action:'build',type:unitType,level:level,col:col,row:row,timestamp:roundTime}))}
    function updateActionButtons(){document.querySelectorAll(".action-btn").forEach(btn=>{const t=btn.dataset.unit,e=btn.dataset.type,o='tower'===e?towerData:monsterData,n=btn.querySelector(".unit-symbol"),s=btn.querySelector(".unit-cost");n&&(n.textContent=''),s&&(s.textContent=''),o&&o[t]&&o[t].levels&&o[t].levels[0]&&(n&&(n.textContent=o[t].symbol||""),s&&(s.textContent=`$${o[t].levels[0].cost}`))})}function showActionButtons(t){const e='towers'===t;document.querySelectorAll(".tower-action").forEach(t=>t.classList.toggle("hidden",!e)),document.querySelectorAll(".monster-action").forEach(t=>t.classList.toggle("hidden",e)),towerMenuBtn.classList.toggle("active",e),monsterMenuBtn.classList.toggle("active",!e),selectedAction&&(selectedAction.button.classList.remove("selected"),selectedAction=null)}

    // ============== CICLO DE JOGO (CORRIGIDO) ==============
    function startGameIfNeeded() {
        if (gameStarted) return;
        gameStarted = true;
        requestAnimationFrame(gameLoop);
    }

    function gameLoop(timestamp) {
        if (!gameStarted) return;

        // CORREÇÃO: Lida com a inicialização do tempo no primeiro frame para evitar dT gigante
        if (lastTime === 0) {
            lastTime = timestamp;
        }
        const dT = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        roundTime += dT;
        updatePlayerGold(1 * dT);
        if (ghost) updateGhostGold(1 * dT);

        if (ghost && nextGhostActionIndex !== -1) {
            while (nextGhostActionIndex < ghostActions.length && roundTime >= ghostActions[nextGhostActionIndex].timestamp) {
                const action = ghostActions[nextGhostActionIndex];
                if (action.action === 'spawn') {
                    spawnGhostMonster(action.type, action.level);
                } else if (action.action === 'build') {
                    buildGhostTower(action.type, action.level, action.col, action.row);
                }
                nextGhostActionIndex++;
            }
        }

        monsters.forEach(m => m.move(dT));
        ghostMonsters.forEach(m => m.move(dT));
        towers.forEach(t => { t.findTarget(ghostMonsters); t.attack(dT); });
        ghostTowers.forEach(t => { t.findTarget(monsters); t.attack(dT); });

        const pMRE = monsters.filter(m => m.reachedEnd);
        if (pMRE.length > 0) updateGhostHealth(-10 * pMRE.length);
        const gMRE = ghostMonsters.filter(m => m.reachedEnd);
        if (gMRE.length > 0) updatePlayerHealth(-10 * gMRE.length);

        monsters = monsters.filter(m => m.health > 0 && !m.reachedEnd);
        ghostMonsters = ghostMonsters.filter(m => m.health > 0 && !m.reachedEnd);

        drawGrid();
        towers.forEach(t => t.draw());
        ghostTowers.forEach(t => t.draw());
        monsters.forEach(m => m.draw());
        ghostMonsters.forEach(m => m.draw());

        if (ghost && nextGhostActionIndex >= ghostActions.length && monsters.length === 0 && ghostMonsters.length === 0) {
            endGame(true);
        }
        requestAnimationFrame(gameLoop);
    }

    // ============== FUNÇÕES DE ESTADO DO JOGO ==============
    async function loadGameData(){try{const t=`?v=${(new Date).getTime()}`,[e,o]=await Promise.all([fetch(`towers.json${t}`),fetch(`monsters.json${t}`)]);towerData=await e.json(),monsterData=await o.json(),log("Dados de Torres e Monstros carregados.")}catch(t){log(`Erro ao carregar dados do jogo: ${t}`)}}
    function endGame(isVictory){gameStarted=!1,alert(isVictory?"Vitória!":"Derrota!"),saveGhost(playerActions).then(()=>resetGame())}
    async function saveGhost(actions){actions.length>0?await db.collection("ghosts").add({actions:actions,timestamp:firebase.firestore.FieldValue.serverTimestamp()}).then(()=>log("Ghost salvo com sucesso.")).catch(e=>log("Erro ao salvar ghost: "+e)):log("Nenhuma ação para salvar.")}
    async function loadGhost(){try{const t=await db.collection("ghosts").orderBy("timestamp","desc").limit(1).get();if(t.empty)throw new Error("Nenhum ghost no Firebase.");ghost=t.docs[0].data(),ghostActions=ghost.actions,log("Ghost carregado do Firebase.")}catch(t){log(`${t.message} A carregar ghost local...`);try{const t=await fetch("ghost.json");if(!t.ok)throw new Error("Falha ao carregar ghost.json");ghost=await t.json(),ghostActions=ghost.actions,log("Ghost local carregado com sucesso.")}catch(t){log(`Erro ao carregar ghost local: ${t}`),ghost=null,ghostActions=[]}}}

    async function resetGame() {
        gameStarted = !1, playerGold = 500, playerHealth = 100, monsters = [], towers = [], playerActions = [], 
        ghostGold = 500, ghostHealth = 100, ghostTowers = [], ghostMonsters = [],
        roundTime = 0, selectedAction = null, lastTime = 0,
        updatePlayerGold(0), updatePlayerHealth(0), updateGhostGold(0), updateGhostHealth(0), 
        await loadGhost(), 
        nextGhostActionIndex = ghost ? 0 : -1, 
        showActionButtons('towers'), 
        resize()
    }
    
    // ============== PONTO DE ENTRADA ==============
    async function main() { await loadGameData(), updateActionButtons(), await resetGame() }

    main();
});
