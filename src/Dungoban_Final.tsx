import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, DollarSign, User } from 'lucide-react';

const ENEMY_TYPES = {
  FIRE: { icon: '🔥', damage: 3, color: '#ff6b6b' },
  MELEE: { icon: '⚔️', damage: 2, color: '#ffa500' },
  BOSS: { icon: '💀', damage: 8, color: '#8b0000' }
} as const;

const CARD_PATTERNS = {
  I: { 
    name: 'I', 
    pattern: [
      {pos: [0,0]}, 
      {pos: [1,0]},
      {pos: [2,0]},
      {pos: [3,0]}
    ], 
    icon: 'I',
    color: '#00f0f0'
  },
  J: { 
    name: 'J', 
    pattern: [
      {pos: [0,0]},
      {pos: [1,0]}, 
      {pos: [1,1]},
      {pos: [1,2]}
    ], 
    icon: 'J',
    color: '#0000f0'
  },
  L: { 
    name: 'L', 
    pattern: [
      {pos: [0,2]},
      {pos: [1,0]}, 
      {pos: [1,1]},
      {pos: [1,2]}
    ], 
    icon: 'L',
    color: '#f0a000'
  },
  O: { 
    name: 'O', 
    pattern: [
      {pos: [0,0]}, 
      {pos: [0,1]}, 
      {pos: [1,0]},
      {pos: [1,1]}
    ], 
    icon: 'O',
    color: '#f0f000'
  },
  S: { 
    name: 'S', 
    pattern: [
      {pos: [0,1]},
      {pos: [0,2]}, 
      {pos: [1,0]},
      {pos: [1,1]}
    ], 
    icon: 'S',
    color: '#00f000'
  },
  T: { 
    name: 'T', 
    pattern: [
      {pos: [0,1]}, 
      {pos: [1,0]},
      {pos: [1,1]},
      {pos: [1,2]}
    ], 
    icon: 'T',
    color: '#a000f0'
  },
  Z: { 
    name: 'Z', 
    pattern: [
      {pos: [0,0]},
      {pos: [0,1]}, 
      {pos: [1,1]},
      {pos: [1,2]}
    ], 
    icon: 'Z',
    color: '#ff1493'
  }
} as const;

type EnemyType = keyof typeof ENEMY_TYPES;
type CardType = keyof typeof CARD_PATTERNS;
type DetectionType = EnemyType | 'PILL' | null;

type CardPatternPos = {
  pos: [number, number];
};

interface CardPattern {
  pos: CardPatternPos["pos"];
}

interface Cell {
  type: 'empty' | 'door' | 'gold' | 'wall' | 'pill' | 'enemy';
  revealed: boolean;
  scanned: boolean;
  threatLevel: number;
  value?: number;
  collected?: boolean;
  enemyType?: EnemyType;
  healAmount?: number;
  counted?: boolean; // Para la mecánica de la bola de cristal
  defeated?: boolean;
  hasContent?: boolean;
}

interface Card {
  id: number;
  pattern: CardType;
  patternData: CardPattern[];
  color: string;
  detectionType: DetectionType;
  used: boolean;
  usedWithDetection?: DetectionType;
}

interface Position {
  x: number;
  y: number;
}

