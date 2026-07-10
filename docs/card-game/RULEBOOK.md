# REDACTED: El Archivo Desclasificado — Manual de Reglas Oficiales

Este manual describe el funcionamiento, las fases de turno y el sistema de combate detallado de **REDACTED: El Archivo Desclasificado**.

---

## 1. Conceptos Fundamentales

### Pirámide de Poder (Estructura de Red)
Cada jugador coloca sus cartas en su propia zona de juego formando una estructura de árbol invertido llamada **Pirámide de Poder**.
- La carta **Entidad** se sitúa en la cúspide (Nivel 0).
- Las cartas de **Grupo** se colocan debajo en niveles descendentes (Nivel 1, 2, etc.).
- Cada grupo tiene un número máximo de enlaces que puede controlar debajo de él (representado en su carta). Si un grupo controlador es destruido o capturado, todos los grupos que dependían de él quedan desconectados y van a la pila de descarte.

### Barras Rojas (Tokens de Censura)
- Representan la supresión de información.
- Se pueden colocar sobre cualquier carta de Grupo en juego a través de efectos de cartas o acciones.
- **Efecto de la Censura:** Cada Barra Roja reduce en `-1` el Poder (PWR) y la Resistencia (RES) de la carta.
- **Estado REDACTED:** Si una carta acumula **3 Barras Rojas**, queda silenciada por completo: su PWR y RES caen a 0, pierde sus habilidades y no puede atacar ni defender hasta que sea desclasificada (retirando los tokens).

### El Punto Rojo (The Red Point)
- Es un marcador de madera o metal de color rojo brillante que representa el ojo del Protocolo.
- Solo existe **un único Punto Rojo** en juego para toda la mesa.
- **Efecto de Observación:** El grupo sobre el que esté posado el Punto Rojo tiene inmunidad contra ataques sorpresa y añade `+3 PWR` al jugador que lo controla. Al inicio de su turno, el jugador controlador puede usar el Punto Rojo para aplicar una Barra Roja automática a una carta enemiga libre.

---

## 2. Preparación de la Partida

1. Cada jugador coloca su carta de **Entidad** boca arriba en su área de juego.
2. Cada jugador baraja su mazo de **Grupos** y su mazo de **Plots** por separado y los sitúa al lado de su Entidad.
3. Se determina quién inicia la partida (por ejemplo, el jugador con el NFT de carta de mayor antigüedad en Solana o mediante un dado).
4. El jugador inicial coloca el **Punto Rojo** sobre su Entidad.
5. Cada jugador roba **3 Grupos** y **3 Plots** para formar su mano inicial.

---

## 3. Fase de Combate (Ataques de Control)

Para expandir tu red, puedes intentar capturar un Grupo neutral del centro de la mesa o un Grupo enemigo del rival.

### Fórmula de Ataque de Control:
Para realizar un ataque de control sobre una carta enemiga, debes elegir cuál de tus grupos libres iniciará el ataque y sumar los siguientes valores:

$$\text{Poder de Ataque} = \text{PWR del atacante} + \text{Modificadores de Alineación} + \text{Tirada de } 2d6$$

$$\text{Poder de Defensa} = \text{RES del objetivo} + \text{PWR de su controlador directo} + \text{Barras Rojas acumuladas (como penalizador)}$$

### Resolución:
- Si el **Poder de Ataque** es estrictamente mayor que el **Poder de Defensa**, el atacante toma el control de la carta enemiga y la desplaza a su propia pirámide de poder (conectándola a una de sus cartas libres).
- Si no se supera el Poder de Defensa, el ataque falla. El grupo atacante queda agotado (girado) durante ese turno.

---

## 4. Ejemplo de Partida (Una Ronda Completa)

### Jugador A (Controla: El Agente RDX) vs Jugador B (Controla: Los Silenciados)

#### Turno del Jugador A:
1. **Fase de Extracción:** El Jugador A roba 1 Grupo (*Leak de Wiki*) y 1 Plot (*Censura Total*).
2. **Fase de Operación:**
   - El Jugador A decide conectar el Grupo *Leak de Wiki* (Nivel 1) debajo de su Entidad.
   - Declara un ataque de control contra la carta neutral *Servidor Corrupto* (PWR 8, RES 6).
   - Usa su *Agente RDX* (PWR 8) para realizar el ataque. Lanza dos dados de 6 caras ($2d6$) y obtiene un 7.
     $$\text{Poder de Ataque} = 8 \text{ (PWR RDX)} + 7 \text{ (Dados)} = 15$$
     $$\text{Poder de Defensa} = 6 \text{ (RES Servidor)} = 6$$
   - Dado que $15 > 6$, el ataque tiene éxito. El Jugador A arrastra el *Servidor Corrupto* a su red y lo enlaza bajo *Leak de Wiki*.
3. **Fin del Turno:** Se comprueba el poder total de la pirámide del Jugador A (ahora suma 16 puntos). Su mano tiene 4 cartas, por lo que no necesita descartar. Cede el turno.
