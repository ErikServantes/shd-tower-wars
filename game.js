// ============== Echoes of Evolution - Core Logic (v2.7) ==============

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // 1. Elementos da HUD
    const playerHpSpan = document.getElementById('player-hp');
    const playerGoldSpan = document.getElementById('player-gold');
    const enemyHpSpan = document.getElementById('enemy-hp');
    const enemyGoldSpan = document.getElementById('enemy-gold');
    const roundNumberSpan = document.getElementById('round-number');
    const timerDisplaySpan = document.getElementById('timer-display');

    const towerMenuBtn = document.getElementById('tower-menu-btn');
    const monsterMenuBtn = document.getElementById('monster-menu-btn');
    const endGameOverlay = document.getElementById('end-game-overlay');
    const endGameMessage = document.getElementById('end-game-message');
    const replayBtn = document.getElementById('replay-btn');

    // 2. Inicialização Firebase
    const firebaseConfig = { apiKey: "AIzaSyBx_hQ59G_leo48xZRQh6XFQZci8lIKYwM", authDomain: "shd-towerwars.firebaseapp.com", projectId: "shd-towerwars", storageBucket: "shd-towerwars.firebasestorage.app", messagingSenderId: "251334988662", appId: "1:251334988662:web:51fc38287cbf45f485e057" };
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const db = firebase.firestore();

    // 3. Variáveis de Estado
    let playerGold = 500, playerHealth = 100, ghostGold = 500, ghostHealth = 100;
    let monsters = [], towers = [], playerActions = [], selectedAction = null, hoveredTower = null, projectiles = [];
    let ghost = null, ghostActions = [], ghostTowers = [], ghostMonsters = [], nextGhostActionIndex = 0;
    let floatingTexts = [], camera = null;
    let towerData = null, monsterData = null;
    let currentRound = 1, roundTimer = 120, isRoundOver = false, gameLoopTimestamp = null, lastTime = null, timeWithoutMonsters = 0;
    const ROUND_DURATION = 120;
    let gameStarted = false, roundGhostActions = [];

    // --- Tradutor de Unidades ---
    const unitTranslation = { "goblin": "swordsman", "orc": "knight", "golem": "battering_ram", "bat": "hydrogen_balloon", "skeleton": "specialist", "wolf": "knight", "dragon": "nokfit_berserker", "arrow": "giant_crossbow", "mage": "oil_launcher", "cannon": "catapult", "slow": "oil_launcher", "sniper": "steampunk_sniper", "splash": "sonic_cannon", "farm": "farm" };
    function translateUnit(name) { return unitTranslation[name] || name; }
    function log(m) { console.log("[GAME]: " + m); }

    // 4. Funções de Atualização
    function updatePlayerGold(amount) { playerGold += amount; if (playerGoldSpan) playerGoldSpan.textContent = Math.floor(playerGold); }
    function updateGhostGold(amount) { ghostGold += amount; if (enemyGoldSpan) enemyGoldSpan.textContent = Math.floor(ghostGold); }
    function updatePlayerHealth(amount) { playerHealth += amount; if (playerHpSpan) playerHpSpan.textContent = Math.max(0, Math.floor(playerHealth)); if (playerHealth <= 0) endGame(false); }
    function updateGhostHealth(amount) { ghostHealth += amount; if (enemyHpSpan) enemyHpSpan.textContent = Math.max(0, Math.floor(ghostHealth)); if (ghostHealth <= 0) endGame(true); }
    function formatTime(seconds) { const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60); return `${m}'${s.toString().padStart(2, '0')}`; }

    // 5. Carregamento de Dados
    async function loadGameData() { try { const v = `?v=${Date.now()}`; const [tRes, mRes] = await Promise.all([ fetch(`towers.json${v}`), fetch(`monsters.json${v}`) ]); towerData = await tRes.json(); monsterData = await mRes.json(); log("Dados carregados com sucesso."); } catch (e) { log("Erro no carregamento: " + e); } }

    // 6. Classes
    class Camera { constructor(canvas) { this.canvas = canvas; } project(c, r) { const tW = this.canvas.width / 15, tH = this.canvas.height / 30; return { x: c * tW, y: r * tH, tileWidth: tW, tileHeight: tH }; } screenToGrid(sX, sY) { const tW = this.canvas.width / 15, tH = this.canvas.height / 30; const col = Math.floor(sX / tW), row = Math.floor(sY / tH); return (col < 0 || col >= 15 || row < 0 || row >= 30) ? { col: -1, row: -1 } : { col, row }; } getTileCenter(c, r) { const p = this.project(c, r); return { x: p.x + p.tileWidth / 2, y: p.y + p.tileHeight / 2 }; } }
    class FloatingText { constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.velocity = -20; } update(dt) { this.life -= dt; this.y += this.velocity * dt; } draw() { let opacity = this.life > 0.8 ? (1 - this.life) / 0.2 : this.life < 0.3 ? this.life / 0.3 : 1; ctx.globalAlpha = Math.max(0, opacity); ctx.fillStyle = this.color; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.fillText(this.text, this.x, this.y); ctx.globalAlpha = 1.0; ctx.textAlign = "start"; } }
    class Projectile { constructor(x, y, target, damage, owner, damageType) { this.x = x; this.y = y; this.target = target; this.damage = damage; this.owner = owner; this.speed = 400; this.damageType = damageType || 'normal'; } move(dT) { if (!this.target || this.target.health <= 0) return; const dX = this.target.x - this.x, dY = this.target.y - this.y, dist = Math.sqrt(dX * dX + dY * dY), moveDist = this.speed * dT; if (dist < moveDist) { this.x = this.target.x; this.y = this.target.y; } else { this.x += (dX / dist) * moveDist; this.y += (dY / dist) * moveDist; } } draw() { ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI); ctx.fill(); } }
    class Monster { constructor(t, l, p, owner) { const tr = translateUnit(t), c = monsterData[tr].levels[l - 1]; this.type = tr; this.level = l; this.isFlying = c.isFlying || false; this.stealth = c.stealth || false; this.immuneToNormal = c.immuneToNormal || false; this.damageToPlayer = c.damageToPlayer || 1; this.path = this.isFlying ? (p === playerPath ? playerFlyingPath : ghostFlyingPath) : p; this.pathIndex = 0; this.health = c.health; this.maxHealth = c.health; this.speed = c.speed; this.reward = c.reward; this.owner = owner; const s = camera.getTileCenter(this.path[0].x, this.path[0].y); this.x = s.x; this.y = s.y; this.reachedEnd = false; } move(dT) { if (this.reachedEnd) return; let moveDist = this.speed * dT; while (moveDist > 0 && !this.reachedEnd) { if (this.pathIndex >= this.path.length) { this.reachedEnd = true; break; } const tc = camera.getTileCenter(this.path[this.pathIndex].x, this.path[this.pathIndex].y), dX = tc.x - this.x, dY = tc.y - this.y, d = Math.sqrt(dX * dX + dY * dY); if (d < 0.1) { this.pathIndex++; continue; } if (moveDist >= d) { this.x = tc.x; this.y = tc.y; this.pathIndex++; moveDist -= d; } else { this.x += (dX / d) * moveDist; this.y += (dY / d) * moveDist; moveDist = 0; } } } draw() { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(this.x, this.y + 8, 8, 4, 0, 0, 2 * Math.PI); ctx.fill(); if (this.stealth) ctx.globalAlpha = 0.5; ctx.fillStyle = this.owner === 'player' ? '#2ecc71' : '#e74c3c'; ctx.beginPath(); ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI); ctx.fill(); if (this.isFlying) { ctx.strokeStyle = 'cyan'; ctx.lineWidth = 2; ctx.stroke(); } if (this.health < this.maxHealth) { const p = this.y - 20, w = 30, h = 5; ctx.fillStyle = "#444"; ctx.fillRect(this.x - w / 2, p, w, h); ctx.fillStyle = "#0f0"; ctx.fillRect(this.x - w / 2, p, w * (this.health / this.maxHealth), h); } ctx.globalAlpha = 1.0; } }
    class Tower { constructor(t, l, c, r, owner) { const tr = translateUnit(t), d = towerData[tr].levels[l - 1]; this.type = tr; this.level = l; this.col = c; this.row = r; this.damage = d.damage; this.damageType = towerData[tr].damageType || 'normal'; this.canSeeStealth = towerData[tr].canSeeStealth || false; this.canAttackFlying = d.canAttackFlying || false; this.canAttackGround = d.canAttackGround || false; const tw = camera.project(c, r).tileWidth; this.range = d.range * tw; this.fireRate = d.fireRate; this.cost = d.cost; this.owner = owner; const p = camera.getTileCenter(c, r); this.x = p.x; this.y = p.y; this.target = null; this.fireCooldown = 0; } findTarget(monsters) { if (this.target && this.target.health > 0 && Math.sqrt(Math.pow(this.x - this.target.x, 2) + Math.pow(this.y - this.target.y, 2)) <= this.range) { if (this.target.stealth && !this.canSeeStealth) { } else return; } this.target = null; let minD = Infinity; for (const m of monsters) { if ((m.isFlying && !this.canAttackFlying) || (!m.isFlying && !this.canAttackGround)) continue; if (m.stealth && !this.canSeeStealth) continue; const d = Math.sqrt(Math.pow(this.x - m.x, 2) + Math.pow(this.y - m.y, 2)); if (d <= this.range && d < minD) { minD = d; this.target = m; } } } attack(dT) { if (!this.target) return; this.fireCooldown -= dT; if (this.fireCooldown <= 0) { projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.owner, this.damageType)); this.fireCooldown = 1 / this.fireRate; } } draw() { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, 12, 6, 0, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = this.owner === 'player' ? '#3498db' : '#9b59b6'; ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, 2 * Math.PI); ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.stroke(); } }
    
    // 7. Lógica de Caminho
    const ghostPathPoints = [{ x: 4, y: 0 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 5 }, { x: 13, y: 5 }, { x: 13, y: 9 }, { x: 6, y: 9 }, { x: 6, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 13 }, { x: 7, y: 13 }, { x: 7, y: 16 }, { x: 12, y: 16 }, { x: 12, y: 23 }, { x: 9, y: 23 }, { x: 8, y: 23 }, { x: 8, y: 20 }, { x: 1, y: 20 }, { x: 1, y: 24 }, { x: 6, y: 24 }, { x: 6, y: 28 }, { x: 8, y: 28 }, { x: 8, y: 26 }, { x: 10, y: 26 }, { x: 10, y: 29 }];
    const ghostPath = (() => { const v = ghostPathPoints, p = []; for (let i = 0; i < v.length - 1; i++) { let s = v[i], e = v[i + 1], x = s.x, y = s.y, dX = Math.sign(e.x - s.x), dY = Math.sign(e.y - s.y); while (x !== e.x || y !== e.y) { p.push({ x, y }); if (x !== e.x) x += dX; else if (y !== e.y) y += dY; } } p.push(v[v.length - 1]); return p; })();
    const playerPath = [...ghostPath].reverse();
    const ghostFlyingPath = [{ x: 4, y: 0 }, { x: 10, y: 29 }];
    const playerFlyingPath = [...ghostFlyingPath].reverse();

    // 8. Funções do Loop e Renderização (com Grelha Ténue)
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenha a grelha com 30% de opacidade
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;

        const tileWidth = canvas.width / 15;
        const tileHeight = canvas.height / 30;

        for (let i = 1; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tileWidth, 0);
            ctx.lineTo(i * tileWidth, canvas.height);
            ctx.stroke();
        }
        for (let i = 1; i < 30; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * tileHeight);
            ctx.lineTo(canvas.width, i * tileHeight);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0; // Restaura a opacidade
    }

    // Resto do ficheiro
    function gameLoop(timestamp) { gameLoopTimestamp = requestAnimationFrame(gameLoop); if (lastTime === null) lastTime = timestamp; const dT = (timestamp - lastTime) / 1000; lastTime = timestamp; if (gameStarted && !isRoundOver) { updatePlayerGold(1 * dT); if (ghost) updateGhostGold(1 * dT); roundTimer -= dT; if (timerDisplaySpan) timerDisplaySpan.textContent = formatTime(roundTimer); if (roundTimer <= 0) { log("Tempo esgotado."); endRound(false); return; } if (monsters.length === 0 && ghostMonsters.length === 0) { timeWithoutMonsters += dT; } else { timeWithoutMonsters = 0; } if ((ROUND_DURATION - roundTimer) >= 30 && timeWithoutMonsters >= 5) { log("Empate técnico (Sem monstros)."); endRound(false); return; } const et = ROUND_DURATION - roundTimer; if (ghost && nextGhostActionIndex < roundGhostActions.length) { while (nextGhostActionIndex < roundGhostActions.length && et >= roundGhostActions[nextGhostActionIndex].timestamp) { const a = roundGhostActions[nextGhostActionIndex]; if (a.action === 'spawn') spawnGhostMonster(a.type, a.level); else if (a.action === 'build') buildGhostTower(a.type, a.level, 14 - a.col, 29 - a.row); nextGhostActionIndex++; } } monsters.forEach(m => m.move(dT)); ghostMonsters.forEach(m => m.move(dT)); towers.forEach(t => { t.findTarget(ghostMonsters); t.attack(dT); }); ghostTowers.forEach(t => { t.findTarget(monsters); t.attack(dT); }); for (let i = projectiles.length - 1; i >= 0; i--) { const p = projectiles[i]; if (!p.target || p.target.health <= 0) { projectiles.splice(i, 1); continue; } p.move(dT); const dX = p.target.x - p.x, dY = p.target.y - p.y; if (Math.sqrt(dX * dX + dY * dY) < 5) { let d = p.damage; if (p.target.immuneToNormal && p.damageType !== 'siege') d = 0; p.target.health -= d; if (p.target.health <= 0) { if (p.owner === 'player') { updatePlayerGold(p.target.reward); floatingTexts.push(new FloatingText(p.target.x, p.target.y, `+${p.target.reward}`, '#f1c40f')); } else { updateGhostGold(p.target.reward); floatingTexts.push(new FloatingText(p.target.x, p.target.y, `+${p.target.reward}`, '#bdc3c7')); } } projectiles.splice(i, 1); } } const pL = monsters.filter(m => m.reachedEnd), gL = ghostMonsters.filter(m => m.reachedEnd); pL.forEach(m => updateGhostHealth(-m.damageToPlayer)); gL.forEach(m => updatePlayerHealth(-m.damageToPlayer)); monsters = monsters.filter(m => m.health > 0 && !m.reachedEnd); ghostMonsters = ghostMonsters.filter(m => m.health > 0 && !m.reachedEnd); for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].update(dT); if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); } } if (!document.hidden) { drawGrid(); towers.forEach(t => t.draw()); ghostTowers.forEach(t => t.draw()); monsters.forEach(m => m.draw()); ghostMonsters.forEach(m => m.draw()); projectiles.forEach(p => p.draw()); floatingTexts.forEach(ft => ft.draw()); if (hoveredTower) { ctx.beginPath(); ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, 2 * Math.PI); ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; ctx.fill(); } if (selectedAction && selectedAction.type === 'tower' && selectedAction.ghostTower.visible) { const { x, y, rangeInPixels, isValid } = selectedAction.ghostTower; ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.fillStyle = isValid ? "rgba(0, 100, 255, 0.5)" : "rgba(255, 0, 0, 0.5)"; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, rangeInPixels, 0, 2 * Math.PI); ctx.fillStyle = isValid ? "rgba(0, 100, 255, 0.1)" : "rgba(255, 0, 0, 0.1)"; ctx.fill(); } } }
    function handleMouseMove(e) { const rect = canvas.getBoundingClientRect(), sX = e.clientX - rect.left, sY = e.clientY - rect.top, { col, row } = camera.screenToGrid(sX, sY); if (selectedAction && selectedAction.type === 'tower') { hoveredTower = null; if (col < 0 || row < 0) { selectedAction.ghostTower.visible = false; } else { selectedAction.ghostTower.visible = true; const p = camera.getTileCenter(col, row); selectedAction.ghostTower.x = p.x; selectedAction.ghostTower.y = p.y; selectedAction.ghostTower.col = col; selectedAction.ghostTower.row = row; const o = towerData[selectedAction.unit].levels[0], tw = camera.project(col, row).tileWidth; selectedAction.ghostTower.rangeInPixels = o.range * tw; selectedAction.ghostTower.isValid = playerGold >= o.cost && row >= 15 && !ghostPath.some(t => t.x === col && t.y === row) && !towers.some(t => t.col === col && t.row === row); } } else { hoveredTower = (col < 0 || row < 0) ? null : [...towers, ...ghostTowers].find(t => t.col === col && t.row === row) || null; } }
    function handleActionButtonClick(btn) { const u = btn.dataset.unit, t = btn.dataset.type; if (t === 'monster') { spawnPlayerMonster(u); } else if (t === 'tower' && towerData && towerData[u]) { if (selectedAction && selectedAction.button === btn) { btn.classList.remove("selected"); selectedAction = null; } else { if (selectedAction) selectedAction.button.classList.remove("selected"); btn.classList.add("selected"); selectedAction = { button: btn, type: t, unit: u, ghostTower: { visible: false, x: 0, y: 0, col: -1, row: -1, rangeInPixels: 0, isValid: false } }; } } }
    function handleCanvasClick() { if (!selectedAction || selectedAction.type !== 'tower' || !selectedAction.ghostTower.isValid) return; const ut = selectedAction.unit, c = towerData[ut].levels[0]; if (playerGold < c.cost) return; updatePlayerGold(-c.cost); towers.push(new Tower(ut, 1, selectedAction.ghostTower.col, selectedAction.ghostTower.row, 'player')); playerActions.push({ action: "build", type: ut, level: 1, col: selectedAction.ghostTower.col, row: selectedAction.ghostTower.row, timestamp: ROUND_DURATION - roundTimer, round: currentRound }); selectedAction.button.classList.remove("selected"); selectedAction = null; }
    function spawnPlayerMonster(ut) { if (!monsterData[ut]) return; const c = monsterData[ut].levels[0]; if (playerGold < c.cost) return; if (!gameStarted) { gameStarted = true; if (roundGhostActions.length > 0) { while (nextGhostActionIndex < roundGhostActions.length) { const a = roundGhostActions[nextGhostActionIndex]; if (a.action === 'spawn') break; if (a.action === 'build') buildGhostTower(a.type, a.level, 14 - a.col, 29 - a.row); nextGhostActionIndex++; } } } updatePlayerGold(-c.cost); monsters.push(new Monster(ut, 1, playerPath, 'player')); playerActions.push({ action: 'spawn', type: ut, level: 1, timestamp: ROUND_DURATION - roundTimer, round: currentRound }); }
    function spawnGhostMonster(ut, l) { const rt = translateUnit(ut); if (!monsterData[rt]) return; const c = monsterData[rt].levels[l - 1]; if (ghostGold >= c.cost) { updateGhostGold(-c.cost); ghostMonsters.push(new Monster(rt, l, ghostPath, 'ghost')); } }
    function buildGhostTower(ut, l, col, row) { const rt = translateUnit(ut); if (!towerData[rt]) return; const c = towerData[rt].levels[l - 1]; if (ghostGold >= c.cost) { updateGhostGold(-c.cost); ghostTowers.push(new Tower(rt, l, col, row, 'ghost')); } }
    function updateActionButtons() { document.querySelectorAll(".action-btn").forEach(btn => { const u = btn.dataset.unit, t = btn.dataset.type, d = t === 'tower' ? towerData : monsterData, sEl = btn.querySelector(".unit-symbol"), cEl = btn.querySelector(".unit-cost"); if (sEl) sEl.textContent = (d && d[u]) ? d[u].symbol : ''; if (cEl) cEl.textContent = (d && d[u] && d[u].levels) ? `$${d[u].levels[0].cost}` : ''; }); }
    function showActionButtons(t) { const isT = t === 'towers'; document.querySelectorAll(".tower-action").forEach(el => el.classList.toggle("hidden", !isT)); document.querySelectorAll(".monster-action").forEach(el => el.classList.toggle("hidden", isT)); towerMenuBtn.classList.toggle("active", isT); monsterMenuBtn.classList.toggle("active", !isT); if (selectedAction) { selectedAction.button.classList.remove("selected"); selectedAction = null; } }
    function endRound(win) { if (isRoundOver) return; isRoundOver = true; gameStarted = false; cancelAnimationFrame(gameLoopTimestamp); if (currentRound >= 3) { endGame(playerHealth >= ghostHealth); return; } updatePlayerGold(125); updateGhostGold(125); endGameMessage.textContent = `Round ${currentRound} Complete`; endGameOverlay.classList.remove('hidden'); replayBtn.classList.add('hidden'); setTimeout(() => { endGameOverlay.classList.add('hidden'); startNextRound(); }, 3000); }
    function startNextRound() { currentRound++; if (roundNumberSpan) roundNumberSpan.textContent = currentRound; monsters = []; projectiles = []; ghostMonsters = []; roundTimer = ROUND_DURATION; nextGhostActionIndex = 0; isRoundOver = false; lastTime = null; roundGhostActions = ghostActions.filter(a => a.round === currentRound).sort((a, b) => a.timestamp - b.timestamp); gameLoopTimestamp = requestAnimationFrame(gameLoop); }
    function endGame(pWin) { cancelAnimationFrame(gameLoopTimestamp); isRoundOver = true; endGameMessage.textContent = pWin ? "Vitória Final!" : "Derrota Final!"; endGameOverlay.classList.remove('hidden'); replayBtn.classList.remove('hidden'); if (pWin) { log("Vitória detectada! Iniciando gravação..."); saveGhost(playerActions); } }
    async function saveGhost(act) { log("Tentando gravar ghost com " + act.length + " ações."); if (act.length === 0) return; act.sort((a, b) => (a.round !== b.round) ? a.round - b.round : a.timestamp - b.timestamp); try { await db.collection("ghosts").add({ actions: act, timestamp: firebase.firestore.FieldValue.serverTimestamp(), version: "2.0" }); log("GHOST GRAVADO NO FIREBASE COM SUCESSO!"); } catch (e) { log("Erro Ghost: " + e); } }
    async function loadGhost() { try { const t = await db.collection("ghosts").orderBy("timestamp", "desc").limit(1).get(); if (!t.empty) { ghost = t.docs[0].data(); ghostActions = ghost.actions || []; log("Ghost Firebase carregado."); } else { throw new Error("Vazio"); } } catch (e) { try { const res = await fetch(`ghost.json?v=${Date.now()}`); ghost = await res.json(); ghostActions = ghost.actions || []; log("Ghost Local carregado."); } catch (e2) { ghost = null; ghostActions = []; } } if (ghostActions.length > 0) ghostActions.sort((a, b) => (a.round !== b.round) ? a.round - b.round : a.timestamp - b.timestamp); }
    async function fullReset() { endGameOverlay.classList.add('hidden'); isRoundOver = false; gameStarted = false; if (gameLoopTimestamp) cancelAnimationFrame(gameLoopTimestamp); currentRound = 1; playerHealth = 100; ghostHealth = 100; playerActions = []; updatePlayerHealth(0); updateGhostHealth(0); if (roundNumberSpan) roundNumberSpan.textContent = currentRound; playerGold = 500; ghostGold = 500; updatePlayerGold(0); updateGhostGold(0); towers = []; ghostTowers = []; await loadGhost(); roundGhostActions = ghostActions.filter(a => a.round === currentRound).sort((a, b) => a.timestamp - b.timestamp); nextGhostActionIndex = 0; roundTimer = ROUND_DURATION; monsters = []; projectiles = []; ghostMonsters = []; lastTime = null; gameLoopTimestamp = requestAnimationFrame(gameLoop); }
    
    // 11. Inicialização
    async function main() {
        camera = new Camera(canvas);

        window.addEventListener("resize", () => { 
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        });
        window.dispatchEvent(new Event('resize'));

        await loadGameData(); 
        updateActionButtons();
        towerMenuBtn.addEventListener('click', () => showActionButtons('towers'));
        monsterMenuBtn.addEventListener('click', () => showActionButtons('monsters'));
        document.querySelectorAll('.action-btn').forEach(btn => btn.addEventListener('click', () => handleActionButtonClick(btn)));
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('keydown', (e) => { if (e.key === "Escape" && selectedAction) { selectedAction.button.classList.remove("selected"); selectedAction = null; } const n = parseInt(e.key); if (!isNaN(n) && n >= 1 && n <= 7) { const ut = Object.keys(monsterData); if (ut[n - 1]) spawnPlayerMonster(ut[n - 1]); } });
        replayBtn.addEventListener('click', fullReset);
        await fullReset();
    }
    main();
});
