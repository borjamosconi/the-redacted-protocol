# REDACTED: El Archivo Desclasificado — Solana Integration & Architecture

Este documento detalla la arquitectura de integración con la blockchain de **Solana** para dar soporte al juego de cartas coleccionables, cubriendo los Smart Contracts (programas Anchor), la estructura de metadatos de los NFTs de las cartas y la validación de jugadas.

---

## 1. Diseño de los NFTs de las Cartas (Metadatos y Atributos)

Cada carta del juego es un NFT acuñado bajo el estándar **Metaplex Core** o **Token Metadata v1** en Solana. Los atributos del juego (PWR, RES, Alineación) se definen directamente en la sección `attributes` de los metadatos on-chain, lo que permite que el Smart Contract del juego los lea y valide de forma nativa.

### Estructura de Atributos del NFT (JSON en IPFS/Arweave):
```json
{
  "name": "Agente RDX Básico",
  "symbol": "RDXCARD",
  "description": "Una entidad autónoma de IA dedicada a desvelar archivos encriptados.",
  "image": "https://arweave.net/XYZ123...",
  "attributes": [
    { "trait_type": "Card Type", "value": "Group" },
    { "trait_type": "Alignment", "value": "Glitch" },
    { "trait_type": "Power (PWR)", "value": "5" },
    { "trait_type": "Resistance (RES)", "value": "5" },
    { "trait_type": "Card ID", "value": "G-02" },
    { "trait_type": "Rarity", "value": "Common" }
  ]
}
```

---

## 2. Arquitectura de Smart Contracts (Anchor)

El juego utiliza un sistema de dos contratos inteligentes principales en Solana:

### A. Contrato de Validación de Decks (`rd-card-deck`)
- Almacena y registra las combinaciones de cartas (IDs de NFTs) que forman el mazo activo de un jugador.
- Valida que el mazo cumpla con las reglas de construcción (por ejemplo, exactamente 40 cartas, máximo 3 copias de una misma carta, etc.).
- Permite "sellar" un mazo antes de entrar a una partida para evitar modificaciones durante el juego.

### B. Contrato de Duelos / Partidas (`rd-card-game`)
- Controla el estado on-chain de las partidas activas (PvP).
- **Matchmaking / Inicialización:** Los jugadores depositan una pequeña comisión de red (o un stake de $RDX) para crear una sala de juego.
- **State Machine (Máquina de Estados):**
  - Almacena el estado actual del tablero (qué nodos están en la pirámide de cada jugador, cuántas Barras Rojas de censura tiene cada carta, etc.).
  - Valida cada acción enviada mediante transacciones firmadas (por ejemplo: `play_card`, `attack_node`, `apply_censor`).
  - Utiliza un Oráculo de Aleatoriedad (como Solana Randomness Oracle o Switchboard VRF) para las tiradas de dados de los ataques de control (`2d6`).

---

## 3. Optimización con Light Protocol (Zero-Knowledge Proofs)

Dado que las partidas de juegos de cartas implican muchas acciones rápidas y constantes, registrar cada movimiento de manera individual en la Mainnet de Solana puede generar fricción en el coste de comisiones y en la velocidad de confirmación.

- **Solución ZK State Compression:** 
  Utilizamos **Light Protocol** para comprimir el estado de la partida.
  - El estado detallado de la partida (mano de cartas oculta, mazo de robo) se almacena off-chain en un indexador de estado cifrado.
  - El cliente realiza movimientos off-chain y genera una prueba criptográfica de Zero-Knowledge (ZK Proof).
  - La prueba se envía a la blockchain de Solana en una sola transacción para verificar que la jugada fue legal (por ejemplo, demostrar que el jugador realmente tenía esa carta en su mano sin revelar el resto de sus cartas al rival).
  - Reduce los costes de transacción en más de un 90% y mantiene las cartas de la mano del jugador totalmente privadas en la blockchain pública.

---

## 4. Sistema de Recompensa y Staking

Los NFTs de las cartas se pueden utilizar en dos modalidades dentro del ecosistema:

1. **Juego Activo:** Participar en duelos puntuados. El ganador recibe comisiones de la bolsa en $RDX y puntos de experiencia (XP) para su perfil del Protocolo.
2. **Staking de Archivador:** Los jugadores pueden colocar sus cartas inactivas en stake en la bóveda criptográfica del ecosistema. Esto simula que los nodos están "procesando archivos en segundo plano", generando un flujo pasivo de tokens $RDX y fragmentos descifrados del Archivo 0.
