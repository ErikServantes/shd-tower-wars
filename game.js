
// ============== INICIALIZAÇÃO E DIAGNÓSTICO ==============

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const copyLogBtn = document.getElementById('copy-log-btn');
    const debugConsole = document.getElementById('debug-console');
    const goldSpan = document.getElementById('gold');
    const hpSpan = document.getElementById('hp');
    const timerSpan = document.getElementById('timer');

    function log(message) { /* ... log implementation ... */ }

    log('Script game.js carregado com lógica de fim de ronda simplificada.');

    // ============== CONFIGURAÇÕES DO JOGO ==============
    const gridCols = 15, gridRows = 30;
    const MONSTERS_PER_ROUND = 5;
    let gold, playerHealth, monsters, towers, gameStarted;
    let roundTime, endRoundCooldown, isRoundEnding, spawnedMonstersCount;

    // ... (funções de utilidade como generatePathFromVertices, project, etc. permanecem as mesmas) ...
    function generatePathFromVertices(v){const p=[];if(v.length===0)return p;for(let i=0;i<v.length-1;i++){let s=v[i],e=v[i+1],x=s.x,y=s.y,dX=Math.sign(e.x-s.x),dY=Math.sign(e.y-s.y);while(x!==e.x||y!==e.y){p.push({x,y});if(x!==e.x)x+=dX;else if(y!==e.y)y+=dY}}p.push(v[v.length-1]);return p}
    const vertices=[{x:4,y:0},{x:4,y:3},{x:6,y:3},{x:6,y:1},{x:8,y:1},{x:8,y:5},{x:13,y:5},{x:13,y:9},{x:6,y:9},{x:6,y:6},{x:2,y:6},{x:2,y:13},{x:7,y:13},{x:7,y:16},{x:12,y:16},{x:12,y:23},{x:9,y:23},{x:9,y:20},{x:2,y:20},{x:2,y:24},{x:7,y:24},{x:7,y:28},{x:5,y:28},{x:5,y:26},{x:3,y:26},{x:3,y:29}];
    const path=generatePathFromVertices(vertices);
    function updateGold(a){gold+=a;goldSpan.textContent=gold}
    function updateHealth(a){playerHealth+=a;hpSpan.textContent=playerHealth;if(playerHealth<=0)endGame(false)}
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;drawGrid()}
    window.addEventListener('resize',resize);
    function project(c,r){const P=0.3,Y_T=100,Y_B=canvas.height-50,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P),rR=r/(gridRows-1),y=Y_T+rR*T_Y,w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX=(canvas.width-w)/2,x=sX+c*tW;return{x,y,tileWidth:tW}}
    function drawGrid(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let r=0;r<gridRows-1;r++)for(let c=0;c<gridCols;c++)drawTile(path.some(p=>p.x===c&&p.y===r),r>=gridRows/2,c,r)}
    function drawTile(i,p,c,r){const C=project(c,r);if(r>=gridRows-1)return;const N=project(c,r+1);ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+C.tileWidth,C.y);ctx.lineTo(N.x+N.tileWidth,N.y);ctx.lineTo(N.x,N.y);ctx.closePath();ctx.fillStyle=i?"#2c3e50":(p?"#27ae6088":"#c0392b88");ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.fill();ctx.stroke();}
    function screenToGrid(sX,sY){const P=0.3,Y_T=100,Y_B=canvas.height-50,T_Y=Y_B-Y_T,W_B=canvas.width*0.9,W_T=W_B*(1-P);if(sY<Y_T||sY>Y_B)return{col:-1,row:-1};const yR=(sY-Y_T)/T_Y,row=Math.floor(yR*(gridRows-1)),rR=row/(gridRows-1),w=W_T+rR*(W_B-W_T),tW=w/gridCols,sX_=(canvas.width-w)/2,col=Math.floor((sX-sX_)/tW);return{col,row};}
    function getTileCenter(c,r){const C=project(c,r);if(r>=gridRows-1)return{x:C.x+C.tileWidth/2,y:C.y};const N=project(c,r+1);return{x:((C.x+C.tileWidth/2)+(N.x+N.tileWidth/2))/2,y:(C.y+N.y)/2};}


    // ============== CLASSES: MONSTROS E TORRES ==============
    class Monster{constructor(){this.pathIndex=0;const s=path[0],c=getTileCenter(s.x,s.y);this.x=c.x;this.y=c.y;this.speed=80;this.radius=8;this.maxHealth=100;this.health=this.maxHealth;this.reachedEnd=false;}takeDamage(a){this.health-=a;}move(dT){if(this.pathIndex>=path.length-1){this.reachedEnd=true;return;}const tN=path[this.pathIndex+1],tC=getTileCenter(tN.x,tN.y),dX=tC.x-this.x,dY=tC.y-this.y,dist=Math.sqrt(dX*dX+dY*dY),mD=this.speed*dT;if(dist<mD){this.pathIndex++;this.x=tC.x;this.y=tC.y;}else{this.x+=(dX/dist)*mD;this.y+=(dY/dist)*mD;}}draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle='red';ctx.fill();const hW=20,hP=this.health/this.maxHealth;ctx.fillStyle='#ff0000';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW,5);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-hW/2,this.y-this.radius-10,hW*hP,5);}}
    class Tower{constructor(c,r){const C=getTileCenter(c,r);this.x=C.x;this.y=C.y;this.col=c;this.row=r;this.range=150;this.damage=10;this.fireRate=1;this.fireCooldown=0;this.target=null;}draw(){ctx.fillStyle="#0000ff";ctx.beginPath();ctx.arc(this.x,this.y-5,10,0,Math.PI*2);ctx.fill();}findTarget(m){this.target=null;let cD=this.range+1;for(const M of m){const d=Math.sqrt(Math.pow(this.x-M.x,2)+Math.pow(this.y-M.y,2));if(d<cD){cD=d;this.target=M;}}}attack(dT){this.fireCooldown-=dT;if(this.fireCooldown<=0&&this.target&&this.target.health>0){this.target.takeDamage(this.damage);this.fireCooldown=1/this.fireRate;}}}
    canvas.addEventListener('click', (e) => { if(!gameStarted)return;const r=canvas.getBoundingClientRect(),cX=e.clientX-r.left,cY=e.clientY-r.top;const{col,row}=screenToGrid(cX,cY);const T_C=100;if(col<0||col>=gridCols||row<0||row>=gridRows-1)return;const iPS=row>=gridRows/2,iP=path.some(p=>p.x===col&&p.y===row),iO=towers.some(t=>t.col===col&&t.row===row);if(!iPS)return;if(iP)return;if(iO)return;if(gold<T_C)return;updateGold(-T_C);towers.push(new Tower(col,row)); });


    // ============== CICLO DE JOGO (GAMELOOP) ==============
    let lastTime = 0, monsterSpawnCooldown = 3;

    function gameLoop(timestamp) {
        if (!gameStarted) return;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        roundTime += deltaTime;

        // Spawning de monstros (limitado a MONSTERS_PER_ROUND)
        monsterSpawnCooldown -= deltaTime;
        if (monsterSpawnCooldown <= 0 && spawnedMonstersCount < MONSTERS_PER_ROUND) {
            monsters.push(new Monster());
            spawnedMonstersCount++;
            monsterSpawnCooldown = 3; 
        }

        // --- LÓGICA DE FIM DE RONDA ---
        // Condição para iniciar a contagem decrescente: todos os monstros foram gerados E não há mais monstros no campo.
        if (spawnedMonstersCount >= MONSTERS_PER_ROUND && monsters.length === 0 && !isRoundEnding) {
            isRoundEnding = true;
            log(`Todos os ${MONSTERS_PER_ROUND} monstros derrotados. A ronda termina em ${endRoundCooldown}s...`);
        }
        
        if (isRoundEnding) {
            endRoundCooldown -= deltaTime;
            if (endRoundCooldown <= 0) {
                // Verificação final: a ronda só termina se o campo continuar vazio.
                if (monsters.length === 0) {
                    endGame(true); // Vitória
                    return;
                } else {
                    // Isto não deve acontecer com a lógica atual, mas é uma salvaguarda.
                    isRoundEnding = false; 
                    endRoundCooldown = 5; 
                }
            }
        }

        // Atualizações
        monsters.forEach(m => m.move(deltaTime));
        towers.forEach(t => { t.findTarget(monsters); t.attack(deltaTime); });
        
        // Limpeza e Lógica de Jogo
        const monstersAtEnd = monsters.filter(m => m.reachedEnd);
        if (monstersAtEnd.length > 0) { updateHealth(-10 * monstersAtEnd.length); }
        monsters = monsters.filter(m => m.health > 0 && !m.reachedEnd);

        // Desenho e HUD
        drawGrid();
        towers.forEach(t => t.draw());
        monsters.forEach(m => m.draw());
        const minutes = Math.floor(roundTime / 60).toString().padStart(2, '0');
        const seconds = Math.floor(roundTime % 60).toString().padStart(2, '0');
        timerSpan.textContent = `${minutes}:${seconds}`;
        if (isRoundEnding) timerSpan.textContent += ` (Fim em ${Math.ceil(endRoundCooldown)}s)`;

        requestAnimationFrame(gameLoop);
    }
    
    function endGame(isVictory) {
        gameStarted = false;
        const message = isVictory ? "RONDA CONCLUÍDA!" : "FIM DE JOGO";
        log(message);
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "white"; ctx.font = "40px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(message, canvas.width/2, canvas.height/2);
        startButton.style.display = 'block';
    }

    function initGame() {
        gameStarted = true;
        startButton.style.display = 'none';
        log('O jogo começou!');
        lastTime = performance.now();

        // Resetar estado do jogo
        gold = 500;
        playerHealth = 100;
        monsters = [];
        towers = [];
        spawnedMonstersCount = 0;
        roundTime = 0;
        endRoundCooldown = 5;
        isRoundEnding = false;

        updateGold(0); 
        updateHealth(0);
        timerSpan.textContent = "00:00";
        
        requestAnimationFrame(gameLoop);
    }

    startButton.addEventListener('click', initGame);
    
    // Estado inicial antes do jogo começar
    log('DOM pronto. A aguardar início do jogo.');
    resize();
    goldSpan.textContent = 500;
    hpSpan.textContent = 100;
    timerSpan.textContent = "00:00";
});
