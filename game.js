// Importar as bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE (Vais colar os teus dados aqui depois)
const firebaseConfig = {
    apiKey: "AQU_VAI_A_TUA_CHAVE",
    authDomain: "teu-projeto.firebaseapp.com",
    projectId: "teu-projeto",
    storageBucket: "teu-projeto.appspot.com",
    messagingSenderId: "0000000000",
    appId: "1:0000000000:web:00000000"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase ligado com sucesso!");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configurações do Mapa
const gridSize = 12; // 12x12 tiles
const tileSize = 40; // Tamanho de cada quadrado

// Caminho em "S" (Coordenadas da grade x, y)
// Este caminho atravessa o mapa de cima a baixo
const path = [
    {x: 5, y: 0}, {x: 5, y: 1}, {x: 5, y: 2}, 
    {x: 6, y: 2}, {x: 7, y: 2}, {x: 8, y: 2}, {x: 9, y: 2},
    {x: 9, y: 3}, {x: 9, y: 4}, {x: 9, y: 5},
    {x: 8, y: 5}, {x: 7, y: 5}, {x: 6, y: 5}, {x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5},
    {x: 3, y: 6}, {x: 3, y: 7}, {x: 3, y: 8},
    {x: 4, y: 8}, {x: 5, y: 8}, {x: 6, y: 8}, {x: 7, y: 8},
    {x: 7, y: 9}, {x: 7, y: 10}, {x: 7, y: 11}
];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// A MÁGICA: Converte Grade 2D em Isométrico
function toIso(x, y) {
    let isoX = (x - y) * (tileSize * 0.8);
    let isoY = (x + y) * (tileSize * 0.4);
    // Centraliza no ecrã
    return { 
        x: isoX + canvas.width / 2, 
        y: isoY + canvas.height / 6 
    };
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            const pos = toIso(x, y);
            
            // Verifica se este tile faz parte do caminho
            const isPath = path.some(p => p.x === x && p.y === y);
            
            drawTile(pos.x, pos.y, isPath, x >= gridSize / 2);
        }
    }
}

function drawTile(x, y, isPath, isPlayerSide) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tileSize, y + tileSize * 0.5);
    ctx.lineTo(x, y + tileSize);
    ctx.lineTo(x - tileSize, y + tileSize * 0.5);
    ctx.closePath();

    // Cores: Caminho é azulado, Relva/Chão é cinza
    // Metade do jogador tem um tom ligeiramente diferente
    if (isPath) {
        ctx.fillStyle = "#2c3e50"; // Cor do caminho
    } else {
        ctx.fillStyle = isPlayerSide ? "#27ae6022" : "#c0392b22"; 
    }

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.stroke();
}

function gameLoop() {
    drawGrid();
    requestAnimationFrame(gameLoop);
}

gameLoop();
