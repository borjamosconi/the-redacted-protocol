# Roadmap de Lanzamiento: The Redacted Protocol (Mainnet)

Para pasar de la fase de Testnet/Devnet actual a un lanzamiento exitoso en la **Mainnet de Solana**, necesitamos completar los siguientes hitos técnicos y operativos.

## 1. Infraestructura de Red (Solana Mainnet)
*   **RPC de Alto Rendimiento:** Devnet usa Helius/Solana Public RPC. Para Mainnet, necesitamos un **Helius Paid Plan** o **QuickNode** para manejar el tráfico real sin sufrir rate-limits de la red.
*   **Actualización de .env:**
    ```env
    SOLANA_NETWORK=mainnet-beta
    SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_KEY_PRODUCTIVA
    ```

## 2. Contratos Inteligentes (Anchor)
*   **Despliegue de Producción:** El programa Anchor debe ser desplegado en Mainnet.
    *   Costo aproximado: ~2-3 SOL por el espacio de cuenta del programa.
*   **Gestión de Autoridad:** Configurar una **Multisig (Squads)** para la autoridad del programa. Nunca dejes la autoridad en una "hot wallet" individual en Mainnet.
*   **IDL Pública:** Verificar y subir el IDL a Solana Explorer para que los usuarios puedan auditar las transacciones.

## 3. Backend y Agente IA (Pumpfun-backend / RD.exe)
*   **VPS de Producción:** Actualmente usamos scripts de despliegue rápido. Para Mainnet, necesitamos:
    *   **Docker Swarm o Kubernetes** para asegurar que el bot nunca se caiga.
    *   **Base de Datos persistente (Postgres/Redis)** para el seguimiento de XP y Airdrops en tiempo real.
*   **Wallet de Operaciones:** La wallet del agente (`wallet.json`) debe tener SOL real para pagar las rentas de los nuevos tokens creados.

## 4. Seguridad y Auditoría
*   **Revisión de Código:** Una auditoría externa (o al menos una revisión interna exhaustiva de seguridad) antes de manejar fondos reales de usuarios.
*   **Rate-Limiting Externo:** Aunque implementamos middleware, se recomienda activar **Cloudflare WAF** delante de `redacted.bond` para filtrar bots de nivel 7.

## 5. Gamificación y Airdrop
*   **Snapshot Logic:** Definir exactamente los criterios de "Decryption Rank" para el $RDX airdrop.
*   **Anti-Sybil:** Implementar un sistema básico para evitar que una persona cree 1000 wallets para farmear el airdrop (ej: requerir un balance mínimo de 0.05 SOL o verificación de X/Twitter).

## 6. Checklist Operativo
*   **Liquidez Inicial:** SOL necesario para el "seeding" de la curva de vinculación (bonding curve) si el agente lanza los tokens automáticamente.
*   **Twitter/X Bot:** Asegurar que la API de Twitter esté en nivel "Pro" para manejar las notificaciones de nuevos lanzamientos sin bloqueos.
*   **Marketing Assets:** Ya tenemos el logo del mono y el diseño brutalista, lo cual es excelente para el "brand awareness".

---

> [!IMPORTANT]
> **Próximo Paso Inmediato:** Realizar una "Simulación de Día Zero" en Devnet, intentando romper el sistema con múltiples usuarios concurrentes antes de comprometer fondos reales en Mainnet.
