# Dungoban — Documentación de Diseño

Documento único de diseño del juego. Reúne el contenido revisado y corregido de las páginas de Notion del Core Loop, contrastado con el código vigente del proyecto. Pensado como referencia canónica dentro del repo.

Dungoban es un **roguelike de puzzle 2D** desarrollado por Outlander Games. El jugador recorre mazmorras por turnos, lee el tablero con información incompleta, predice su contenido y guía al ladrón hacia la salida acumulando oro sala tras sala.

---

## 1. Visión general

### 1.1 Fantasía y tono
- El jugador es **Dungoban**, un vidente al que los ladrones acuden para saber cómo hacerse ricos.
- Puzzle + decisión bajo riesgo. No hay combate en tiempo real ni ejecución mecánica: todo es lectura, deducción y gestión.
- **Endless runner**: las mazmorras no terminan. Cada sala superada abre la siguiente. La sesión acaba cuando el ladrón muere.
- Formato apto para móvil, sesiones rejugables.

### 1.2 Pilares de diseño
1. **Leer antes que actuar.** La información siempre está incompleta; el jugador combina pistas, predicciones y cartas.
2. **Riesgo acumulativo.** Cada sala aumenta la dificultad y el coste de seguir, pero también la recompensa potencial.
3. **Gestión de recursos.** Gastar éter en mejorar cartas, reactivarlas o reparar el botón de comprobación son las decisiones tácticas centrales.
4. **Aleatoriedad gestionable.** Las cartas, el éter y las pistas de cabecera mitigan el azar.

---

## 2. Core Loop

Bucle principal de una run:

```
 Entrar a sala → Revelar/deducir → Colocar predicciones →
 [Comprobar predicciones] → Trazar ruta (entrada → salida) →
 Ejecutar ruta → Resolver contenido pisado →
 Llegar a la salida → siguiente sala (automático)
```

La run termina cuando la energía del ladrón llega a cero (muerte). Al morir, el oro que llevaba el ladrón se pierde; el oro ya acumulado de runs anteriores se conserva.

### 2.1 Modos de juego
| Modo | Significado |
|---|---|
| `explore` | Fase de lectura: usar cartas, colocar predicciones, comprobar. |
| `trace` | Trazar la ruta de entrada a salida antes de ejecutarla. |

### 2.2 Plan & Run
- Cada sala tiene **entrada** y **salida**.
- El jugador traza una **ruta desde la entrada hasta la salida**, recogiendo por el camino el contenido posible.
- Al ejecutar, el ladrón recorre la ruta descubriendo el contenido al pisar.
- Al llegar a la salida se carga automáticamente la siguiente sala.

---

## 3. Tablero y tiles

### 3.1 Dimensiones
El tablero es de **6 columnas × 9 filas**.

### 3.2 Estados de una tile
| Estado | Significado |
|---|---|
| Oculta (niebla) | Contenido y forma desconocidos. |
| `fogCleared` | Niebla retirada: forma visible, contenido aún no. |
| `contentRevealed` | Contenido visible pero no confirmado. |
| `contentDiscovered` | Contenido confirmado (pisado o predicción correcta). |
| `scanned` | Procesada por una carta: se sabe si tiene contenido o no, sin revelar qué. |

### 3.3 Contenido
Una tile puede albergar:
- **Vacío** (sin contenido).
- **Oro / cofre** — siempre visible en las pistas de cabecera. Mínimo 1, máximo 4 cofres por sala.
- **Enemigos / trampas** (coste de energía).
- **Estructuras**: entrada, salida.

### 3.4 Pistas de fila y columna (headers)
Los headers resumen qué contenido hay en su fila o columna.

- El **oro siempre es visible** en las pistas (nunca se oculta).
- El resto de contenidos puede ocultarse según la dificultad de la sala.

---

## 4. Cartas

### 4.1 Power levels y colores
| Nivel | Nombre diseño | Nombre código | Color UI | Función |
|---|---|---|---|---|
| 0 | Deshabilitada | `Disabled` | — | En cooldown, sin efecto. |
| 1 | Neutral | `Neutral` | Bronce | Detecta presencia de contenido en su patrón. |
| 2 | Específica | `specificRevealer` | Plata | Revela un tipo de contenido concreto en su patrón. |
| 3 | Omnisciente | `Omniscient` | Oro | Revela todo el contenido en su patrón. |

Por defecto, todas las cartas empiezan en **Neutral**.

