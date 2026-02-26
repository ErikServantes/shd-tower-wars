# 🏰 Tower Wars - Echoes of Evolution

Este projeto é um jogo de estratégia **Tower Defense Competitivo (1v1)** desenvolvido em HTML5 Canvas e JavaScript. O diferencial reside no seu sistema assíncrono: o jogador compete contra um **"Ghost"** (uma gravação de uma partida anterior de um vencedor real) em tempo real, tentando defender a sua base enquanto envia monstros para atacar a base do oponente.

## 📋 Visão Geral do Jogo

O objetivo é sobreviver com mais vida que o oponente ao fim de 3 rondas intensas.

*   **Estilo Visual:** Mobile-first (Proporção 1:2). Utiliza um sistema de **2D Paralelo** com suporte a imagens de fundo personalizadas para criar uma sensação de profundidade artística.
*   **Oponentes:** Jogador (Verde) vs Ghost (Vermelho - descarregado do Firebase).
*   **Duração:** 3 Rondas de 120 segundos cada.
*   **Condições de Fim de Ronda:**
    *   **Tempo esgotado:** A ronda chega ao fim após 120 segundos.
    *   **Stalemate (Empate Técnico):** Após os primeiros 30 segundos, se não existirem monstros em campo durante 5 segundos, a ronda termina automaticamente para manter a fluidez do jogo.

## 🎮 Regras e Mecânicas

### 🏗️ Defesa (Torres)
O jogador constrói torres na sua metade do mapa (inferior). As torres têm diferentes tipos de dano e utilidades:

1.  🏹 **Giant Crossbow**: Unidade básica e equilibrada. Ataca terra e ar.
2.  💣 **Catapult**: Dano de **Cerco (Siege)**. Causa dano em área e é essencial contra unidades blindadas.
3.  🔥 **Oil Launcher**: Lança óleo a ferver que aplica **Lentidão** e dano contínuo.
4.  💨 **Fydust Cannon**: Dispara poeira debilitante. Causa dano de Cerco e enfraquece inimigos.
5.  🎯 **Steampunk Sniper**: Dano massivo à distância. Possui **True Sight** (vê unidades invisíveis) e dano de Cerco.
6.  💥 **Sonic Cannon**: Ondas de choque com perfuração múltipla. Possui **True Sight**.
7.  ⚡️ **Electric Coil**: Especialista antiaéreo com alta cadência de tiro.

### 👹 Ofensiva (Monstros)
Ao invés de ondas automáticas, tu escolhes quando e que monstros enviar. Cada monstro enviado aumenta a pressão sobre o Ghost e, se chegar ao fim do caminho, retira vidas ao oponente.

1.  ⚔️ **Swordsman**: Rápido e barato. Ideal para "spam" inicial.
2.  🛡️ **Knight**: Muito rápido e robusto. Difícil de parar sem defesas pesadas.
3.  👻 **Shadder**: **Invisível (Stealth)**. Só pode ser detectado por torres com sentinela (Sniper/Sonic). Aparece com 50% de transparência.
4.  🪵 **Battering Ram (Ariete)**: Extremamente lento, mas com HP massivo. Causa **5 de dano** à vida do jogador.
5.  🎈 **Hydrogen Balloon**: Unidade voadora rápida. Ignora torres que apenas atacam o solo.
6.  🕵️ **Specialist**: **Imunidade**. Ignora dano de torres normais; apenas torres de **Cerco (Siege)** conseguem feri-lo.
7.  👹 **Nokfit Berserker**: O Boss final. Vida colossal e causa **10 de dano** se atravessar o portal.

## 🛠️ Tecnologias e Backend

*   **Motor Gráfico:** Canvas API (2D puro).
*   **Base de Dados:** **Firebase Firestore**. 
    *   Sempre que um jogador vence o Ghost atual, a sua sequência de jogadas (ações, timestamps e coordenadas) é gravada na nuvem.
    *   O próximo jogador que iniciar o jogo irá enfrentar essa nova gravação, criando um ciclo de evolução constante da dificuldade (Echoes of Evolution).
*   **Sistema de Tradução:** O jogo inclui uma camada de compatibilidade que traduz unidades de versões antigas para o novo tema atual, permitindo enfrentar Ghosts gravados em versões anteriores do projeto.

## 🎨 Personalização de Arte

O jogo utiliza um sistema de template para o mapa.
*   O ficheiro `background.png` (1080x2160) define o aspeto visual do mundo.
*   Podes gerar um guia de desenho usando o utilitário incluído `generator.html` para garantir que o teu caminho artístico coincide com o caminho lógico dos monstros.

---
Desenvolvido como um desafio de estratégia e lógica em tempo real. 🏰✨