const VidenteGame = () => {
  const GRID_WIDTH = 8;
  const GRID_HEIGHT = 8;
  const INITIAL_ENERGY = 40;
  const INITIAL_RENT = 30;
  const RENT_FREQUENCY = 4;
  const VICTORY_TARGET = 50;
  const NUM_GOLDS = 1;
  const MIN_GOLD_DISTANCE = 3;

  // Tipos de enemigos
  const ENEMY_TYPES = {
    FIRE: { icon: '🔥', damage: 3, color: '#ff6b6b' },
    MELEE: { icon: '⚔️', damage: 2, color: '#ffa500' },
    BOSS: { icon: '💀', damage: 8, color: '#8b0000' }
  };

  // Cartas de escaneo con patrones de Tetrominos
  const CARD_PATTERNS = {
    I: { 
      name: 'I', 
      pattern: [
        {pos: [0,0]}, 
        {pos: [1,0]},
        {pos: [2,0]},
        {pos: [3,0]}
      ], 
      icon: 'I',
      color: '#00f0f0'
    },
    J: { 
      name: 'J', 
      pattern: [
        {pos: [0,0]},
        {pos: [1,0]}, 
        {pos: [1,1]},
        {pos: [1,2]}
      ], 
      icon: 'J',
      color: '#0000f0'
    },
    L: { 
      name: 'L', 
      pattern: [
        {pos: [0,2]},
        {pos: [1,0]}, 
        {pos: [1,1]},
        {pos: [1,2]}
      ], 
      icon: 'L',
      color: '#f0a000'
    },
    O: { 
      name: 'O', 
      pattern: [
        {pos: [0,0]}, 
        {pos: [0,1]}, 
        {pos: [1,0]},
        {pos: [1,1]}
      ], 
      icon: 'O',
      color: '#f0f000'
    },
    S: { 
      name: 'S', 
      pattern: [
        {pos: [0,1]},
        {pos: [0,2]}, 
        {pos: [1,0]},
        {pos: [1,1]}
      ], 
      icon: 'S',
      color: '#00f000'
    },
    T: { 
      name: 'T', 
      pattern: [
        {pos: [0,1]}, 
        {pos: [1,0]},
        {pos: [1,1]},
        {pos: [1,2]}
      ], 
      icon: 'T',
      color: '#a000f0'
    },
    Z: { 
      name: 'Z', 
      pattern: [
        {pos: [0,0]},
        {pos: [0,1]}, 
        {pos: [1,1]},
        {pos: [1,2]}
      ], 
      icon: 'Z',
      color: '#ff1493'
    }
  };

  const generateRandomCards = (): Card[] => {
    const numCards = Math.floor(Math.random() * 3) + 1;
    const patternTypes = Object.keys(CARD_PATTERNS) as CardType[];
    const cards: Card[] = [];
    const detectableTypes = ['FIRE', 'MELEE', 'BOSS', 'PILL'] as const;
    const shuffledPatterns = [...patternTypes].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numCards; i++) {
      const randomPattern = shuffledPatterns[i % shuffledPatterns.length];
      const pattern = CARD_PATTERNS[randomPattern].pattern.map(cell => ({ 
        pos: [cell.pos[0], cell.pos[1]] as [number, number]
      }));
      const hasAbility = Math.random() < 0.6;
      let detectionType: DetectionType = null;
      
      if (hasAbility) {
        detectionType = detectableTypes[Math.floor(Math.random() * detectableTypes.length)];
      }
      
      cards.push({
        id: i + 1,
        pattern: randomPattern,
        patternData: pattern,
        color: CARD_PATTERNS[randomPattern].color,
        detectionType: detectionType,
        used: false
      });
    }
    
    return cards;
  };

  const generateBoard = (): Cell[][] => {
    const board = Array(GRID_HEIGHT).fill(null).map(() => 
      Array(GRID_WIDTH).fill(null).map(() => ({ 
        type: 'empty' as const, 
        revealed: false,
        scanned: false,
        threatLevel: 0
      } as Cell))
    );
    
    const doorPos = {
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT)
    };
    board[doorPos.y][doorPos.x] = { type: 'door' as const, revealed: true, scanned: false, threatLevel: 0 };
    
  // Gold reward per round: random between 5 and 10 (inclusive)
  const goldValue = Math.floor(Math.random() * 6) + 5;
  // Add extra randomness so the minimum distance between door and gold varies per board
  const effectiveMinGoldDistance = MIN_GOLD_DISTANCE + Math.floor(Math.random() * 3); // adds 0-2
    let goldsPlaced = 0;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (goldsPlaced < NUM_GOLDS && attempts < maxAttempts) {
      const goldPos = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      
      const distanceFromDoor = Math.abs(goldPos.x - doorPos.x) + Math.abs(goldPos.y - doorPos.y);
      
      if (board[goldPos.y][goldPos.x].type === 'empty' && distanceFromDoor >= effectiveMinGoldDistance) {
        board[goldPos.y][goldPos.x] = { 
          type: 'gold' as const, 
          revealed: true, 
          scanned: false, 
          threatLevel: 0,
          value: goldValue,
          collected: false
        };
        goldsPlaced++;
      }
      
      attempts++;
    }
    
    while (goldsPlaced < NUM_GOLDS) {
      const goldPos = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      
      const distanceFromDoor = Math.abs(goldPos.x - doorPos.x) + Math.abs(goldPos.y - doorPos.y);
      
      if (board[goldPos.y][goldPos.x].type === 'empty' && distanceFromDoor >= Math.min(2, effectiveMinGoldDistance)) {
        board[goldPos.y][goldPos.x] = { 
          type: 'gold' as const, 
          revealed: true, 
          scanned: false, 
          threatLevel: 0,
          value: goldValue,
          collected: false
        };
        goldsPlaced++;
      }
    }
    
    // Make walls (unbuildable blocks) more common: random between 8 and 15
    const numWalls = Math.floor(Math.random() * 8) + 8;
    let wallsPlaced = 0;
    
    while (wallsPlaced < numWalls) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      if (board[y][x].type === 'empty') {
        board[y][x] = { type: 'wall' as const, revealed: true, scanned: false, threatLevel: 0 };
        wallsPlaced++;
      }
    }
    
    const numPills = 5;
    let pillsPlaced = 0;
    
    while (pillsPlaced < numPills) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      if (board[y][x].type === 'empty') {
        board[y][x] = { 
          type: 'pill' as const, 
          revealed: false, 
          scanned: false, 
          collected: false,
          healAmount: 3,
          threatLevel: 0
        };
        pillsPlaced++;
      }
    }
    
    const enemyTypes = Object.keys(ENEMY_TYPES) as EnemyType[];
    let enemiesPlaced = 0;
    const maxEnemies = 10;
    
    while (enemiesPlaced < maxEnemies) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      if (board[y][x].type === 'empty') {
        const randomEnemy = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        board[y][x] = { 
          type: 'enemy' as const, 
          enemyType: randomEnemy, 
          revealed: false,
          scanned: false,
          threatLevel: 0,
          defeated: false
        };
        enemiesPlaced++;
      }
    }
    
    return board;
  };

  // Estados del sistema de aventurero y multiplicador
  const [adventurerGold, setAdventurerGold] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [playerGold, setPlayerGold] = useState(0);
  const [rentPrice, setRentPrice] = useState(INITIAL_RENT);
  const [showCashoutMessage, setShowCashoutMessage] = useState(false);
  
  const [board, setBoard] = useState(generateBoard());
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [currentRound, setCurrentRound] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardRotation, setCardRotation] = useState(0);
  const [availableCards, setAvailableCards] = useState(generateRandomCards());
  const [mode, setMode] = useState('explore');
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  
  const findDoorPosition = (board: Cell[][]): Position => {
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x].type === 'door') {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };
  
  const [path, setPath] = useState([findDoorPosition(board)]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [crystalBallCounter, setCrystalBallCounter] = useState(0);
  const [isCrystalBallActive, setIsCrystalBallActive] = useState(false);
  const [is2x2ModeActive, setIs2x2ModeActive] = useState(false);


  // Función para continuar jugando (aumenta multiplicador)
  const handleContinuePlaying = () => {
    // Incrementar multiplicador en 0.1
    setMultiplier(prev => Math.round((prev + 0.1) * 10) / 10);
    
    // Generar nuevo tablero y reiniciar para la siguiente ronda
    const newBoard = generateBoard();
    setBoard(newBoard);
    setPath([findDoorPosition(newBoard)]);
    setMode('explore');
    setAvailableCards(generateRandomCards());
    
    // Incrementar ronda
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    
    // Verificar pago de alquiler cada 4 rondas DESPUÉS de la decisión
    if ((nextRound - 1) % RENT_FREQUENCY === 0 && nextRound > RENT_FREQUENCY) {
      if (playerGold < rentPrice) {
        setGameOver(true);
        setShowRoundEndModal(false);
        return;
      } else {
        setPlayerGold(prev => prev - rentPrice);
        setRentPrice(prev => prev + 10);
      }
    }
    
    // Verificar victoria
    if (playerGold >= VICTORY_TARGET && !victory) {
      setVictory(true);
    }
    
    // Cerrar modal
    setShowRoundEndModal(false);
  };

  // Función para cobrar el oro del aventurero desde el modal
  const handleCashOutFromModal = () => {
    // Cobrar el oro actual
    const totalCashout = Math.floor(adventurerGold * multiplier);
    setPlayerGold(prev => prev + totalCashout);
    
    // Crear nuevo aventurero
    setAdventurerGold(0);
    setMultiplier(1.0);
    setEnergy(INITIAL_ENERGY);
    
    // Generar nuevo tablero
    const newBoard = generateBoard();
    setBoard(newBoard);
    setPath([findDoorPosition(newBoard)]);
    setMode('explore');
    setAvailableCards(generateRandomCards());
    
    // Reiniciar estado de la bola de cristal
    setCrystalBallCounter(0);
    setIsCrystalBallActive(false);
    setIs2x2ModeActive(false);
    
    // Reiniciar estado de la bola de cristal
    setCrystalBallCounter(0);
    setIsCrystalBallActive(false);
    setIs2x2ModeActive(false);
    
    // Reiniciar el sistema de predicciones
    setCrystalBallCounter(0);
    setIsCrystalBallActive(false);
    setIs2x2ModeActive(false);
    
    // Incrementar ronda
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    
    // Verificar pago de alquiler DESPUÉS de cobrar el oro
    if ((nextRound - 1) % RENT_FREQUENCY === 0 && nextRound > RENT_FREQUENCY) {
      if (playerGold + totalCashout < rentPrice) {
        setGameOver(true);
        setShowRoundEndModal(false);
        return;
      } else {
        setPlayerGold(prev => prev - rentPrice);
        setRentPrice(prev => prev + 10);
      }
    }
    
    // Verificar victoria
    if (playerGold >= VICTORY_TARGET && !victory) {
      setVictory(true);
    }
    
    // Mostrar mensaje de cobro
    setShowCashoutMessage(true);
    setTimeout(() => setShowCashoutMessage(false), 3000);
    
    // Cerrar modal
    setShowRoundEndModal(false);
  };

  // Reset game completo
  const resetGame = () => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    setEnergy(INITIAL_ENERGY);
    setAdventurerGold(0);
    setMultiplier(1.0);
    setPlayerGold(0);
    setRentPrice(INITIAL_RENT);
    setCurrentRound(1);
    setMode('explore');
    setPath([findDoorPosition(newBoard)]);
    setIsExecuting(false);
    setExecutionStep(0);
    setGameOver(false);
    setVictory(false);
    setCrystalBallCounter(0);
    setIsCrystalBallActive(false);
    setIs2x2ModeActive(false);
    setHoveredCell(null);
    setSelectedCard(null);
    setCardRotation(0);
    setAvailableCards(generateRandomCards());
    setShowCashoutMessage(false);
    setShowRoundEndModal(false);
    setShowTutorial(true); // Mostrar tutorial al reiniciar
  };

  const rotatePattern = (pattern: CardPattern[], rotation: number): CardPattern[] => {
    if (rotation === 0) return pattern;
    
    const rotate90 = (p: CardPattern[]) => p.map(cell => ({
      pos: [cell.pos[1], -cell.pos[0]] as [number, number]
    }));
    const rotate180 = (p: CardPattern[]) => p.map(cell => ({
      pos: [-cell.pos[0], -cell.pos[1]] as [number, number]
    }));
    const rotate270 = (p: CardPattern[]) => p.map(cell => ({
      pos: [-cell.pos[1], cell.pos[0]] as [number, number]
    }));
    
    switch (rotation) {
      case 90: return rotate90(pattern);
      case 180: return rotate180(pattern);
      case 270: return rotate270(pattern);
      default: return pattern;
    }
  };

  const canPlaceCard = (x: number, y: number, pattern: CardPattern[]): boolean => {
    // Caso especial para el modo 2x2
    if (is2x2ModeActive) {
      // Verificar que el área 2x2 está dentro del tablero
      if (x + 1 >= GRID_WIDTH || y + 1 >= GRID_HEIGHT) {
        return false;
      }
      // Verificar que no hay muros ni puertas en el área 2x2
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const checkX = x + dx;
          const checkY = y + dy;
          const cell = board[checkY][checkX];
          if (cell.type === 'wall' || cell.type === 'door') {
            return false;
          }
        }
      }
      return true;
    }

    // Caso normal para patrones de cartas
    for (const cell of pattern) {
      const newX = x + cell.pos[1];
      const newY = y + cell.pos[0];
      
      if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
        return false;
      }
      
      const boardCell = board[newY][newX];
      if (boardCell.type === 'wall' || boardCell.type === 'door' || boardCell.type === 'gold') {
        return false;
      }
    }
    return true;
  };

  const placeCard = (x: number, y: number): void => {
    // Si estamos en modo 2x2, permitir colocar sin necesidad de una carta
    if (!is2x2ModeActive && (!selectedCard || selectedCard.used)) return;
    
    // Si no estamos en modo 2x2, necesitamos el patrón de la carta
    const pattern = is2x2ModeActive ? [] : rotatePattern(selectedCard!.patternData, cardRotation);
    
    if (!canPlaceCard(x, y, pattern)) {
      return;
    }
    
    const newBoard = [...board.map(row => [...row])];
    const detectionType = is2x2ModeActive ? null : selectedCard!.detectionType;
    
    // Si estamos en modo 2x2, revelar todo en un área 2x2
    if (is2x2ModeActive) {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const revealX = x + dx;
          const revealY = y + dy;
          if (revealX >= 0 && revealX < GRID_WIDTH && revealY >= 0 && revealY < GRID_HEIGHT) {
            const cell = newBoard[revealY][revealX];
            if (cell.type !== 'wall' && cell.type !== 'door') {
              cell.revealed = true;
              cell.counted = true; // Marcar como contada para que no afecte al contador
            }
          }
        }
      }
      setIs2x2ModeActive(false);
      setIsCrystalBallActive(false);
      setCrystalBallCounter(0);
      setBoard(newBoard);
      return;
    }

    let matchesFound = 0;

    pattern.forEach(cell => {
      const newX = x + cell.pos[1];
      const newY = y + cell.pos[0];
      
      if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
        const boardCell = newBoard[newY][newX];
        
        if (detectionType && boardCell.type === 'enemy') {
          if (boardCell.enemyType === detectionType) {
            boardCell.revealed = true;
            if (!boardCell.counted) {
              matchesFound++;
              boardCell.counted = true;
            }
          } else {
            boardCell.scanned = true;
            boardCell.hasContent = true;
          }
        } else if (detectionType === 'PILL' && boardCell.type === 'pill' && !boardCell.collected) {
          boardCell.revealed = true;
          if (!boardCell.counted) {
            matchesFound++;
            boardCell.counted = true;
          }
        } else if (boardCell.type === 'enemy' || boardCell.type === 'pill') {
          boardCell.scanned = true;
          boardCell.hasContent = true;
        } else if (boardCell.type === 'empty' || boardCell.type === 'wall') {
          boardCell.scanned = true;
          boardCell.hasContent = false;
        }
      }
    });

    // Incrementamos el contador por cada coincidencia encontrada
    if (matchesFound > 0) {
      const newCounter = crystalBallCounter + matchesFound;
      setCrystalBallCounter(newCounter);
      
      // Si llegamos a 3 o más, activamos la bola de cristal
      if (newCounter >= 3) {
        setIsCrystalBallActive(true);
      }
    }
    
    setBoard(newBoard);
    
    if (!is2x2ModeActive && selectedCard) {
      setAvailableCards(availableCards.map(c => 
        c.id === selectedCard.id ? { 
          ...c, 
          used: true,
          usedWithDetection: detectionType
        } : c
      ));
    }
    // setAvailableCards(newCards);
    setSelectedCard(null);
    setCardRotation(0);
  };

  const handleClick = (x: number, y: number): void => {
    if (isExecuting || gameOver) return;

    if (mode === 'explore') {
      if (selectedCard || is2x2ModeActive) {
        placeCard(x, y);
      }
    } else if (mode === 'trace') {
      const lastPos = path[path.length - 1];
      
      if (board[y][x].type === 'wall') {
        return;
      }
      
      const isAdjacent = 
        (Math.abs(x - lastPos.x) === 1 && y === lastPos.y) ||
        (Math.abs(y - lastPos.y) === 1 && x === lastPos.x);
      
      if (isAdjacent) {
        const alreadyInPath = path.some(p => p.x === x && p.y === y);
        if (!alreadyInPath) {
          setPath([...path, { x, y }]);
        }
      }
    }
  };

  const executePath = () => {
    if (path.length < 2 || isExecuting) return;
    setIsExecuting(true);
    setExecutionStep(0);
  };

  useEffect(() => {
    if (!isExecuting || executionStep >= path.length) {
      if (isExecuting && executionStep >= path.length) {
        setIsExecuting(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      const currentPos = path[executionStep];
      const cell = board[currentPos.y][currentPos.x];
      
      let energyLost = 1;
      let goldGained = 0;
      let energyHealed = 0;
      
      if (cell.type === 'gold' && !cell.collected && cell.value) {
        goldGained = cell.value;
        const newBoard = [...board.map(row => [...row])];
        newBoard[currentPos.y][currentPos.x].collected = true;
        setBoard(newBoard);
        setAdventurerGold(prev => prev + goldGained);
        
        // Mostrar el modal cuando el aventurero recoge el oro
        setShowRoundEndModal(true);
        setIsExecuting(false);
        return;
      }
      
      if (cell.type === 'pill' && !cell.collected && cell.healAmount) {
        energyHealed = cell.healAmount;
        const newBoard = [...board.map(row => [...row])];
        newBoard[currentPos.y][currentPos.x].collected = true;
        newBoard[currentPos.y][currentPos.x].revealed = true;
        setBoard(newBoard);
      }
      
      if (cell.type === 'enemy' && cell.enemyType) {
        energyLost += ENEMY_TYPES[cell.enemyType].damage;
        
        const newBoard = [...board.map(row => [...row])];
        const currentCell = newBoard[currentPos.y][currentPos.x];
        if (currentCell.type === 'enemy') {
          currentCell.revealed = true;
          currentCell.defeated = true;
          setBoard(newBoard);
        }
      }
      
      if (cell.type === 'empty' && !cell.revealed) {
        const newBoard = [...board.map(row => [...row])];
        newBoard[currentPos.y][currentPos.x].revealed = true;
        setBoard(newBoard);
      }
      
      const newEnergy = Math.min(INITIAL_ENERGY, energy - energyLost + energyHealed);
      setEnergy(newEnergy);
      
      if (newEnergy <= 0) {
        setGameOver(true);
        setIsExecuting(false);
        return;
      }
      
      // La lógica de fin de ronda ahora se maneja cuando el aventurero llega a la puerta
      // y el jugador toma una decisión en el modal
      
      setExecutionStep(executionStep + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [isExecuting, executionStep, energy, adventurerGold, playerGold, currentRound, rentPrice, victory]);

  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);
    return () => document.removeEventListener('contextmenu', preventContext);
  }, []);

  const getColumnContent = (colIndex: number): string[] => {
    const content: string[] = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const cell = board[row][colIndex];
      if (cell.type === 'enemy' && !cell.revealed && cell.enemyType && cell.enemyType in ENEMY_TYPES) {
        content.push(ENEMY_TYPES[cell.enemyType].icon);
      } else if (cell.type === 'pill' && !cell.collected) {
        content.push('💊');
      }
    }
    return content;
  };

  const getAbilityIcon = (detectionType: DetectionType) => {
    switch(detectionType) {
      case 'FIRE': return '🔥';
      case 'MELEE': return '⚔️';
      case 'BOSS': return '💀';
      case 'PILL': return '💊';
      default: return '❓';
    }
  };

  const getRowContent = (rowIndex: number): string[] => {
    const content: string[] = [];
    for (let col = 0; col < GRID_WIDTH; col++) {
      const cell = board[rowIndex][col];
      if (cell.type === 'enemy' && !cell.revealed && cell.enemyType && cell.enemyType in ENEMY_TYPES) {
        content.push(ENEMY_TYPES[cell.enemyType].icon);
      } else if (cell.type === 'pill' && !cell.collected) {
        content.push('💊');
      }
    }
    return content;
  };

  const renderCell = (cell: Cell, x: number, y: number) => {
    const isInPath = path.some(p => p.x === x && p.y === y);
    const isCurrentStep = isExecuting && path[executionStep]?.x === x && path[executionStep]?.y === y;
    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
    
    let content: string | React.ReactElement = '';
    let bgColor = '#2a2a2a';
    let borderColor = '#444';
    
    if (cell.type === 'door') {
      content = '🚪';
      bgColor = '#3a5a3a';
    } 
    else if (cell.type === 'gold') {
      if (cell.collected) {
        content = '';
      } else {
        content = (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-xl">💰</div>
            <div className="text-xs text-yellow-400">${cell.value}</div>
          </div>
        );
        bgColor = '#5a5a2a';
      }
    }
    else if (cell.type === 'wall') {
      content = '🧱';
      bgColor = '#1a1a1a';
      borderColor = '#666';
    }
    else if (cell.revealed) {
      if (cell.type === 'enemy' && cell.enemyType) {
        const enemy = ENEMY_TYPES[cell.enemyType];
        const isDefeated = cell.defeated;
        content = (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`text-xl ${isDefeated ? 'opacity-40' : ''}`}>{enemy.icon}</div>
            <div className={`text-xs ${isDefeated ? 'text-gray-500' : 'text-red-400'}`}>
              {isDefeated ? '✓' : `-${enemy.damage}⚡`}
            </div>
          </div>
        );
        bgColor = isDefeated ? (enemy.color + '1a') : (enemy.color + '33');
      } else if (cell.type === 'pill') {
        if (cell.collected) {
          content = (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-xl opacity-40">💊</div>
              <div className="text-xs text-gray-500">✓</div>
            </div>
          );
          bgColor = '#2a3a2a';
        } else {
          content = (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-xl">💊</div>
              <div className="text-xs text-green-400">+{cell.healAmount}⚡</div>
            </div>
          );
          bgColor = '#2a5a3a';
        }
      } else {
        content = (
          <div className="text-lg opacity-30">👣</div>
        );
        bgColor = '#2a2a2a';
      }
    }
    else if (cell.scanned) {
      if (cell.hasContent === false) {
        content = '';
      } else if (cell.hasContent === true) {
        content = '❓';
        bgColor = '#4a3a2a';
      }
    }
    else {
      content = '💨';
    }
    
    if (isInPath) {
      borderColor = '#4a9eff';
    }
    
    if (isCurrentStep) {
      bgColor = '#ffff00';
    }
    
    if (mode === 'trace' && cell.type === 'wall' && isHovered) {
      borderColor = '#ff0000';
    }
    
    if (mode === 'explore') {
      if (is2x2ModeActive && hoveredCell) {
        // Preview para el modo 2x2
        const isIn2x2Area = 
          x >= hoveredCell.x && x <= hoveredCell.x + 1 &&
          y >= hoveredCell.y && y <= hoveredCell.y + 1;

        if (isIn2x2Area) {
          const canPlace = canPlaceCard(hoveredCell.x, hoveredCell.y, []);
          borderColor = canPlace ? '#ffeb3b' : '#ff0000';
          if (canPlace) {
            bgColor = '#ffeb3b20';
          }
        }
      } else if (selectedCard) {
        // Preview normal para cartas
        const pattern = rotatePattern(selectedCard.patternData, cardRotation);
        const isInPattern = pattern.some(cell => {
          const patternX = x - cell.pos[1];
          const patternY = y - cell.pos[0];
          return hoveredCell && hoveredCell.x === patternX && hoveredCell.y === patternY;
        });
        
        if (isInPattern && hoveredCell) {
          const canPlace = canPlaceCard(hoveredCell.x, hoveredCell.y, pattern);
          
          if (!canPlace) {
            borderColor = '#ff0000';
          } else {
            borderColor = selectedCard.color;
          }
        }
      }
    }
    
    return (
      <div
        className="relative w-full h-full flex items-center justify-center text-sm font-bold cursor-pointer transition-all"
        style={{ 
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}`,
        }}
        onMouseEnter={() => setHoveredCell({ x, y })}
        onMouseLeave={() => setHoveredCell(null)}
        onClick={() => handleClick(x, y)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (selectedCard && mode === 'explore' && !isExecuting && !gameOver) {
            setCardRotation((cardRotation + 90) % 360);
          }
        }}
      >
        {content}
      </div>
    );
  };

  const rondasHastaAlquiler = RENT_FREQUENCY - ((currentRound - 1) % RENT_FREQUENCY);
  const esUltimaRondaAntesAlquiler = rondasHastaAlquiler === 1;

  return (
  <div className="w-full min-h-screen p-4 flex flex-col items-center bg-black">
      {/* Pantalla de Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-purple-800 to-indigo-900 rounded-2xl p-8 max-w-2xl mx-4 border-2 border-yellow-400 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                🔮 Dungoban 🔮
              </div>

            </div>
            
            <div className="space-y-6 text-white">
              {/* Historia */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">📜 Tu Historia</h3>
                <p className="text-sm leading-relaxed">
                  Eres <span className="text-purple-300 font-semibold">Dungoban</span>, un vidente que tiene una pequeña carpa a la que los aventureros acuden para saber cómo hacerse ricos. A pesar de ser famoso, Dungoban debe pagar el alquiler de su carpa, que va aumentando cada vez más.
                </p>
              </div>
              
              {/* Objetivo */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">🎯 Objetivo</h3>
                <p className="text-sm leading-relaxed">
                  Debes decirle al aventurero qué camino recorrer para llegar al oro.
                </p>
                <p className="text-sm leading-relaxed mt-2 text-purple-300">
                  No todas las rutas son igual de seguras. Recuerda, si no logra salir, perderás tu parte del botín total.
                </p>
              </div>
              
      
              {/* Mecánica de Cartas */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">🎴 Tus Poderes</h3>
                <p className="text-sm leading-relaxed">
                  Tienes cartas en forma de piezas que puedes colocar en la mazmorra. Usa <span className="text-cyan-300 font-semibold">Click Derecho</span> para girarlas. Tu bola de cristal reacciona mágicamente a ciertas cartas y hace que puedan predecir la posición de un tipo de contenido de la mazmorra cuando las coloques.
                </p>
                <p className="text-sm leading-relaxed mt-2 text-purple-300">
                  Cada 3 predicciones acertadas, obtendrás omnisciencia y podrás revelar un área de la mazmorra sin colocar ninguna pieza.
                </p>
              </div>
              
              {/* Consejos */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">⚠️ Alquiler y Energía</h3>
                <p className="text-sm leading-relaxed">
                  Ten cuidado con la <span className="text-yellow-300 font-semibold">energía</span> de los aventureros y recuerda cobrarles tu parte del botín antes de que llegue el día de pagar el alquiler.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowTutorial(false)}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-lg font-bold text-white text-lg transition-all transform hover:scale-105 shadow-lg"
              >
               ¡JUGAR!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de Cash Out */}
      {showCashoutMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 rounded-lg p-4 text-white font-bold text-center z-50 animate-bounce">
          El aventurero se retira. Llega uno nuevo.
        </div>
      )}

      {/* Header con estadísticas principales */}
      <div className="bg-black rounded-lg p-4 mb-4 w-full max-w-6xl">
  {/* En pantallas pequeñas: 1 columna; en >=sm: columnas con anchos iguales a los paneles inferiores */}
  <div className="grid grid-cols-1 lg:grid-cols-[16rem_16rem_16rem] gap-2 lg:gap-4 text-white justify-center">
          {/* Aventurero Actual (compacto) */}
          <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 rounded-md p-2 border-2 border-orange-500/50">
            <div className="flex items-center gap-2 mb-1">
              <User className="text-orange-400" size={18} />
              <span className="font-bold text-xs">Aventurero Actual</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Oro:</span>
                <span className="font-bold text-yellow-400 text-sm">${adventurerGold}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Energía:</span>
                <span className="font-bold text-yellow-400 text-sm">{energy}/{INITIAL_ENERGY}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Multiplicador:</span>
                <span className="font-bold text-green-400 text-sm">x{multiplier.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Jugador (compacto) */}
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 rounded-md p-2 border-2 border-blue-500/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-blue-400" size={18} />
              <span className="font-bold text-xs">Tu Oro Total</span>
            </div>
            <div className="flex justify-center items-center">
              <span className="font-bold text-yellow-400 text-2xl">${playerGold}</span>
            </div>
          </div>

          {/* Alquiler (compacto) */}
          <div className={`rounded-md p-2 border-2 ${
            esUltimaRondaAntesAlquiler 
              ? 'bg-gradient-to-br from-red-600/40 to-red-800/40 border-red-500/70' 
              : 'bg-gradient-to-br from-purple-600/30 to-purple-800/30 border-purple-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏠</span>
              <span className="font-bold text-xs">Alquiler</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Precio:</span>
                <span className="font-bold text-yellow-400 text-sm">${rentPrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px]">En:</span>
                <span className={`font-bold ${esUltimaRondaAntesAlquiler ? 'text-red-400' : 'text-gray-400'} text-sm`}>
                  {rondasHastaAlquiler} {rondasHastaAlquiler === 1 ? 'ronda' : 'rondas'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Ronda:</span>
                <span className="font-bold text-gray-300 text-sm">{currentRound}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl justify-center items-start">
        {/* Panel de cartas */}
        <div className="bg-black rounded-lg p-4 flex-shrink-0 w-full lg:w-64">
          <div className="text-white font-bold mb-3">📇 Cartas de Escaneo</div>
          <div className="flex flex-row lg:flex-col gap-2 flex-wrap justify-center lg:justify-start">
            {availableCards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setCardRotation(0);
                  setIs2x2ModeActive(false); // Desactivar modo 2x2 al seleccionar una carta
                }}
                disabled={card.used || mode !== 'explore'}
                style={{
                  backgroundColor: card.used 
                    ? '#4b5563' 
                    : selectedCard?.id === card.id
                      ? card.color
                      : `${card.color}cc`,
                  opacity: card.used ? 0.5 : 1
                }}
                className={`px-4 py-3 rounded-lg font-bold transition-all ${
                  selectedCard?.id === card.id ? 'ring-2 ring-yellow-400' : ''
                } ${card.used ? 'cursor-not-allowed' : 'hover:opacity-90'} text-white text-sm`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black">{CARD_PATTERNS[card.pattern].icon}</span>
                </div>
                
                {card.used && (
                  <div className="text-xs mt-1">
                    <div>✓ Usada</div>
                    {card.usedWithDetection && (
                      <div className="flex items-center gap-1 mt-0.5 text-white/80">
                        <span>Detectaba:</span>
                        <span className="text-lg" style={{ lineHeight: '1' }}>{getAbilityIcon(card.usedWithDetection)}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Board */}
  <div className="bg-black rounded-lg p-4 overflow-x-auto">
          <div className="flex">
            <div className="w-8 sm:w-12"></div>
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 45px)`,
              }}
            >
              {Array.from({ length: GRID_WIDTH }, (_, i) => {
                const colContent = getColumnContent(i);
                return (
                  <div 
                    key={`col-header-${i}`} 
                    className="text-center text-white font-bold pb-1 flex flex-col items-center justify-end h-16 overflow-hidden"
                    style={{ fontSize: '11px', lineHeight: '14px' }}
                  >
                    {colContent.length > 0 ? (
                      colContent.map((emoji, idx) => (
                        <div key={idx}>{emoji}</div>
                      ))
                    ) : (
                      <div>—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex">
            <div 
              className="grid gap-1 pr-1"
              style={{
                gridTemplateRows: `repeat(${GRID_HEIGHT}, 45px)`,
              }}
            >
              {Array.from({ length: GRID_HEIGHT }, (_, i) => {
                const rowContent = getRowContent(i);
                return (
                  <div 
                    key={`row-header-${i}`} 
                    className="flex items-center justify-center text-white font-bold text-xs w-12 flex-wrap overflow-hidden"
                    style={{ fontSize: '10px' }}
                  >
                    {rowContent.length > 0 ? rowContent.join('') : '—'}
                  </div>
                );
              })}
            </div>
            
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 45px)`,
                gridTemplateRows: `repeat(${GRID_HEIGHT}, 45px)`,
              }}
            >
              {board.map((row, y) => 
                row.map((cell, x) => (
                  <div key={`${x}-${y}`}>
                    {renderCell(cell, x, y)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

  {/* Bola de Cristal */}
  <div className="bg-black rounded-lg p-4 flex-shrink-0 w-full sm:w-auto flex flex-col items-center">
          <div className="text-white font-bold mb-3 text-center">
            🔮 Visión
            <div className="text-sm font-normal mt-1">
              {crystalBallCounter}/3
            </div>
          </div>
          
          <div 
            className="relative flex items-center justify-center rounded-full"
            onClick={() => {
              if (isCrystalBallActive) {
                // Si ya está en modo 2x2, lo desactivamos
                if (is2x2ModeActive) {
                  setIs2x2ModeActive(false);
                } else {
                  // Si no está en modo 2x2, lo activamos y desactivamos la carta seleccionada
                  setIs2x2ModeActive(true);
                  setSelectedCard(null);
                }
              }
            }}
            style={{
              width: 'clamp(120px, 20vw, 160px)',
              height: 'clamp(120px, 20vw, 160px)',
              background: isCrystalBallActive
                ? 'radial-gradient(circle at 40% 40%, rgba(250, 204, 21, 0.4), rgba(234, 179, 8, 0.6), rgba(161, 98, 7, 0.9))'
                : 'radial-gradient(circle at 40% 40%, rgba(147, 51, 234, 0.4), rgba(79, 70, 229, 0.6), rgba(30, 27, 75, 0.9))',
              border: isCrystalBallActive
                ? '4px solid rgba(234, 179, 8, 0.8)'
                : '4px solid rgba(131, 49, 207, 0.6)',
              boxShadow: isCrystalBallActive
                ? '0 0 30px rgba(234, 179, 8, 0.5), inset 0 0 30px rgba(234, 179, 8, 0.3)'
                : '0 0 30px rgba(147, 51, 234, 0.5), inset 0 0 30px rgba(147, 51, 234, 0.3)',
              cursor: isCrystalBallActive ? 'pointer' : 'default',
              transition: 'all 0.3s ease'
            }}
          >
            {selectedCard && selectedCard.detectionType ? (
              <div className="flex flex-col items-center justify-center">
                <div className="text-6xl mb-2" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' }}>
                  {getAbilityIcon(selectedCard.detectionType)}
                </div>
                <div className="text-xs text-purple-200 font-bold text-center px-2">
                  {selectedCard.detectionType === 'FIRE' && 'Fuego'}
                  {selectedCard.detectionType === 'MELEE' && 'Melee'}
                  {selectedCard.detectionType === 'BOSS' && 'Boss'}
                  {selectedCard.detectionType === 'PILL' && 'Píldora'}
                </div>
              </div>
            ) : isCrystalBallActive ? (
              <div className="text-center">
                <div className="text-5xl mb-2" style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))' }}>👁️</div>
              </div>
            ) : selectedCard && mode === 'explore' ? (
              <div className="text-center">
                <div className="text-4xl mb-2 opacity-50">❓</div>
                <div className="text-xs text-gray-400 px-4">Sin habilidad</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2 opacity-30">💫</div>
                <div className="text-xs text-gray-500 px-4">Selecciona una carta</div>
              </div>
            )}
            
            <div 
              className="absolute rounded-full opacity-50"
              style={{
                width: '60px',
                height: '60px',
                top: '20px',
                left: '30px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent)',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => {
            setMode(mode === 'explore' ? 'trace' : 'explore');
            setSelectedCard(null);
            setCardRotation(0);
          }}
          disabled={isExecuting || gameOver}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            mode === 'trace' 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {mode === 'explore' ? '🔍 MODO: EXPLORAR' : '✏️ MODO: TRAZAR RUTA'}
        </button>
        
        <button
          onClick={executePath}
          disabled={path.length < 2 || isExecuting || gameOver}
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Play size={20} />
          ▶️ EJECUTAR RUTA
        </button>

        {/* Botón de cobrar oro deshabilitado - ahora solo se puede cobrar desde el modal al llegar a la puerta
        <button
          onClick={cashOut}
          disabled={adventurerGold === 0 || isExecuting || gameOver}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          💸 COBRAR ORO
          {adventurerGold > 0 && (
            <span className="text-sm">
              (${Math.floor(adventurerGold * multiplier)})
            </span>
          )}
        </button>
        */}
        
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all flex items-center gap-2"
        >
          <RotateCcw size={20} />
          REINICIAR
        </button>


      </div>

      {/* Game Over / Victory */}
      {gameOver && (
        <div className="mt-4 bg-red-600 rounded-lg p-6 text-white text-center">
          <div className="text-3xl font-bold mb-2">
            {energy <= 0 ? '💀 ¡SIN ENERGÍA!' : '🏠 ¡NO PUEDES PAGAR EL ALQUILER!'}
          </div>
          <div className="text-lg">
            {energy <= 0 
              ? 'Te quedaste sin energía para continuar.' 
              : `Necesitabas ${rentPrice} para el alquiler pero solo tienes ${playerGold}.`
            }
          </div>
          <div className="text-sm mt-2">Ronda alcanzada: {currentRound}</div>
          <div className="text-sm">Oro total acumulado: ${playerGold}</div>
        </div>
      )}

      {victory && !gameOver && (
        <div className="mt-4 bg-green-600 rounded-lg p-6 text-white text-center">
          <div className="text-3xl font-bold mb-2">🎉 ¡OBJETIVO ALCANZADO!</div>
          <div className="text-lg">¡Conseguiste ${playerGold} de oro!</div>
          <div className="text-sm mt-2">Puedes continuar jugando en modo supervivencia</div>
        </div>
      )}

      {/* Modal de fin de ronda */}
      {showRoundEndModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-lg p-8 max-w-md mx-4 border-2 border-yellow-400 shadow-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-4">
                💰 ¡Oro Recogido!
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="text-white mb-3">
                  <div className="text-lg font-semibold mb-2">Oro del aventurero:</div>
                  <div className="text-2xl text-yellow-400">💰 ${adventurerGold}</div>
                </div>
                
                <div className="text-white">
                  <div className="text-lg font-semibold mb-2">Multiplicador actual:</div>
                  <div className="text-2xl text-green-400">x{multiplier.toFixed(1)}</div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-yellow-300 text-xl font-bold">
                    Total si cobras: ${Math.floor(adventurerGold * multiplier)}
                  </div>
                </div>
              </div>
              
              <div className="text-white mb-6">
                <p className="mb-2 font-semibold">¿Qué quieres hacer?</p>
                <p className="text-sm text-gray-300">
                  Si continúas, el multiplicador aumentará a x{(multiplier + 0.1).toFixed(1)}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Si cobras, recibirás el oro y vendrá un nuevo aventurero
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleContinuePlaying}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-all transform hover:scale-105"
                >
                  <div className="text-xl mb-1">🎮</div>
                  <div>Continuar Jugando</div>
                  <div className="text-xs mt-1">
                    (Multiplicador → x{(multiplier + 0.1).toFixed(1)})
                  </div>
                </button>
                
                <button
                  onClick={handleCashOutFromModal}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white transition-all transform hover:scale-105"
                >
                  <div className="text-xl mb-1">💸</div>
                  <div>Cobrar Oro</div>
                  <div className="text-xs mt-1">
                    (+${Math.floor(adventurerGold * multiplier)} a tu oro)
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VidenteGame;