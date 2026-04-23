# Dungoban — Documentación de Diseño

Documento único de diseño del juego. Reúne el contenido revisado y corregido de las páginas de Notion del Core Loop, contrastado con el código vigente del proyecto. Pensado como referencia canónica dentro del repo.

Dungoban es un **roguelike de puzzle 2D** desarrollado por Outlander Games. El jugador recorre mazmorras por turnos, lee el tablero con información incompleta, predice su contenido y decide cuándo plantarse o seguir arriesgando.

---

## 1. Visión general

### 1.1 Fantasía y tono
- El jugador es un **explorador de mazmorras**. Cada sala es una puerta más.
- Puzzle + decisión bajo riesgo. No hay combate en tiempo real ni ejecución mecánica: todo es lectura, deducción y gestión.
- Sesión corta, rejugable, formato apto para móvil.

### 1.2 Pilares de diseño
1. **Leer antes que actuar.** La información siempre está incompleta; el jugador combina pistas, predicciones y cartas.
2. **Riesgo escalado.** Cada sala sube dificultad y coste, pero también recompensa potencial.
3. **Decisión constante.** Plantarse o continuar, gastar cargas ahora o reservar.
4. **Aleatoriedad gestionable.** Las cartas, la Bola de Cristal y las pistas mitigan el azar.

---

## 2. Core Loop

Bucle principal de una run:

```
 Entrar a sala → Revelar/deducir → Predecir →
 Trazar ruta (entrada → salida, recogiendo contenido) → Confirmar →
 Resolver movimiento → Botín + multiplicador →
 [Plantarse]  o  [Continuar pagando renta]
```

### 2.1 Stages del juego
| Stage | Significado |
|---|---|
| `NONE` | Sin sala activa. |
| `Play` | Fase de lectura: revelar, usar cartas, predecir. |
| `PlayerMovement` | El personaje ejecuta la ruta trazada. |
| `Stand` | Fin de sala: cálculo de botín y decisión de plantarse/continuar. |

Un ciclo completo de estos estados equivale a **un turno**.

### 2.2 Plan & Run
- Cada sala tiene **entrada** y **salida**.
- El jugador traza una **ruta desde la entrada hasta la salida, recogiendo por el camino el contenido posible**.
- En `PlayerMovement`, el personaje recorre esa ruta descubriendo el contenido al pisar.

---

## 3. Tablero y tiles

### 3.1 Estados de una tile
| Estado | Significado |
|---|---|
| Oculta (niebla) | Contenido y forma desconocidos. |
| `fogCleared` | Niebla retirada: forma visible, contenido aún no. |
| `contentRevealed` | Contenido visible pero no confirmado. |
| `contentDiscovered` | Contenido confirmado (pisado o validado). |
| `scanned` | Procesada por alguna carta de información. |

### 3.2 Clarividencia
`contentDiscovered` habilita la **Clarividencia**: un contenido confirmado queda como dato estable para el resto de la run (por pisado, por predicción correcta o por detección de carta válida).

### 3.3 Contenido
Una tile puede albergar:
- **Vacío** (sin contenido).
- **Oro / tesoro.**
- **Enemigos / trampas** (coste de energía o bloqueo).
- **Estructuras** (entrada, salida, paredes).
- **Contenidos especiales** definidos en `ContentLibrary`.

Nombres canónicos: `Content`, `ContentLibrary`, `ContentPrefab`, `TileStructureDefinition`, `MapTileData`.

### 3.4 Pistas de fila y columna (headers)
Los headers resumen qué contenido hay en su fila o columna.

- **Global**: comportamiento por defecto según reglas del run.
- **`ForceVisible`**: el preset fuerza que la pista sea visible.
- **`ForceUnknown`**: el preset fuerza que la pista se oculte.
- **Iconos ocultos**: con probabilidad `headerHiddenIconProbability`, un icono real se oculta al jugador. **No todo lo anunciado es todo lo que hay.**

---

## 4. Cartas

### 4.1 Power levels
| Nivel | Nombre diseño | Nombre código | Función |
|---|---|---|---|
| 0 | Deshabilitada | `Disabled` | Sin efecto (cooldown u override). |
| 1 | Neutral | `Neutral` | Detecta presencia de contenido en un rango. |
| 2 | Predictiva específica | `specificRevealer` | Refuerza la predicción de un contenido concreto. |
| 3 | Omnisciente | `Omniscient` | Revelación total de contenido en su rango. |

### 4.2 Cooldown
- Tras usarse, la carta descansa X turnos (`CooldownSettings`: `neutralCardCooldown`, `specificRevealerCardCooldown`, `omniscientCardCooldown`).
- Un `BoardPreset` puede sobrescribir la duración (`CooldownOverride`).
- El cooldown puede romperse externamente, p. ej. con una carga de Bola de Cristal (§6).

### 4.3 Mejoras
Una carta puede subir de power level gastando una carga de Bola de Cristal: Neutral → Predictiva específica → Omnisciente.

---

## 5. Predicciones

### 5.1 Paleta de predicción
El sistema actual es una **paleta lateral** (`PredictionPaletteController`).

- El jugador elige un icono en la paleta (contenido o `EMPTY_TILE_ID` para "tile vacía").
- Lo coloca sobre las tiles que cree corresponden a ese contenido.
- Se puede marcar explícitamente una tile **como vacía**.

