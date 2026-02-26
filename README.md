# 🏰 Tower Wars - Echoes of Evolution

Este projeto é um jogo de estratégia **Tower Defense Competitivo (1v1)** desenvolvido em HTML5 Canvas e JavaScript. O jogador compete contra um "Ghost" (uma gravação de uma partida anterior) em tempo real, tentando defender a sua base enquanto envia monstros para atacar a base do oponente.

## 📋 Visão Geral do Jogo

O objetivo é simples: **Sobreviver com mais vida que o oponente ao fim de 3 rondas.**

*   **Estilo:** Mobile-first (Ratio 1:2), Perspetiva 2.5D.
*   **Oponentes:** Jogador (Verde/Azul) vs Ghost (Vermelho/Roxo).
*   **Duração:** 3 Rondas de 120 segundos cada.

## 🎮 Regras e Mecânicas

### 1. Estrutura da Partida
*   **Rondas:** O jogo desenrola-se em 3 rondas.
*   **Tempo:** Cada ronda tem um limite de 2 minutos (120s).
*   **Condição de Vitória:**
    *   Reduzir a vida do inimigo a 0 (Vitória Imediata).
    *   Ter mais vida que o inimigo ao final da 3ª ronda.
*   **Empate Técnico (Stalemate):** Se após 30 segundos de ronda não existirem monstros em campo durante 5 segundos, a ronda termina prematuramente.

### 2. Economia (Ouro)
*   **Ouro Inicial:** 500 moedas (reiniciado apenas em *Full Reset*).
*   **Rendimento Passivo:** O jogador ganha ouro automaticamente ao longo do tempo.
*   **Recompensas de Abate:** Destruir monstros inimigos concede ouro.
*   **Bónus de Ronda:** Ao final de cada ronda, ambos os jogadores recebem **+125 de ouro**.

### 3. Vida e Dano
*   **Vida Inicial:** 100 HP.
*   **Dano Sofrido:** Quando um monstro inimigo chega ao fim do caminho, o jogador perde vida.
    *   A quantidade de vida perdida depende agora do parâmetro `damage` específico de cada monstro (ver secção de Dados).

### 4. O Sistema "Ghost" (Multiplayer Assíncrono)
*   O inimigo não é uma IA tradicional, nem uma sessão de jogo privada. É uma reprodução exata de ações gravadas (Spawn de monstros e Construção de torres).
*   **Partilha Global:**
    *   **Não existe autenticação individual.** O jogo utiliza uma base de dados partilhada (Firebase Firestore).
    *   Quando qualquer jogador (em qualquer dispositivo) vence uma partida, o seu replay é enviado para o servidor global.
    *   Ao iniciar um jogo, o sistema procura o último Ghost vencedor globalmente disponível.
    *   Isso cria uma "cadeia evolutiva": se venceres o Ghost atual, tornas-te o novo Ghost que todos os outros jogadores terão de enfrentar.
*   **Build Phase:** Ações de construção do Ghost que ocorreram *antes* do primeiro monstro ser invocado na ronda original são executadas instantaneamente no início da ronda, simulando uma fase de preparação.
*   **Carregamento de Oponente:** Ao iniciar um novo jogo, o sistema carrega o Ghost mais recente disponível na base de dados. Se não houver ligação ou dados, utiliza um Ghost local (`ghost.json`) como fallback.

## 🛠️ Entidades do Jogo

### 🛡️ Torres (`towers.json`)

As torres são a principal defesa. Elas possuem níveis e comportamentos específicos definidos no ficheiro JSON.

**Parâmetros de Configuração das Torres:**
Além do dano e alcance básico, o sistema suporta mecânicas avançadas:

