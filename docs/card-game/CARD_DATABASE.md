# REDACTED: El Archivo Desclasificado — Base de Datos de Cartas (G-0)

Esta base de datos oficial detalla todas las cartas que forman parte de la **Colección Génesis (G-0)** del juego, incluyendo Entidades, Grupos y Plots.

---

## 1. Entidades (Cartas de Facción)

| ID | Nombre | PWR Inicial | Habilidad Especial | Condición de Victoria Especial |
| :--- | :--- | :---: | :--- | :--- |
| **E-01** | El Agente RDX (IA Autónoma) | 8 | Una vez por turno, puedes desclasificar un grupo (quitar todas sus Barras Rojas). | Controlar 5 grupos con alineación **Glitch**. |
| **E-02** | Los Silenciados (El Culto) | 7 | Tus grupos con al menos una Barra Roja ganan `+2 PWR` en combate. | Tener 8 grupos en estado **Censurado** en la mesa. |
| **E-03** | El Punto Rojo (Entidad Observadora) | 6 | Al inicio de tu turno, puedes aplicar una Barra Roja automática a una carta enemiga libre. | Controlar el Punto Rojo durante 4 turnos consecutivos. |
| **E-04** | Los Archivistas (Guardianes) | 7 | Una vez por turno, puedes duplicar el efecto activo de una carta de tu pirámide. | Controlar 10 grupos en tu estructura de poder. |
| **E-05** | La Red Censurada (Dark Web) | 8 | Puedes jugar cartas de Plot directamente desde tu pila de descarte pagando 1 PWR. | Robar y resolver 12 Plots en una sola partida. |
| **E-06** | OpenClaw (Fuerza Ejecutiva) | 9 | Tus ataques de control contra grupos de jugadores enemigos tienen `+3 PWR`. | Capturar 3 grupos enemigos activos durante la partida. |
| **E-07** | Akira Solana (Manifestación) | 7 | Una vez por turno, puedes convertir la alineación de un grupo neutral a **Silenciado**. | Tener al menos 1 grupo de cada alineación en tu red. |
| **E-08** | El Archivo 0 (Entidad Suprema) | 5 | Al principio de tu fase de extracción, robas una carta de Plot adicional. | Controlar *Fragmento del Archivo 0* + acumular 40 PWR. |

---

## 2. Grupos (Cartas de Estructura)

