# REDACTED: Archivo 0 — Arquitectura e Integración en Solana

Este documento detalla la integración on-chain para dar soporte al TCG competitivo **REDACTED: Archivo 0**.

---

## 1. Mapeo de Atributos NFT (Metadata Schema)

Cada carta es un NFT de Solana (Metaplex Core). Las propiedades del duelo se leen directamente desde los metadatos.

```json
{
  "name": "OpenClaw (La Garra Suprema)",
  "symbol": "RDXVAULT",
  "attributes": [
    { "trait_type": "Card Type", "value": "Vault" },
    { "trait_type": "PWR", "value": "3200" },
    { "trait_type": "RES", "value": "2800" },
    { "trait_type": "Alignment", "value": "Glitch" },
    { "trait_type": "Rarity", "value": "Legendary" }
  ]
}
```

---

## 2. Los Smart Contracts on Solana (Anchor)

La lógica on-chain está estructurada en tres programas principales:

### A. Registro de Decks (`rd-deck-manager`)
- Permite a los jugadores registrar la composición de sus mazos de 40 cartas y su Bóveda de 15 cartas vinculando los mints de sus NFTs.
- Verifica on-chain que no posean más de 3 copias de una misma carta y que las cartas pertenezcan realmente al titular del wallet.

### B. Motor del Estado del Duelo (`rd-duel-engine`)
- Controla el ciclo de vida del duelo PvP.
- **Duelo State PDA:** Almacena la clave pública de los jugadores, sus PIR (Puntos de Integridad de Red, iniciales 8000), las cartas activas en Servidores y Puertos, y el estado de la Cadena (Chain Stack).
- **Procesador de Comandos:**
  - `init_duel`: Los jugadores depositan su mazo sellado y realizan un stake de $RDX.
  - `play_node` / `set_firewall`: Valida la posición y coste del movimiento.
  - `declare_attack`: Realiza el cálculo del combate y deduce el daño a los PIR.

---

## 3. Privacidad y Seguridad con Zero-Knowledge Proofs

### El Desafío de la Información Oculta
Al igual que en Yu-Gi-Oh!, la estrategia de jugar cartas boca abajo (Encriptadas) es vital. Si el estado completo de la carta se subiera de forma transparente a Solana en cada turno, el oponente podría inspeccionar los datos de la transacción en Solscan y saber qué Firewall o Grupo está boca abajo de inmediato.

### La Solución: ZK-State Compression con Light Protocol
- Cuando un jugador coloca una carta boca abajo, el Smart Contract solo almacena un hash criptográfico de la carta en la PDA de la partida.
- El estado real de la carta se almacena de forma cifrada en la base de datos local del jugador (off-chain).
- Cuando el jugador decide activar o revelar la carta (desencriptar):
  1. Genera una prueba de conocimiento cero (**ZK Proof**) en su navegador.
  2. La transacción envía la prueba ZK junto con el identificador del NFT a la blockchain.
  3. El contrato `rd-duel-engine` verifica la validez de la prueba (demostrando que la carta revelada coincide exactamente con el hash original almacenado boca abajo, sin revelar qué carta era antes del momento de su activación).

Esto garantiza un juego **100% justo, privado y ciego**, protegiendo el factor de misterio y estrategia sin comprometer la seguridad on-chain.