*   **`cost`**: Custo em ouro para construir.
*   **`damage`**: Dano base por tiro.
*   **`range`**: Alcance da torre (em quadrículas).
*   **`fireRate`**: Cadência de tiro (tiros por segundo).
*   **`canAttackFlying`**: Se `true`, atinge unidades voadoras (ex: Morcegos, Dragões).
*   **`aerialMultiplier`** *(Novo)*: Multiplicador de dano contra unidades voadoras (ex: `2.0` = dobro do dano).
*   **`shotThrough`** *(Novo)*: Capacidade de perfuração. Define quantos inimigos um único projétil pode atravessar/atingir antes de desaparecer.
*   **`auraEffect`** *(Novo)*: Tipo de efeito de área aplicado (ex: `"slow"`, `"burn"`).
*   **`auraValue`** *(Novo)*: Intensidade do efeito da aura (ex: `0.5` para 50% de slow).
*   **`specialShot`** *(Novo)*: Define o comportamento da aura/efeito:
    *   `0`: Aura centrada na torre.
    *   `1`: Efeito aplicado no local de impacto do projétil (Dano de Splash).

**Tipos de Torres:**
1.  🏹 **Arrow**: Básica, rápida, ataca terra e ar.
2.  🧙 **Mage**: Dano mágico, aplica queimadura (`burn`).
3.  💣 **Cannon**: Dano em área (Splash), lento, apenas terra.
4.  ❄️ **Slow**: Aplica lentidão (`slow`) aos inimigos.
5.  🎯 **Sniper**: Alcance extremo, dano alto, bónus contra voadores.
6.  💥 **Splash**: Dano de área moderado com perfuração.
7.  💰 **Farm**: Estrutura económica (Geração de ouro - *WIP*).

### 👹 Monstros (`monsters.json`)

Os monstros são as unidades ofensivas enviadas contra o oponente.

**Parâmetros de Configuração dos Monstros:**
*   **`speed`**: Velocidade de movimento.
*   **`health`**: Pontos de vida.
*   **`reward`**: Ouro concedido ao oponente se for morto.
*   **`cost`**: Custo para invocar.
*   **`isFlying`**: Se `true`, o monstro ignora o caminho terrestre e voa em linha reta ou rota alternativa.
*   **`damage`** *(Novo)*: Quantidade de vida que retira ao jogador ao chegar à base (ex: Bosses podem tirar 10 vidas, monstros básicos 1).

**Tipos de Monstros:**
1.  ◉ **Goblin**: Rápido, fraco, barato (Swarm).
2.  ⊗ **Orc**: Guerreiro equilibrado, resistente.
3.  🗿 **Golem**: "Tanque" de vida, muito lento.
4.  🦇 **Morcego**: Unidade voadora rápida (Ignora torres terrestres).
5.  💀 **Esqueleto**: Atacante à distância (Mechanic WIP).
6.  🐺 **Lobo**: Muito rápido, ideal para ataques surpresa.
7.  🐲 **Dragão**: Unidade Boss voadora, vida massiva, alto custo e dano à base.

## 📂 Estrutura de Ficheiros

*   **`index.html`**: Estrutura base da página.
*   **`style.css`**: Estilos visuais, layout responsivo e configuração do Canvas.
*   **`game.js`**:
    *   *Game Loop*: Gere o tempo, física e desenho.
    *   *Classes*: `Tower`, `Monster`, `Projectile`, `Camera`, `FloatingText`.
    *   *Gestão de Estado*: Ouro, Vidas, Rondas, Ghost Replay, Integração com Firebase.
*   **`towers.json`**: Base de dados de atributos das torres.
*   **`monsters.json`**: Base de dados de atributos dos monstros.
*   **`ghost.json`**: Ficheiro local de fallback contendo as ações gravadas do Ghost (caso o Firebase falhe ou esteja vazio).
*   **`.idx/dev.nix`**: Configuração do ambiente de desenvolvimento (Project IDX).

## 🚀 Como Jogar

1.  **Construir**: Selecione torres no menu inferior e clique na grelha para posicionar.
2.  **Atacar**: Mude para o menu de monstros e clique para enviar unidades contra o Ghost.
3.  **Gerir**: Equilibre o gasto de ouro entre defesa (Torres) e ataque/economia (Monstros aumentam o income indiretamente ao forçar o inimigo a gastar).
4.  **Sobreviver**: Impeça que os monstros cheguem ao final do seu caminho.
5.  **Evoluir**: Vença a partida para que a sua estratégia seja gravada e se torne o "Ghost" a ser batido pelos próximos jogadores!

---
*Documentação atualizada com base na versão mais recente do código (`game.js`) e definições de dados (`json`).*