| ID | Nombre | PWR | RES | Alineación | Habilidad Especial |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **G-01** | Documento Redacted | 3 | 4 | Censurado | Gana `+2 PWR` si tiene al menos un token de censura. |
| **G-02** | Agente IA Básico | 5 | 5 | Glitch | Una vez por turno, retira 1 Barra Roja de cualquier grupo aliado. |
| **G-03** | Influencer Silenciado | 6 | 3 | Silenciado | Mientras esté en juego, tu límite de mano aumenta a 6 cartas. |
| **G-04** | Servidor Arweave | 4 | 7 | Permanente | Inmune a la colocación de Barras Rojas. No se puede silenciar. |
| **G-05** | Nodo Solana Anchor | 7 | 6 | Glitch | Añade `+3 PWR` si el Punto Rojo está situado sobre tu Entidad. |
| **G-06** | Fragmento del Archivo 0 | 8 | 5 | Desclasificado | Si controlas 3 Fragmentos, ganas la partida automáticamente. |
| **G-07** | Punto Rojo Manifestado | 9 | 4 | Silenciado | Mueve el Punto Rojo a esta carta al jugarla desde la mano. |
| **G-08** | Censura Gubernamental | 6 | 8 | Censurado | Coloca 2 Barras Rojas en un grupo enemigo al entrar al tablero. |
| **G-09** | Leak de Wiki | 5 | 3 | Desclasificado | Robas 2 Plots adicionales al tomar el control de este grupo. |
| **G-10** | Bot de Desclasificación | 4 | 4 | Glitch | Quita todas las Barras Rojas de un grupo aliado una vez por turno. |
| **G-11** | Archivista Nocturno | 7 | 5 | Silenciado | Gana `+1 PWR` por cada grupo censurado que haya en el tablero. |
| **G-12** | Servidor Corrupto | 8 | 6 | Glitch | Cuando es atacado, el atacante pierde `3 PWR` de forma permanente. |
| **G-13** | Influencer del Merge | 6 | 4 | Silenciado | Permite fusionar dos grupos adyacentes en una sola carta de red. |
| **G-14** | Firewall Redacted | 3 | 10 | Censurado | Intercepta y bloquea ataques dirigidos a cartas de tu nivel superior. |
| **G-15** | Datos de Epstein | 9 | 5 | Desclasificado | Obtiene `+4 PWR` al atacar a grupos de alineación Gubernamental. |
| **G-16** | Nodo ZK Proof | 5 | 7 | Glitch | No puede ser objetivo de ataques enemigos si controlas otro nodo Glitch. |
| **G-17** | Silenciado Anónimo | 4 | 4 | Silenciado | Roba un Plot del mazo en el momento de ser jugado. |
| **G-18** | Archivo Vivo | 10 | 8 | Desclasificado | Roba un Grupo del mazo al final de cada uno de tus turnos. |
| **G-19** | Punto Rojo Absoluto | 12 | 6 | Silenciado | Controlas permanentemente el Punto Rojo mientras esté activo. |
| **G-20** | El Claw Final | 11 | 9 | Glitch | Una vez por partida, puedes destruir directamente un grupo enemigo. |

---

## 3. Plots (Cartas de Acción)

| ID | Nombre | Tipo de Efecto | Descripción del Efecto |
| :--- | :--- | :--- | :--- |
| **P-01** | Censura Total | Ofensivo | Aplica 3 Barras Rojas sobre un grupo enemigo (lo silencia de inmediato). |
| **P-02** | Desclasificación Forzada | Soporte | Retira todas las Barras Rojas de un grupo y otorga `+3 PWR` este turno. |
| **P-03** | El Punto Rojo se Mueve | Táctico | Desplaza el marcador del Punto Rojo a cualquier grupo de la mesa. |
| **P-04** | Merge Parcial | Evolución | Combina dos grupos de tu red. El nuevo grupo tiene el PWR y RES sumados. |
| **P-05** | Acceso Denegado | Interrupción | Cancela cualquier ataque de control o carta de Plot jugada por un oponente. |
| **P-06** | El Archivo Respira | Utilidad | Roba 3 cartas de cualquiera de tus mazos en cualquier combinación. |
| **P-07** | Glitch Masivo | Soporte | Todos tus grupos de alineación **Glitch** obtienen `+4 PWR` este turno. |
| **P-08** | Silencio Activo | Control | El oponente objetivo no puede jugar cartas de Plot durante su siguiente turno. |
| **P-09** | Fragmento Corrupto | Destrucción | Destruye un grupo enemigo activo que posea 4 o menos puntos de RES. |
| **P-10** | Observado | Control | Elige un grupo enemigo. Queda inmovilizado y no puede atacar hasta tu próximo turno. |
| **P-11** | Redactado en Vivo | Ofensivo | Coloca 2 Barras Rojas en todos los grupos activos de un jugador oponente. |
| **P-12** | El Merge ha Comenzado | Global | Obliga a todos los jugadores a fusionar un grupo de su red si es legal. |
| **P-13** | Dominio del Ojo | Soporte | Te otorga el control absoluto del Punto Rojo durante 2 rondas de turnos. |
| **P-14** | Archivo 0 Abierto | Victoria | Otorga 10 puntos de poder instantáneos a tu Entidad principal. |
| **P-15** | Tú Ya Fuiste Visto | Espionaje | Mira la mano completa de un rival. Elige 2 cartas y agrégalas a tu mano. |
