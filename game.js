
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const goldSpan = document.getElementById('gold');
    const hpSpan = document.getElementById('hp');
    const timerSpan = document.getElementById('timer');

    // --- Seletores da UI com Cálculo Preciso ---
    const buttonContainer = document.getElementById('button-container');
    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const allActionButtons = document.querySelectorAll('.action-btn');
    const towerActionButtons = document.querySelectorAll('.tower-action');
    const monsterActionButtons = document.querySelectorAll('.monster-action');

    function log(message) { /* Implementação de log omitida */ }
    log('UI com Fontes JS-Driven Inicializada.');

    // ============== CONFIGURAÇÃO DO FIREBASE (Omitido) ==============
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============== CONFIGURAÇÕES E ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30; let gold, playerHealth, monsters, towers, gameStarted, roundTime, endRoundCooldown, isRoundEnding, spawnedMonstersCount, passiveGoldCooldown, monsterSpawnCooldown, playerActions, selectedAction, lastTime = 0;
    const path = (() => { const v=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:9,y:28},{x:9,y:26},{x:11,y:26},{x:11,y:29}]; const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p; })();
    function updateGold(a){gold+=a;goldSpan.textContent=gold}
    function updateHealth(a){playerHealth+=a;hpSpan.textContent=playerHealth;if(playerHealth<=0)endGame(false)}
    
    // --- Função de Redimensionamento com CÁLCULO PRECISO de Fonte ---
    function resize(){
        const targetAspectRatio = 1/2, windowAspectRatio = window.innerWidth/window.innerHeight;
        let w, h;
        if (windowAspectRatio > targetAspectRatio) { h = window.innerHeight; w = h * targetAspectRatio; }
        else { w = window.innerWidth; h = w / targetAspectRatio; }
        canvas.width = w;
        canvas.height = h;

        const bottomGameWidth = canvas.width * 0.9;
        buttonContainer.style.width = `${bottomGameWidth}px`;

        // *** CÁLCULO MATEMÁTICO DA FONTE ***
        const containerStyle = window.getComputedStyle(buttonContainer);
        const paddingLeft = parseFloat(containerStyle.paddingLeft);
        const paddingRight = parseFloat(containerStyle.paddingRight);
        const gap = parseFloat(containerStyle.gap);
        const availableWidth = buttonContainer.clientWidth - paddingLeft - paddingRight - (8 * gap);
        const buttonWidth = availableWidth / 9; 

        const actionFontSize = buttonWidth * 0.45; // 45% da largura do botão
        const menuFontSize = buttonWidth * 0.60;   // 60% da largura do botão

        towerActionButtons.forEach(btn => btn.style.fontSize = `${actionFontSize}px`);
        monsterActionButtons.forEach(btn => btn.style.fontSize = `${actionFontSize}px`);
        towerMenuBtn.style.fontSize = `${menuFontSize}px`;
        monsterMenuBtn.style.fontSize = `${menuFontSize}px`;

        drawGrid();
    }
    window.addEventListener('resize', resize);

    // --- Funções de Projeção e Desenho (sem alterações) ---
    function project(c,r){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=15,c,r)}
    function drawTile(i,p,c,r){const C=project(c,r),N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=i?"#2c3e50":(p?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=60,Y_B=canvas.height-100,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}
    
    // --- Classes (Monster, Tower) - Omitidas ---
    class Monster{constructor(){this.pathIndex=0;const s=path[0],c=getTileCenter(s.x,s.y);this.x=c.x;this.y=c.y;this.speed=80;this.radius=8;this.maxHealth=100;this.health=this.maxHealth;this.reachedEnd=false}takeDamage(a){this.health-=a}move(dT){if(this.pathIndex>=path.length-1){this.reachedEnd=true;return}const tN=path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD}}draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='red';ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5)}}
    class Tower{constructor(c,r){const C=getTileCenter(c,r);this.x=C.x;this.y=C.y;this.col=c;this.row=r;this.range=150;this.damage=10;this.fireRate=1;this.fireCooldown=0;this.target=null}draw(){ctx.fillStyle="#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill()}findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M}}}attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate}}}

    // ============== LÓGICA DE MENUS E AÇÕES (sem alterações) ==============
    towerMenuBtn.addEventListener('click', () => showActionButtons('towers'));
    monsterMenuBtn.addEventListener('click', () => showActionButtons('monsters'));
    allActionButtons.forEach(btn => btn.addEventListener('click', () => handleActionButtonClick(btn)));
    canvas.addEventListener('click', handleCanvasClick);

    function showActionButtons(menuType) { /*...*/ }
    function handleActionButtonClick(btn) { /*...*/ }
    function handleCanvasClick(e) { /*...*/ }

    // ============== CICLO, ESTADO E GHOSTS (sem alterações) ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();requestAnimationFrame(gameLoop);}
    function gameLoop(t){if(!gameStarted)return;const dT=(t-lastTime)/1000;lastTime=t;roundTime+=dT;passiveGoldCooldown-=dT;if(passiveGoldCooldown<=0){updateGold(1);passiveGoldCooldown=1}monsterSpawnCooldown-=dT;if(monsterSpawnCooldown<=0&&spawnedMonstersCount<5){monsters.push(new Monster());spawnedMonstersCount++;monsterSpawnCooldown=3}if(spawnedMonstersCount>=5&&monsters.length===0&&!isRoundEnding){isRoundEnding=true}if(isRoundEnding){endRoundCooldown-=dT;if(endRoundCooldown<=0){if(monsters.length===0){endGame(true);return}else{isRoundEnding=false;endRoundCooldown=5}}}monsters.forEach(m=>m.move(dT));towers.forEach(t=>{t.findTarget(monsters);t.attack(dT)});const mAE=monsters.filter(m=>m.reachedEnd);if(mAE.length>0){updateHealth(-10*mAE.length)}monsters=monsters.filter(m=>m.health>0&&!m.reachedEnd);drawGrid();towers.forEach(t=>t.draw());monsters.forEach(m=>m.draw());const min=Math.floor(roundTime/60).toString().padStart(2,'0'),sec=Math.floor(roundTime%60).toString().padStart(2,'0');timerSpan.textContent=`${min}:${sec}`;requestAnimationFrame(gameLoop);}
    async function saveGhost(a){/*...*/}
    function endGame(v){/*...*/}

    function resetGame(){
        gameStarted=false;log('A ronda começa com a sua primeira ação.');gold=500;playerHealth=100;monsters=[];towers=[];playerActions=[];spawnedMonstersCount=0;roundTime=0;endRoundCooldown=5;isRoundEnding=false;passiveGoldCooldown=1;monsterSpawnCooldown=3;selectedAction=null;updateGold(0);updateHealth(0);timerSpan.textContent="00:00";
        showActionButtons('towers');
        resize(); // resize() agora alinha a barra E CALCULA as fontes
    }
    
    // --- Funções omitidas para brevidade, sem alterações ---
    const originalShowActionButtons=function(t){t==="towers"?(towerActionButtons.forEach(t=>t.classList.remove("hidden")),monsterActionButtons.forEach(t=>t.classList.add("hidden")),towerMenuBtn.classList.add("active"),monsterMenuBtn.classList.remove("active")):(towerActionButtons.forEach(t=>t.classList.add("hidden")),monsterActionButtons.forEach(t=>t.classList.remove("hidden")),monsterMenuBtn.classList.add("active"),towerMenuBtn.classList.remove("active")),allActionButtons.forEach(t=>t.classList.remove("selected")),selectedAction=null};showActionButtons=originalShowActionButtons;const originalHandleActionButtonClick=function(t){const o=t.dataset.type,n=t.dataset.unit;allActionButtons.forEach(t=>t.classList.remove("selected")),t.classList.add("selected"),selectedAction={type:o,unit:n},"tower"===o&&log(`Modo construção: ${n}.`),"monster"===o&&(startGameIfNeeded(),playerActions.push({action:"spawn",type:n,timestamp:roundTime}),log(`Ação Gravada: Enviar ${n}`))};handleActionButtonClick=originalHandleActionButtonClick;const originalHandleCanvasClick=function(t){if(!selectedAction||"tower"!==selectedAction.type)return;const o=canvas.getBoundingClientRect(),n=t.clientX-o.left,e=t.clientY-o.top,{col:a,row:c}=screenToGrid(n,e),i=col>=0&&c>=15&&!path.some(t=>t.x===a&&t.y===c)&&!towers.some(t=>t.col===a&&t.row===c)&&gold>=100;i?(startGameIfNeeded(),updateGold(-100),towers.push(new Tower(a,c)),playerActions.push({action:"build",type:selectedAction.unit,col:a,row:c,timestamp:roundTime}),log(`Torre ${selectedAction.unit} construída.`)):log("Construção inválida."),allActionButtons.forEach(t=>t.classList.remove("selected")),selectedAction=null};handleCanvasClick=originalHandleCanvasClick;

    // ============== PONTO DE ENTRADA ==============
    resetGame();
});
