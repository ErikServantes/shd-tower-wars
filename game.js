
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const debugConsole = document.getElementById('debug-console');
    const goldSpan = document.getElementById('gold');
    const hpSpan = document.getElementById('hp');
    const timerSpan = document.getElementById('timer');
    const actionButtons = document.querySelectorAll('.action-btn');

    function log(message) { /* ... log implementation ... */ }
    log('Jogo em modo de início dinâmico.');

    // ============== CONFIGURAÇÃO DO FIREBASE ==============
    const firebaseConfig = {
        apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM",
        authDomain: "shd-towerwars.firebaseapp.com",
        projectId: "shd-towerwars",
        storageBucket: "shd-towerwars.firebasestorage.app",
        messagingSenderId: "251334988662",
        appId: "1:251334988662:web:51fc38287cbf45f485e057",
        measurementId: "G-Z3EDB6BC3G"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    log("Firebase conectado. Pronto para guardar Ghosts.");

    // ============== CONFIGURAÇÕES E ESTADO DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    const MONSTERS_PER_ROUND = 5;
    const PASSIVE_GOLD_RATE = 1;
    let gold, playerHealth, monsters, towers, gameStarted;
    let roundTime, endRoundCooldown, isRoundEnding, spawnedMonstersCount, passiveGoldCooldown, monsterSpawnCooldown;
    let playerActions, selectedAction, lastTime = 0;

    function generatePathFromVertices(v){/*...*/const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p}
    const vertices = [
        {x: 4, y: 0}, {x: 4, y: 3}, {x: 6, y: 3}, {x: 6, y: 1}, {x: 8, y: 1}, 
        {x: 8, y: 5}, {x: 13, y: 5}, {x: 13, y: 9}, {x: 6, y: 9}, {x: 6, y: 6}, 
        {x: 2, y: 6}, {x: 2, y: 13}, {x: 7, y: 13}, {x: 7, y: 16}, {x: 12, y: 16}, 
        {x: 12, y: 23}, {x: 9, y: 23}, {x: 9, y: 20}, {x: 2, y: 20}, {x: 2, y: 24}, 
        {x: 7, y: 24}, {x: 7, y: 28}, {x: 9, y: 28}, {x: 9, y: 26}, {x: 11, y: 26}, 
        {x: 11, y: 29}
    ];
    const path=generatePathFromVertices(vertices);
    function updateGold(a){gold+=a;goldSpan.textContent=gold}
    function updateHealth(a){playerHealth+=a;hpSpan.textContent=playerHealth;if(playerHealth<=0)endGame(false)}
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;if(gameStarted)drawGrid();}
    window.addEventListener('resize',resize);
    function project(c,r){const P=0.3,Y_T=100,Y_B=canvas.height-50,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=15,c,r)}
    function drawTile(i,p,c,r){const C=project(c,r),N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=i?"#2c3e50":(p?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=100,Y_B=canvas.height-50,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}
    
    class Monster{ /*...*/ constructor(){this.pathIndex=0;const s=path[0],c=getTileCenter(s.x,s.y);this.x=c.x;this.y=c.y;this.speed=80;this.radius=8;this.maxHealth=100;this.health=this.maxHealth;this.reachedEnd=false;}takeDamage(a){this.health-=a;}move(dT){if(this.pathIndex>=path.length-1){this.reachedEnd=true;return;}const tN=path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y;}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD;}}draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='red';ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5);}}
    class Tower{ /*...*/ constructor(c,r){const C=getTileCenter(c,r);this.x=C.x;this.y=C.y;this.col=c;this.row=r;this.range=150;this.damage=10;this.fireRate=1;this.fireCooldown=0;this.target=null;}draw(){ctx.fillStyle="#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill();}findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M;}}}attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate;}}}

    // ============== LÓGICA DE AÇÕES E CONSTRUÇÃO ==============
    actionButtons.forEach(btn => btn.addEventListener('click', () => handleActionButtonClick(btn)));
    canvas.addEventListener('click', handleCanvasClick);

    function handleActionButtonClick(btn) {
        const type = btn.dataset.type, unit = btn.dataset.unit;
        if (btn.classList.contains('selected')) {
            btn.classList.remove('selected'); selectedAction = null;
        } else {
            actionButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected'); selectedAction = { type, unit };
            if (type === 'tower') log(`Modo construção: ${unit}.`);
        }
        if (type === 'monster') {
            startGameIfNeeded();
            const action = { action: 'spawn', type: unit, timestamp: roundTime };
            playerActions.push(action);
            log(`Ação Gravada: Enviar ${unit}`);
            btn.classList.remove('selected'); selectedAction = null;
        }
    }

    function handleCanvasClick(e) {
        if (!selectedAction || selectedAction.type !== 'tower') return;
        const rect=canvas.getBoundingClientRect(),cX=e.clientX-rect.left,cY=e.clientY-rect.top;
        const {col,row} = screenToGrid(cX,cY);
        const TOWER_COST=100,canBuild=col>=0&&row>=15&&!path.some(p=>p.x===col&&p.y===row)&&!towers.some(t=>t.col===col&&t.row===row)&&gold>=TOWER_COST;
        if(canBuild){startGameIfNeeded();updateGold(-TOWER_COST);towers.push(new Tower(col,row));const action={action:'build',type:selectedAction.unit,col,row,timestamp:roundTime};playerActions.push(action);log(`Torre construída em (${col},${row}).`);document.querySelector('.action-btn.selected')?.classList.remove('selected');selectedAction=null;}else{log("Construção inválida.");}}

    // ============== CICLO, ESTADO E GHOSTS ==============
    function startGameIfNeeded(){if(gameStarted)return;gameStarted=true;lastTime=performance.now();log('A ronda começou!');requestAnimationFrame(gameLoop);}
    function gameLoop(t){if(!gameStarted)return;const dT=(t-lastTime)/1000;lastTime=t;roundTime+=dT;passiveGoldCooldown-=dT;if(passiveGoldCooldown<=0){updateGold(PASSIVE_GOLD_RATE);passiveGoldCooldown=1;}monsterSpawnCooldown-=dT;if(monsterSpawnCooldown<=0&&spawnedMonstersCount<MONSTERS_PER_ROUND){monsters.push(new Monster());spawnedMonstersCount++;monsterSpawnCooldown=3;}if(spawnedMonstersCount>=MONSTERS_PER_ROUND&&monsters.length===0&&!isRoundEnding){isRoundEnding=true;log(`Ronda termina em ${Math.ceil(endRoundCooldown)}s...`);}if(isRoundEnding){endRoundCooldown-=dT;if(endRoundCooldown<=0){if(monsters.length===0){endGame(true);return;}else{isRoundEnding=false;endRoundCooldown=5;}}}monsters.forEach(m=>m.move(dT));towers.forEach(t=>{t.findTarget(monsters);t.attack(dT);});const mAE=monsters.filter(m=>m.reachedEnd);if(mAE.length>0){updateHealth(-10*mAE.length);}monsters=monsters.filter(m=>m.health>0&&!m.reachedEnd);drawGrid();towers.forEach(t=>t.draw());monsters.forEach(m=>m.draw());const min=Math.floor(roundTime/60).toString().padStart(2,'0'),sec=Math.floor(roundTime%60).toString().padStart(2,'0');timerSpan.textContent=`${min}:${sec}`;if(isRoundEnding)timerSpan.textContent+=` (Fim em ${Math.ceil(endRoundCooldown)}s)`;requestAnimationFrame(gameLoop);}
    
    async function saveGhost(actions) {
        if (!actions || actions.length === 0) return;
        try {
            const ghostData = {
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                actions: actions,
                duration: roundTime,
            };
            const docRef = await db.collection("ghosts").add(ghostData);
            log(`Ghost guardado com sucesso! ID: ${docRef.id}`);
        } catch (error) {
            console.error("Erro ao guardar o Ghost: ", error);
            log("Falha ao guardar o Ghost no servidor.");
        }
    }

    function endGame(isVictory) { 
        if(!gameStarted)return;
        gameStarted = false;
        const message = isVictory ? "RONDA CONCLUÍDA!" : "FIM DE JOGO";
        log(message);

        if (isVictory) {
            log('--- Gravação da Ronda (Ghost) ---');
            log(`<pre>${JSON.stringify(playerActions, null, 2)}</pre>`);
            saveGhost(playerActions);
        }

        ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle="white";ctx.font="40px sans-serif";ctx.textAlign="center";
        ctx.fillText(message,canvas.width/2,canvas.height/2);
        log("Recarregue a página para jogar novamente."); 
    }

    function resetGame(){
        gameStarted=false;log('A ronda começa com a sua primeira ação.');gold=500;playerHealth=100;monsters=[];towers=[];playerActions=[];spawnedMonstersCount=0;roundTime=0;endRoundCooldown=5;isRoundEnding=false;passiveGoldCooldown=1;monsterSpawnCooldown=3;selectedAction=null;actionButtons.forEach(b=>b.classList.remove('selected'));updateGold(0);updateHealth(0);timerSpan.textContent="00:00";resize();drawGrid();
    }

    // ============== PONTO DE ENTRADA ==============
    resetGame();
});
