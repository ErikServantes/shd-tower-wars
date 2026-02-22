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
const baseTileSize = 40; // Tamanho base de cada quadrado

// Controlo de Câmera (Zoom/Pan)
let scale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;


// Caminho em "S" (Coordenadas da grade x, y)
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

// A MÁGICA: Converte Grade 2D em Isométrico com Zoom e Pan
function toIso(x, y) {
    const scaledTileSize = baseTileSize * scale;
    let isoX = (x - y) * (scaledTileSize * 0.8);
    let isoY = (x + y) * (scaledTileSize * 0.4);
    
    // Centraliza e aplica o Pan
    return { 
        x: isoX + canvas.width / 2 + offsetX, 
        y: isoY + canvas.height / 6 + offsetY 
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
    const scaledTileSize = baseTileSize * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaledTileSize, y + scaledTileSize * 0.5);
    ctx.lineTo(x, y + scaledTileSize);
    ctx.lineTo(x - scaledTileSize, y + scaledTileSize * 0.5);
    ctx.closePath();

    if (isPath) {
        ctx.fillStyle = "#2c3e50";
    } else {
        ctx.fillStyle = isPlayerSide ? "#27ae6022" : "#c0392b22"; 
    }

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    ctx.stroke();
}

// === HANDLERS DE EVENTOS PARA ZOOM E PAN ===

// Zoom com a roda do rato
function handleWheel(event) {
    event.preventDefault();
    const scaleAmount = 0.1;
    if (event.deltaY < 0) {
        scale += scaleAmount; // Zoom in
    } else {
        scale -= scaleAmount; // Zoom out
    }
    // Limita a escala
    scale = Math.max(0.5, Math.min(scale, 2.5));
}

// Pan (arrastar) com o rato ou toque
function handleMouseDown(event) {
    isDragging = true;
    lastMouseX = event.clientX || event.touches[0].clientX;
    lastMouseY = event.clientY || event.touches[0].clientY;
}

function handleMouseUp() {
    isDragging = false;
}

function handleMouseMove(event) {
    if (!isDragging) return;
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    
    const deltaX = clientX - lastMouseX;
    const deltaY = clientY - lastMouseY;
    
    offsetX += deltaX;
    offsetY += deltaY;
    
    lastMouseX = clientX;
    lastMouseY = clientY;
}

// Adicionar os event listeners
canvas.addEventListener('wheel', handleWheel);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp); // Para quando o rato sai do canvas
canvas.addEventListener('mousemove', handleMouseMove);

// Para mobile (toque)
canvas.addEventListener('touchstart', handleMouseDown);
canvas.addEventListener('touchend', handleMouseUp);
canvas.addEventListener('touchmove', handleMouseMove);


function gameLoop() {
    drawGrid(); // A nossa grelha agora é dinâmica!
    requestAnimationFrame(gameLoop);
}

gameLoop();
