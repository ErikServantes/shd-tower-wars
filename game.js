
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Elementos da UI
    const playerHpSpan = document.getElementById('player-hp');
    const playerGoldSpan = document.getElementById('player-gold');
    const enemyHpSpan = document.getElementById('enemy-hp');
    const enemyGoldSpan = document.getElementById('enemy-gold');
    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const endGameOverlay = document.getElementById('end-game-overlay');
    const endGameMessage = document.getElementById('end-game-message');
    const replayBtn = document.getElementById('replay-btn');

    function log(message) { console.log(message); }

    // ============== CONFIGURAÇÃO DO JOGO (CARREGADO DE JSON) ==============
    let towerData, monsterData;

    // ============== CONFIGURAÇÃO DO FIREBASE ==============
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============== ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    let playerGold, playerHealth, monsters, towers, playerActions, selectedAction, hoveredTower, projectiles;
    let gameStarted, roundTime, lastTime;
    let ghost, ghostActions, ghostGold, ghostHealth, ghostTowers, ghostMonsters, nextGhostActionIndex;

    const ghostPath = (() => { const v = [{x: 4, y: 0}, {x: 4, y: 3}, {x: 6, y: 3}, {x: 6, y: 1}, {x: 8, y: 1}, {x: 8, y: 5}, {x: 13, y: 5}, {x: 13, y: 9}, {x: 6, y: 9}, {x: 6, y: 6}, {x: 2, y: 6}, {x: 2, y: 13}, {x: 7, y: 13}, {x: 7, y: 16}, {x: 12, y: 16}, {x: 12, y: 23}, {x: 9, y: 23}, {x: 8, y: 23}, {x: 8, y: 20}, {x: 1, y: 20}, {x: 1, y: 24}, {x: 6, y: 24}, {x: 6, y: 28}, {x: 8, y: 28}, {x: 8, y: 26}, {x: 10, y: 26}, {x: 10, y: 29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    const playerPath = [...ghostPath].reverse();

    // Funções de atualização da HUD
    function updatePlayerGold(amount) { playerGold += amount; playerGoldSpan.textContent = Math.floor(playerGold); }
    function updatePlayerHealth(amount) { playerHealth += amount; playerHpSpan.textContent = playerHealth; if (playerHealth <= 0) { playerHpSpan.textContent = 0; endGame(false); } }
    function updateGhostGold(amount) { ghostGold += amount; enemyGoldSpan.textContent = Math.floor(ghostGold); }
    function updateGhostHealth(amount) { ghostHealth += amount; enemyHpSpan.textContent = ghostHealth; if (ghostHealth <= 0) { enemyHpSpan.textContent = 0; endGame(true); } }

    // ============== FUNÇÕES DE DESENHO E PROJEÇÃO ==============
    function resize(){canvas.width=canvas.clientWidth,canvas.height=canvas.clientHeight,drawGrid()}window.addEventListener("resize",resize);function project(c,r){const P=.35,Y_T=0,Y_B=canvas.height,T_Y=Y_B-Y_T,W_B=canvas.width,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}function screenToGrid(sX,sY){const P=.35,Y_T=0,Y_B=canvas.height,T_Y=Y_B-Y_T,W_B=canvas.width,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const rR=(sY-Y_T)/T_Y,row=Math.floor(rR*(gridRows-1)),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2;if(sX<sX_||sX>sX_+w)return{col:-1,row:-1};const col=Math.floor((sX-sX_)/tW);return{col,row}}function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(ghostPath.some(p=>p.x===c&&p.y===r),r>=15,c,r)}function drawTile(isPath,isPlayerArea,c,r){const C=project(c,r),N=project(c,r+1);if(C.y>canvas.height)return;ctx.beginPath(),ctx.moveTo(C.x,C.y),ctx.lineTo(C.x+C.tileWidth,C.y),ctx.lineTo(N.x+N.tileWidth,N.y),ctx.lineTo(N.x,N.y),ctx.closePath(),ctx.fillStyle=isPath?"#2c3e50":isPlayerArea?"#27ae6088":"#c0392b88",ctx.strokeStyle="rgba(255,255,255,0.1)",ctx.fill(),ctx.stroke()}function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:(C.x+C.tileWidth/2+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2}}

    // ============== CLASSES DO JOGO ==============
    class Projectile{constructor(x,y,target,damage,owner){this.x=x,this.y=y,this.target=target,this.damage=damage,this.owner=owner,this.speed=400}move(dT){if(!this.target||this.target.health<=0)return;const dX=this.target.x-this.x,dY=this.target.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),moveDist=this.speed*dT;dist<moveDist?(this.x=this.target.x,this.y=this.target.y):(this.x+=dX/dist*moveDist,this.y+=dY/dist*moveDist)}draw(){ctx.fillStyle="yellow",ctx.beginPath(),ctx.arc(this.x,this.y,3,0,2*Math.PI),ctx.fill()}}
    class Monster{constructor(t,l,p){const c=monsterData[t].levels[l-1];this.type=t,this.level=l,this.path=p,this.pathIndex=0,this.health=c.health,this.maxHealth=c.health,this.speed=c.speed,this.reward=c.reward;const s=getTileCenter(p[0].x,p[0].y);this.x=s.x,this.y=s.y,this.reachedEnd=!1}move(dT){if(this.reachedEnd||!dT)return;const tI=this.pathIndex,tP=this.path[tI],tC=getTileCenter(tP.x,tP.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD)this.pathIndex++,this.pathIndex>=this.path.length?this.reachedEnd=!0:this.move(dT-dist/this.speed);else this.x+=dX/dist*mD,this.y+=dY/dist*mD}draw(){ctx.fillStyle='red',ctx.beginPath(),ctx.arc(this.x,this.y,10,0,2*Math.PI),ctx.fill()}}
    class Tower{constructor(t,l,c,r,owner){const d=towerData[t].levels[l-1];this.type=t,this.level=l,this.col=c,this.row=r,this.damage=d.damage,this.range=d.range,this.fireRate=d.fireRate,this.cost=d.cost,this.owner=owner;const p=getTileCenter(c,r);this.x=p.x,this.y=p.y,this.target=null,this.fireCooldown=0}findTarget(monsters){if(this.target&&this.target.health>0&&Math.sqrt(Math.pow(this.x-this.target.x,2)+Math.pow(this.y-this.target.y,2))<=this.range)return;this.target=null;let closestTarget=null,minDistance=1/0;for(const monster of monsters){const distance=Math.sqrt(Math.pow(this.x-monster.x,2)+Math.pow(this.y-monster.y,2));distance<=this.range&&distance<minDistance&&(minDistance=distance,closestTarget=monster)}this.target=closestTarget}attack(dT){if(!this.target)return;this.fireCooldown-=dT,this.fireCooldown<=0&&(projectiles.push(new Projectile(this.x,this.y,this.target,this.damage,this.owner)),this.fireCooldown=1/this.fireRate)}draw(){const p=getTileCenter(this.col,this.row);ctx.fillStyle='blue',ctx.beginPath(),ctx.arc(p.x,p.y,10,0,2*Math.PI),ctx.fill()}}

    // ============== LÓGICA DE UI E AÇÕES ==============
    towerMenuBtn.addEventListener('click',()=>showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click',()=>showActionButtons('monsters'));
    document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',()=>handleActionButtonClick(btn)));
    canvas.addEventListener('click',handleCanvasClick);
    canvas.addEventListener('mousemove',handleMouseMove);
    canvas.addEventListener("mouseleave",()=>{hoveredTower=null});
    document.addEventListener('keydown',handleKeyPress);
    replayBtn.addEventListener('click', resetGame);

    function handleMouseMove(e){const rect=canvas.getBoundingClientRect(),sX=e.clientX-rect.left,sY=e.clientY-rect.top,{col,row}=screenToGrid(sX,sY);if(selectedAction&&"tower"===selectedAction.type){if(col<0||row<0){selectedAction.ghostTower.visible=!1;return}selectedAction.ghostTower.visible=!0;const p=getTileCenter(col,row);selectedAction.ghostTower.x=p.x,selectedAction.ghostTower.y=p.y,selectedAction.ghostTower.col=col,selectedAction.ghostTower.row=row;const t=selectedAction.unit,o=towerData[t].levels[0];selectedAction.ghostTower.range=o.range,selectedAction.ghostTower.isValid=playerGold>=o.cost&&row>=15&&!ghostPath.some(t=>t.x===col&&t.y===row)&&!towers.some(t=>t.col===col&&t.row===row),hoveredTower=null}else{if(col<0||row<0){hoveredTower=null;return}const t=[...towers,...ghostTowers].find(t=>t.col===col&&t.row===row);hoveredTower=t||null}}
    function spawnPlayerMonster(unitType){const level=1,config=monsterData[unitType].levels[level-1];playerGold>=config.cost&&(startGameIfNeeded(),updatePlayerGold(-config.cost),monsters.push(new Monster(unitType,level,playerPath)),playerActions.push({action:'spawn',type:unitType,level:level,timestamp:roundTime}))}
    function spawnGhostMonster(unitType,level){const config=monsterData[unitType].levels[level-1];ghostGold>=config.cost&&(updateGhostGold(-config.cost),ghostMonsters.push(new Monster(unitType,level,ghostPath)))}
    function buildGhostTower(unitType,level,col,row){const config=towerData[unitType].levels[level-1];ghostGold>=config.cost&&(updateGhostGold(-config.cost),ghostTowers.push(new Tower(unitType,level,col,row,'ghost')))}
    function handleKeyPress(e){"Escape"===e.key&&selectedAction&&(selectedAction.button.classList.remove("selected"),selectedAction=null);const t=parseInt(e.key);if(isNaN(t)||t<1||t>7)return;const o=Object.keys(monsterData),n=o[t-1];n&&spawnPlayerMonster(n)}
    function handleActionButtonClick(btn){const unit=btn.dataset.unit,type=btn.dataset.type;if("monster"===type)spawnPlayerMonster(unit);else if("tower"===type&&towerData&&towerData[unit]){if(selectedAction&&selectedAction.button===btn){btn.classList.remove("selected"),selectedAction=null;return}selectedAction&&selectedAction.button.classList.remove("selected"),btn.classList.add("selected"),selectedAction={button:btn,type:type,unit:unit,ghostTower:{visible:!1,x:0,y:0,col:-1,row:-1,range:0,isValid:!1}}}}
    function handleCanvasClick(e){if(!selectedAction||"tower"!==selectedAction.type)return;const{col,row,isValid}=selectedAction.ghostTower;if(!isValid)return;const unitType=selectedAction.unit,level=1,config=towerData[unitType].levels[level-1];playerGold>=config.cost&&(startGameIfNeeded(),updatePlayerGold(-config.cost),towers.push(new Tower(unitType,level,col,row,'player')),playerActions.push({action:"build",type:unitType,level:level,col:col,row:row,timestamp:roundTime}),selectedAction.button.classList.remove("selected"),selectedAction=null)}
    function updateActionButtons(){document.querySelectorAll(".action-btn").forEach(btn=>{const t=btn.dataset.unit,e=btn.dataset.type,o="tower"===e?towerData:monsterData,n=btn.querySelector(".unit-symbol"),s=btn.querySelector(".unit-cost");n&&(n.textContent=''),s&&(s.textContent=''),o&&o[t]&&o[t].levels&&o[t].levels[0]&&(n&&(n.textContent=o[t].symbol||""),s&&(s.textContent=`$${o[t].levels[0].cost}`))})}function showActionButtons(t){const e="towers"===t;document.querySelectorAll(".tower-action").forEach(t=>t.classList.toggle("hidden",!e)),document.querySelectorAll(".monster-action").forEach(t=>t.classList.toggle("hidden",e)),towerMenuBtn.classList.toggle("active",e),monsterMenuBtn.classList.toggle("active",!e),selectedAction&&(selectedAction.button.classList.remove("selected"),selectedAction=null)}

    // ============== CICLO DE JOGO ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=!0,lastTime=performance.now(),requestAnimationFrame(gameLoop)}
    function gameLoop(timestamp){if(!gameStarted)return;const dT=(timestamp-lastTime)/1e3;lastTime=timestamp,roundTime+=dT,updatePlayerGold(1*dT),ghost&&updateGhostGold(1*dT);if(ghost&&-1!==nextGhostActionIndex)for(;nextGhostActionIndex<ghostActions.length&&roundTime>=ghostActions[nextGhostActionIndex].timestamp;){const t=ghostActions[nextGhostActionIndex];if("spawn"===t.action)spawnGhostMonster(t.type,t.level);else if("build"===t.action){const e=gridCols-1-t.col,o=gridRows-1-t.row;buildGhostTower(t.type,t.level,e,o)}nextGhostActionIndex++}monsters.forEach(t=>t.move(dT)),ghostMonsters.forEach(t=>t.move(dT)),towers.forEach(t=>{t.findTarget(ghostMonsters),t.attack(dT)}),ghostTowers.forEach(t=>{t.findTarget(monsters),t.attack(dT)});for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.move(dT);const dX=p.target.x-p.x,dY=p.target.y-p.y;Math.sqrt(dX*dX+dY*dY)<5?(p.target.health-=p.damage,p.target.health<=0&&("player"===p.owner?updatePlayerGold(p.target.reward):updateGhostGold(p.target.reward),p.target=null),projectiles.splice(i,1)):p.target&&p.target.health>0||projectiles.splice(i,1)}const playerLeaked=monsters.filter(m=>m.reachedEnd),ghostLeaked=ghostMonsters.filter(m=>m.reachedEnd);playerLeaked.length>0&&updateGhostHealth(-10*playerLeaked.length),ghostLeaked.length>0&&updatePlayerHealth(-10*ghostLeaked.length),monsters=monsters.filter(t=>t.health>0&&!t.reachedEnd),ghostMonsters=ghostMonsters.filter(t=>t.health>0&&!t.reachedEnd),drawGrid(),towers.forEach(t=>t.draw()),ghostTowers.forEach(t=>t.draw()),monsters.forEach(t=>t.draw()),ghostMonsters.forEach(t=>t.draw()),projectiles.forEach(p=>p.draw()),hoveredTower&&(ctx.beginPath(),ctx.arc(hoveredTower.x,hoveredTower.y,hoveredTower.range,0,2*Math.PI),ctx.fillStyle="rgba(255, 255, 255, 0.2)",ctx.fill()),selectedAction&&"tower"===selectedAction.type&&selectedAction.ghostTower.visible&&(()=>{const{x,y,range,isValid}=selectedAction.ghostTower;ctx.beginPath(),ctx.arc(x,y,10,0,2*Math.PI),ctx.fillStyle=isValid?"rgba(0, 100, 255, 0.5)":"rgba(255, 0, 0, 0.5)",ctx.fill(),ctx.beginPath(),ctx.arc(x,y,range,0,2*Math.PI),ctx.fillStyle=isValid?"rgba(0, 100, 255, 0.2)":"rgba(255, 0, 0, 0.2)",ctx.fill()})(),ghost&&nextGhostActionIndex>=ghostActions.length&&0===monsters.length&&0===ghostMonsters.length&&endGame(!0),requestAnimationFrame(gameLoop)}

    // ============== FUNÇÕES DE ESTADO DO JOGO ==============
    async function loadGameData(){try{const t=`?v=${(new Date).getTime()}`,[e,o]=await Promise.all([fetch(`towers.json${t}`),fetch(`monsters.json${t}`)]);towerData=await e.json(),monsterData=await o.json(),log("Dados de Torres e Monstros carregados.")}catch(t){log(`Erro ao carregar dados do jogo: ${t}`)}}
    
    function endGame(isVictory){
        if (!gameStarted) return; // Previne que a função seja chamada múltiplas vezes
        gameStarted = false;
        endGameMessage.textContent = isVictory ? "Vitória!" : "Derrota!";
        endGameOverlay.classList.remove('hidden');
        saveGhost(playerActions);
    }

    async function saveGhost(actions){actions.length>0?await db.collection("ghosts").add({actions:actions,timestamp:firebase.firestore.FieldValue.serverTimestamp()}).then(()=>log("Ghost salvo com sucesso.")).catch(e=>log("Erro ao salvar ghost: "+e)):log("Nenhuma ação para salvar.")}
    async function loadGhost(){try{const t=await db.collection("ghosts").orderBy("timestamp","desc").limit(1).get();if(t.empty)throw new Error("Nenhum ghost no Firebase.");ghost=t.docs[0].data(),ghostActions=ghost.actions,log("Ghost carregado do Firebase.")}catch(t){log(`${t.message} A carregar ghost local...`);try{const t=await fetch("ghost.json");if(!t.ok)throw new Error("Falha ao carregar ghost.json");ghost=await t.json(),ghostActions=ghost.actions,log("Ghost local carregado com sucesso.")}catch(t){log(`Erro ao carregar ghost local: ${t}`),ghost=null,ghostActions=[]}}}

    async function resetGame(){
        endGameOverlay.classList.add('hidden');
        gameStarted=false,playerGold=500,playerHealth=100,monsters=[],towers=[],playerActions=[],projectiles=[],ghostGold=500,ghostHealth=100,ghostTowers=[],ghostMonsters=[],roundTime=0,selectedAction=null,hoveredTower=null,lastTime=null;
        updatePlayerGold(0),updatePlayerHealth(0),updateGhostGold(0),updateGhostHealth(0);
        await loadGhost(),
        nextGhostActionIndex=ghost?0:-1,
        showActionButtons('towers'),
        resize();
        // O jogo começará na próxima ação do jogador através de startGameIfNeeded()
    }
    
    // ============== PONTO DE ENTRADA ==============
    async function main() { 
        await loadGameData();
        updateActionButtons(); 
        await resetGame();
    }

    main();
});
