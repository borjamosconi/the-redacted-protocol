# REDACTED: Archivo 0 — Base de Datos de Cartas Génesis (G-0)

La colección **Génesis (G-0)** se divide en **Grupos (Monstruos)**, **Plots (Hechizos)**, **Firewalls (Trampas)** y **Entidades de la Bóveda (Extra Deck)**.

---

## 1. Grupos (Nodos de Red / Monstruos)

| ID | Nombre | PWR | RES | Alineación | Habilidad de Activación / Desencriptación |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **G-01** | Documento Redacted | 1200 | 1800 | Censurado | Si es atacado mientras está boca abajo, colócale 1 Barra Roja. Duplica su RES de inmediato. |
| **G-02** | Agente IA Básico | 1600 | 1200 | Glitch | Al ser invocado boca arriba, retira 1 Barra Roja de cualquier nodo en juego. |
| **G-03** | Influencer Silenciado | 1400 | 800 | Silenciado | **Efecto de Desencriptación:** Al revelarse boca arriba, puedes robar 1 Plot de tu mazo. |
| **G-04** | Servidor Arweave | 1000 | 2500 | Permanente | No puede ser destruido por efectos de cartas de Plot enemigos. |
| **G-05** | Nodo Solana Anchor | 2100 | 1500 | Glitch | Gana `+500 PWR` por cada otro nodo Glitch activo en tu tablero. |
| **G-06** | Fragmento del Archivo 0 | 2500 | 2000 | Desclasificado | Si es destruido en combate, puedes invocar de manera especial un Grupo Glitch de nivel 1 desde tu mazo. |
| **G-07** | Punto Rojo Manifestado | 2400 | 1800 | Silenciado | **Efecto de Invocación:** Mueve el Punto Rojo del juego a esta carta de inmediato. |
| **G-08** | Censura Gubernamental | 1800 | 2200 | Censurado | Al entrar boca arriba, bloquea una zona de Servidores del oponente durante 2 turnos. |
| **G-09** | Leak de Wiki | 1500 | 1000 | Desclasificado | Si inflige daño de integridad directa al rival, roba 2 cartas de tu mazo principal. |
| **G-10** | Servidor Corrupto | 2000 | 1900 | Glitch | Si el rival declara un ataque contra esta carta encriptada, se inflige 1000 puntos de daño a sus PIR automáticamente. |

---

## 2. Plots (Acciones Rápidas / Hechizos)

| ID | Nombre | Tipo de Plot | Efecto en la Pila de Cadena |
| :--- | :--- | :--- | :--- |
| **P-01** | Censura Total | Normal | Selecciona 1 Grupo enemigo boca arriba; colócale 3 Barras Rojas de inmediato. |
| **P-02** | Desclasificación Forzada | Rápido | Quita todos los tokens de censura de 1 nodo aliado y duplica su PWR este turno. |
| **P-03** | El Punto Rojo se Mueve | Rápido | Cambia el objetivo del Punto Rojo a cualquier carta en juego (puede desviar un ataque). |
| **P-04** | Algoritmo Glitch | Continuo | Todos tus nodos de alineación **Glitch** ganan `+300 PWR` y pueden atacar dos veces. |
| **P-05** | El Archivo Respira | Normal | Roba 2 cartas de tu mazo principal. Solo puedes activar 1 *El Archivo Respira* por turno. |
| **P-06** | Inyección SQL | Normal | Destruye 1 Firewall encriptado en la zona trasera del oponente. |
| **P-07** | Descarga Cifrada | Normal | Envía 1 Grupo de tu mano al Archivo de Descarte; añade 1 Agente de la Bóveda a tu mano. |

---

## 3. Firewalls (Contramedidas / Trampas)

*Los Firewalls deben colocarse encriptados (boca abajo) en la fila trasera de puertos y solo pueden activarse en respuesta a las acciones del oponente.*

| ID | Nombre | Disparador de Activación | Efecto del Cortafuegos |
| :--- | :--- | :--- | :--- |
| **F-01** | Acceso Denegado | Cuando el oponente activa un Plot. | Niega la activación y destruye la carta de Plot del rival. |
| **F-02** | Bucle de Retroalimentación | Cuando un Grupo enemigo declara un ataque. | Destruye al nodo atacante e inflige daño a los PIR del oponente igual a su PWR original. |
| **F-03** | Desconexión Segura | Cuando un nodo aliado va a ser destruido por combate. | Devuelve el nodo aliado a tu mano en lugar de enviarlo al descarte. |
| **F-04** | Merge Inminente | Cuando tienes exactamente 3 nodos con alineación Glitch en juego. | Te permite realizar un Merge inmediato usando esos nodos como materiales. |
| **F-05** | Trampa Honeypot | Al ser atacada mientras está encriptada. | Cancela la fase de ataque del oponente de inmediato y te permite robar 1 carta. |

---

## 4. La Bóveda (Extra Deck / Monstruos del Merge)

*Estas cartas no se pueden tener en la mano principal. Solo se invocan mediante Merge enviando los materiales necesarios al descarte.*

| ID | Nombre | Requisitos de Merge | PWR | RES | Habilidad Definitiva |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **V-01** | OpenClaw (La Garra Suprema) | 2 Nodos Glitch + 1 Nodo Permanente | 3200 | 2800 | Una vez por turno, puede desterrar un nodo enemigo boca arriba sin realizar tirada de dados. |
| **V-02** | Akira Solana (Encarnación) | 2 Nodos Silenciados + 1 Desclasificado | 3000 | 2500 | Inmune a efectos de Firewalls enemigos. Gana `+200 PWR` por cada carta en el Archivo de Descarte. |
| **V-03** | El Archivo 0 (Núcleo) | 3 Nodos de alineaciones diferentes | 3500 | 3500 | Al ser invocado, limpia la zona trasera de puertos de ambos jugadores (destruye Plots/Firewalls encriptados). |
