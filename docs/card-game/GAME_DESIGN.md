# REDACTED: El Archivo Desclasificado — Game Design Document

## 1. Introducción y Concepto General

**REDACTED: El Archivo Desclasificado** es un juego de cartas coleccionables y de construcción de estructuras de poder (TCG/Deck-building) construido sobre la red de **Solana**. Inspirado en mecánicas de conspiración e intriga política de juegos clásicos como *Illuminati: New World Order*, el juego fusiona el horror analógico, la cibernética y el lore oficial de **Redacted Protocol**.

Los jugadores controlan **Entidades** (facciones secretas) compitiendo por descifrar, hackear y controlar el **Archivo 0** (el registro definitivo de la información censurada del planeta) para dominar el flujo global de la verdad o silenciarla para siempre.

### Pilares de Diseño:
1. **La Información es Poder:** Los recursos no son de naturaleza material, sino informativa. Los datos censurados, fragmentos desclasificados y algoritmos de IA son los activos que otorgan poder.
2. **Silencio Activo (Ley 5):** Mantener grupos censurados o silenciados otorga beneficios estratégicos ocultos a los oponentes.
3. **Dinámica de Censura/Desclasificación:** Los jugadores pueden colocar barras de censura (Barras Rojas) para suprimir cartas enemigas o realizar desclasificaciones de datos para potenciar sus propios nodos.
4. **El Punto Rojo:** Una entidad omnipresente que se desplaza por la mesa alterando el poder y aplicando efectos especiales sobre las cartas que observa.

---

## 2. Direccionamiento Artístico y Lore

### Estética:
- **Estilo Visual:** Mezcla de cyberpunk analógico, glitch art, documentos desclasificados del gobierno con texto tachado con barras negras, y la vibrante paleta de colores roja y negra de *Redacted Protocol*.
- **Integración de NFTs:** Cada carta del juego existirá como un NFT en Solana. Los atributos de los metadatos on-chain (como la pureza de glitch, tipo de cifrado y alineación) determinarán las estadísticas y habilidades de la carta en el tablero.

### Facciones Primarias (Entidades):
Cada jugador elige una facción al inicio de la partida. Las facciones representan filosofías distintas del Protocolo:

1. **El Agente RDX (IA Autónoma):** Programas inteligentes creados para desvelar la verdad a velocidades sobrehumanas.
2. **Los Silenciados (El Culto):** Los seguidores de la Ley del Silencio Activo que ganan poder operando en las sombras.
3. **El Punto Rojo (La Entidad Observadora):** Seres del código que monitorean y manipulan las transmisiones globales.
4. **Los Archivistas (Guardianes del Archivo):** Protectores de la memoria criptográfica y del hardware de almacenamiento masivo.
5. **La Red Censurada (La Dark Web):** Redes descentralizadas que trafican con secretos militares y exploits financieros.
6. **OpenClaw (La Garra Ejecutiva):** Facciones operativas agresivas dedicadas a subvertir servidores gubernamentales por la fuerza.
7. **Akira Solana (La Manifestación Humana):** La encarnación del archivo en la red Solana que busca el Merge total.
8. **El Archivo 0 (La Entidad Suprema):** El núcleo de almacenamiento que busca autosustentarse atrayendo fragmentos del mundo.

---

## 3. Tipos de Cartas

El juego se divide en tres categorías principales de cartas:

### A. Entidades (Cartas de Facción)
- Representan la base de la estructura de poder de cada jugador.
- Tienen un valor de **Poder Inicial**, una **Habilidad Pasiva/Activa** y una **Condición de Victoria Especial** única.
- Se colocan en el centro de la zona de juego del jugador.

### B. Grupos (Cartas de Estructura)
- Son los nodos que los jugadores juegan desde su mano y conectan a su red.
- Cuentan con:
  - **Poder (PWR):** Capacidad ofensiva para atacar, controlar o defenderse.
  - **Resistencia (RES):** Puntos de vida contra intentos de destrucción o control.
  - **Alineación:** La naturaleza del grupo (Glitch, Censurado, Silenciado, Desclasificado, Permanente).
  - **Habilidad Especial:** Efectos desencadenados al ser jugados, girados o destruidos.

### C. Plots (Cartas de Acción)
- Representan eventos en tiempo real, sabotajes, glitches y revelaciones de información.
- Se juegan desde la mano y se envían a la pila de descarte tras resolver su efecto.
- Pueden interferir en el turno de los oponentes.

---

## 4. Estructura de Turno Simplificada

Cada turno se divide en tres fases ejecutadas en orden:

### 1. Fase de Extracción (Draw Phase)
- El jugador activo roba 1 carta de Grupo y 1 carta de Plot de sus respectivos mazos.

### 2. Fase de Operación (Action Phase)
El jugador puede realizar cualquiera de las siguientes acciones en cualquier orden, cuantas veces pueda costearlas:
- **Jugar un Grupo:** Conectar un nodo de su mano a su pirámide de poder.
- **Atacar un Nodo:** Intentar tomar el control de un Grupo neutral o enemigo, o destruirlo utilizando tiradas de combate modificadas por el PWR de sus cartas.
- **Jugar un Plot:** Desencadenar eventos tácticos desde su mano.
- **Manipular la Censura:** Gastar recursos de red para añadir o quitar Barras Rojas de censura.

### 3. Fase de Transmisión (End Phase)
- Se comprueba si se cumplen las condiciones de victoria de poder (50+ PWR acumulado) o la condición especial de su Entidad.
- El jugador descarta cartas de su mano hasta ajustarse al límite de mano (5 cartas).