### 5.2 Resolución
- Al confirmar el movimiento, las predicciones se resuelven contra el contenido real.
- **Acierto**: suma al multiplicador de oro del turno.
- **Fallo**: cuenta hacia el cierre de predicciones.

### 5.3 Interacciones
Las predicciones sí interactúan con otros sistemas:
- **Bola de Cristal**: las rachas de aciertos generan cargas (§6.2).
- **Cierre de predicciones**: los fallos acumulados pueden bloquear el sistema.

### 5.4 Cierre de predicciones
- Al acumular fallos suficientes se activa el cierre: el jugador **deja de poder predecir**.
- Se repara gastando cargas de Bola de Cristal.
- El coste escala con cada reparación de la run (`CurrentPredictionRepairCost`).

---

## 6. Bola de Cristal

### 6.1 Concepto
Meta-recurso de la run. Acumula **cargas** que el jugador gasta estratégicamente.

### 6.2 Obtención de cargas
- **Rachas de aciertos**: encadenar predicciones correctas añade **+1 carga** a la Bola de Cristal.
- Fuentes puntuales según preset/evento.

### 6.3 Usos de una carga
1. **Mejorar una carta** (subir power level).
2. **Reactivar una carta en cooldown** (romper cooldown).
3. **Reparar el cierre de predicciones** (§5.4), con coste escalado.

La elección entre estos tres usos es una de las decisiones tácticas centrales.

---

## 7. Multiplicador y botín

### 7.1 Oro base
- Las tiles de contenido monetario aportan **oro** al pisarlas.
- Configurable por celda vía `overrideGoldReward` en `BoardPreset`.

### 7.2 Multiplicador
- Cada **acierto de predicción** sube el multiplicador de oro de la sala.
- El multiplicador se aplica al botín del turno.

---

## 8. Decisión de run: Plantarse / Continuar

Al cerrar una sala (stage `Stand`) el jugador decide:

- **Plantarse**: cierra la run con el botín acumulado.
- **Continuar**: avanza a la siguiente sala pagando **renta** (coste de turno). Más dificultad, más recompensa potencial.

Ambos botones pueden habilitarse/deshabilitarse vía `BoardPreset.DisabledButtons` (`PlayRoute`, `Prediction`, `Continue`, `Stand`), herramienta clave para guionizar tutoriales y eventos.

---

## 9. Economía de la run

- **Oro**: moneda principal, suma por contenido y multiplicador.
- **Renta**: coste pagado al continuar a la siguiente sala.
- **Energía**: recurso gastado frente a contenido hostil; a 0, la run termina.
- **Cargas de Bola de Cristal**: recurso meta (§6).

La presión económica empuja a plantarse antes de que la renta devore el margen.

---

## 10. BoardPreset

`BoardPreset` es un ScriptableObject que define una sala fija con reglas específicas.

**Usos**:
- **Tutorial** (vía `TutorialBoardManager`): secuencia predefinida de salas con diálogo y restricciones.
- **Eventos guionizados**: salas especiales con botones deshabilitados u overrides.
- **Testing**: reproducir configuraciones concretas.

**Campos relevantes**:
- `DisabledButtons` (flags): `PlayRoute`, `Prediction`, `Continue`, `Stand`.
- `CooldownOverride` (int, opcional).
- `BoardPresetCell[]`: por celda, contenido forzado, `headerDisplayMode` (`ForceVisible`/`ForceUnknown`/`UseGlobalRules`), `overrideGoldReward`.
- `ProbabilityPreset`, `PresetPieces`, `IgnoreMapBlueprint`, `AllowEnchantment`.

---

## 11. Simulación de comportamientos (resumen)

Permite previsualizar el efecto de pisar o revelar una tile sin aplicar cambios reales.

- Ejecuta el grafo de comportamiento con `isSimulation = true`.
- Acumula deltas (`simulatedEnergyDelta`, `simulatedGoldDelta`) en `ExecutionContext`.
- Alimenta UI contextual, previews de ruta, avisos del tipo "¿sobrevivo esta tile?".

Referencia completa: [`BehaviourSimulationSystem.md`](./BehaviourSimulationSystem.md).

---

## 12. Glosario diseño ↔ código

| Término diseño | Código |
|---|---|
| Neutral | `CardPowerLevel.Neutral` |
| Predictiva específica | `CardPowerLevel.specificRevealer` |
| Omnisciente | `CardPowerLevel.Omniscient` |
| Deshabilitada | `CardPowerLevel.Disabled` |
| Niebla | Estado previo a `fogCleared` |
| Forma visible | `fogCleared` |
| Contenido revelado | `contentRevealed` |
| Contenido descubierto | `contentDiscovered` |
| Escaneada | `scanned` |
| Tile vacía en paleta | `PredictionPaletteController.EMPTY_TILE_ID` |
| Cierre de predicciones | Prediction lock |
| Coste de reparación | `CurrentPredictionRepairCost` |
| Renta | Coste de turno al continuar |

---

## 13. Notas

- Documento de **diseño de alto nivel**. No sustituye a [`ProjectStructure.md`](./ProjectStructure.md) (arquitectura técnica) ni a las páginas de Notion (discusión viva de diseño).
- Cualquier cambio de mecánica debe reflejarse **aquí y en Notion** para no divergir.
- El tutorial derivado vive en [`TutorialDesign.md`](./TutorialDesign.md); su plan de implementación, en [`TutorialImplementationPlan.md`](./TutorialImplementationPlan.md).