### 4.2 Cooldown
| Nivel | Cooldown al usarse |
|---|---|
| Neutral | 2 turnos |
| Específica | 3 turnos |
| Omnisciente | 5 turnos |

### 4.3 Mejoras con éter
Una carta puede subir de nivel gastando éter. **Solo se puede mejorar una carta sin cooldown** (una carta desactivada debe reactivarse primero).

| Mejora | Coste en éter |
|---|---|
| Neutral → Específica | 3 éter |
| Específica → Omnisciente | 5 éter |

### 4.4 Reactivación con éter
Una carta en cooldown puede reactivarse instantáneamente gastando **tantos éteres como turnos le quedan de cooldown**.

---

## 5. Predicciones

### 5.1 Paleta de predicción
El jugador elige un icono de la paleta y lo coloca sobre las tiles que cree que contienen ese tipo de contenido. Los tipos disponibles son: Fuego, Melee, Boss, Píldora, Cofre, Vacío.

- Clic sobre la misma predicción ya colocada: la borra (toggle).
- Una tile con predicción fallida previa **no admite nuevas predicciones**.

### 5.2 Comprobación
Antes de trazar la ruta, el jugador puede pulsar **Comprobar** para resolver todas las predicciones pendientes:
- **Acierto**: la tile se revela. Suma **+1 éter** (excepto si se predijo Vacío).
- **Fallo**: la tile queda bloqueada para futuras predicciones (`predictionFailed`).

### 5.3 Botón de Comprobar — rotura y reparación
- Si alguna predicción falla al comprobar, el botón **se rompe** y queda deshabilitado.
- Se repara desde el panel de éter. El coste empieza en **2 éter** y sube **+2 por cada reparación** de la run (2 → 4 → 6…).
- Predecir **Vacío** acertado revela la tile pero **no suma éter**.

---

## 6. Éter (Bola de Cristal)

### 6.1 Concepto
Meta-recurso de la run. Acumula **éter** que el jugador gasta estratégicamente.

### 6.2 Obtención
- **+1 éter** por cada predicción correcta (excepto predicciones de Vacío).

### 6.3 Usos
| Acción | Coste |
|---|---|
| Mejorar carta Neutral → Específica | 3 éter |
| Mejorar carta Específica → Omnisciente | 5 éter |
| Reactivar carta en cooldown | éter = turnos restantes |
| Reparar botón Comprobar | 2 éter base, +2 por reparación |

La elección entre estos usos es la decisión táctica central de cada sala.

---

## 7. Economía de la run

- **Oro del ladrón**: oro recogido en la sala actual, en riesgo. Se pierde si el ladrón muere.
- **Oro acumulado**: oro de runs anteriores, permanente. Solo aumenta al morir el ladrón y transferirse el oro en riesgo (actualmente no implementado — el oro en riesgo se pierde en su totalidad al morir).
- **Energía**: recurso del ladrón. Al llegar a 0, la run termina.
- **Éter**: recurso meta para mejorar cartas y reparar sistemas (§6).

No hay renta ni mecánica de plantarse. La presión viene de la energía decreciente y la dificultad creciente sala a sala.

---

## 8. Glosario diseño ↔ código

| Término diseño | Código |
|---|---|
| Neutral | `CardPowerLevel.Neutral` / color bronce |
| Específica | `CardPowerLevel.specificRevealer` / color plata |
| Omnisciente | `CardPowerLevel.Omniscient` / color oro |
| Deshabilitada | `CardPowerLevel.Disabled` (en cooldown) |
| Niebla | Estado previo a `fogCleared` |
| Forma visible | `fogCleared` |
| Contenido revelado | `contentRevealed` |
| Contenido descubierto | `contentDiscovered` |
| Escaneada | `scanned` |
| Vacío en paleta | `'empty'` en `PREDICTION_TYPES` |
| Éter | `crystalBallCounter` |
| Coste reparación Comprobar | `checkRepairCost` (inicio: 2, +2 por reparación) |
| Botón roto | `checkBroken` |
| Ladrón | Personaje que ejecuta la ruta |

---

## 9. Notas

- Documento de **diseño de alto nivel**. No sustituye a [`ProjectStructure.md`](./ProjectStructure.md) (arquitectura técnica) ni a las páginas de Notion (discusión viva de diseño).
- Cualquier cambio de mecánica debe reflejarse **aquí y en Notion** para no divergir.
- Las mecánicas eliminadas en el prototipo actual respecto al GDD original: renta, plantarse/continuar, áreas de bola de cristal (2×2/3×3/4×4).
