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
type CardPowerLevel = 'Disabled' | 'Neutral' | 'specificRevealer' | 'Omniscient';
type ActiveCardPowerLevel = Exclude<CardPowerLevel, 'Disabled'>;

type CardPatternPos = {
  pos: [number, number];
};

interface CardPattern {
  pos: CardPatternPos["pos"];
}

interface Cell {
  type: 'empty' | 'door' | 'exit' | 'gold' | 'wall' | 'pill' | 'enemy';
  revealed: boolean;
  scanned: boolean;
  threatLevel: number;
  value?: number;
  collected?: boolean;
  enemyType?: EnemyType;
  healAmount?: number;
  counted?: boolean;
  defeated?: boolean;
  hasContent?: boolean;
  prediction?: string;       // id del tipo predicho
  predictionFailed?: boolean; // ya no admite más predicciones
}

interface Card {
  id: number;
  pattern: CardType;
  patternData: CardPattern[];
  color: string;
  powerLevel: ActiveCardPowerLevel;
  detectionType: DetectionType;
  cooldownRemaining: number;
}

interface Position {
  x: number;
  y: number;
}

const PREDICTION_TYPES = [
  { id: 'enemy-FIRE',  icon: '🔥', label: 'Fuego' },
  { id: 'enemy-MELEE', icon: '⚔️', label: 'Melee' },
  { id: 'enemy-BOSS',  icon: '💀', label: 'Boss' },
  { id: 'pill',        icon: '💊', label: 'Píldora' },
  { id: 'gold',        icon: '💰', label: 'Cofre' },
  { id: 'empty',       icon: '✕',  label: 'Vacío' },
] as const;

const checkPrediction = (cell: Cell, prediction: string): boolean => {
  if (prediction === 'empty') return cell.type === 'empty';
  if (prediction === 'pill')  return cell.type === 'pill';
  if (prediction === 'gold')  return cell.type === 'gold';
  if (prediction.startsWith('enemy-')) {
    const eType = prediction.split('-')[1] as EnemyType;
    return cell.type === 'enemy' && cell.enemyType === eType;
  }
  return false;
};

const CARD_COOLDOWNS: Record<ActiveCardPowerLevel, number> = {
  Neutral: 2,
  specificRevealer: 3,
  Omniscient: 5
};

const UPGRADE_COST: Partial<Record<ActiveCardPowerLevel, number>> = {
  Neutral: 3,
  specificRevealer: 5,
};

const HEADER_HIDDEN_PROBABILITY_BY_ICON: Partial<Record<string, number>> = {};

const POWER_LEVEL_COLORS: Record<ActiveCardPowerLevel, string> = {
  Neutral: '#a0522d',
  specificRevealer: '#a8a9ad',
  Omniscient: '#d4af37'
};

const FIXED_HAND: Array<{
  pattern: CardType;
  powerLevel: ActiveCardPowerLevel;
  detectionType: DetectionType;
}> = [
  { pattern: 'I', powerLevel: 'Neutral', detectionType: null },
  { pattern: 'T', powerLevel: 'Neutral', detectionType: null },
  { pattern: 'L', powerLevel: 'Neutral', detectionType: null },
  { pattern: 'O', powerLevel: 'Neutral', detectionType: null }
];

const createFixedCards = (): Card[] => {
  return FIXED_HAND.map((cardConfig, index) => ({
    id: index + 1,
    pattern: cardConfig.pattern,
    patternData: CARD_PATTERNS[cardConfig.pattern].pattern.map(cell => ({
      pos: [cell.pos[0], cell.pos[1]] as [number, number]
    })),
    color: POWER_LEVEL_COLORS[cardConfig.powerLevel],
    powerLevel: cardConfig.powerLevel,
    detectionType: cardConfig.detectionType,
    cooldownRemaining: 0
  }));
};

const tickCardCooldowns = (cards: Card[]): Card[] => {
  return cards.map(card => (
    card.cooldownRemaining > 0
      ? { ...card, cooldownRemaining: card.cooldownRemaining - 1 }
      : card
  ));
};

const getCardPowerLabel = (powerLevel: CardPowerLevel): string => {
  switch (powerLevel) {
    case 'Disabled':
      return 'En cooldown';
    case 'Neutral':
      return 'Neutral';
    case 'specificRevealer':
      return 'Específica';
    case 'Omniscient':
      return 'Omnisciente';
    default:
      return powerLevel;
  }
};

const VidenteGame = () => {
  const GRID_WIDTH = 6;
  const GRID_HEIGHT = 9;
  const INITIAL_ENERGY = 40;
  const MIN_GOLD_DISTANCE = 3;

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

    // Puerta de salida, lejos de la entrada
    let exitPlaced = false;
    let exitAttempts = 0;
    while (!exitPlaced && exitAttempts < 200) {
      const exitPos = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      const distFromDoor = Math.abs(exitPos.x - doorPos.x) + Math.abs(exitPos.y - doorPos.y);
      if (board[exitPos.y][exitPos.x].type === 'empty' && distFromDoor >= MIN_GOLD_DISTANCE + 2) {
        board[exitPos.y][exitPos.x] = { type: 'exit' as const, revealed: true, scanned: false, threatLevel: 0 };
        exitPlaced = true;
      }
      exitAttempts++;
    }
    if (!exitPlaced) {
      for (let ey = 0; ey < GRID_HEIGHT && !exitPlaced; ey++) {
        for (let ex = 0; ex < GRID_WIDTH && !exitPlaced; ex++) {
          if (board[ey][ex].type === 'empty') {
            board[ey][ex] = { type: 'exit' as const, revealed: true, scanned: false, threatLevel: 0 };
            exitPlaced = true;
          }
        }
      }
    }

  // Gold reward per round: random between 5 and 10 (inclusive)
  const goldValue = Math.floor(Math.random() * 6) + 5;
  const numGolds = Math.floor(Math.random() * 4) + 1; // 1 a 4 cofres
  // Add extra randomness so the minimum distance between door and gold varies per board
  const effectiveMinGoldDistance = MIN_GOLD_DISTANCE + Math.floor(Math.random() * 3); // adds 0-2
    let goldsPlaced = 0;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (goldsPlaced < numGolds && attempts < maxAttempts) {
      const goldPos = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      
      const distanceFromDoor = Math.abs(goldPos.x - doorPos.x) + Math.abs(goldPos.y - doorPos.y);
      
      if (board[goldPos.y][goldPos.x].type === 'empty' && distanceFromDoor >= effectiveMinGoldDistance) {
        board[goldPos.y][goldPos.x] = { 
          type: 'gold' as const, 
          revealed: false, 
          scanned: false, 
          threatLevel: 0,
          value: goldValue,
          collected: false
        };
        goldsPlaced++;
      }
      
      attempts++;
    }
    
    while (goldsPlaced < numGolds) {
      const goldPos = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      
      const distanceFromDoor = Math.abs(goldPos.x - doorPos.x) + Math.abs(goldPos.y - doorPos.y);
      
      if (board[goldPos.y][goldPos.x].type === 'empty' && distanceFromDoor >= Math.min(2, effectiveMinGoldDistance)) {
        board[goldPos.y][goldPos.x] = { 
          type: 'gold' as const, 
          revealed: false, 
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

  // Estados del sistema de ladrón y multiplicador
  const [adventurerGold, setAdventurerGold] = useState(0);
  const [playerGold, setPlayerGold] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  
  const [board, setBoard] = useState(generateBoard());
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [currentRound, setCurrentRound] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardRotation, setCardRotation] = useState(0);
  const [availableCards, setAvailableCards] = useState<Card[]>(() => createFixedCards());
  const [mode, setMode] = useState('explore');
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
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [crystalBallCounter, setCrystalBallCounter] = useState(0);


  const checkAllPredictions = () => {
    const newBoard = board.map(row => row.map(c => ({ ...c })));
    let hits = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = newBoard[y][x];
        if (cell.prediction && !cell.revealed) {
          const predictionId = cell.prediction;
          const correct = checkPrediction(cell, predictionId);
          cell.prediction = undefined;
          if (correct) {
            cell.revealed = true;
            if (predictionId !== 'empty') hits++;
          } else {
            cell.predictionFailed = true;
          }
        }
      }
    }
    if (hits > 0) setCrystalBallCounter(prev => prev + hits);
    setBoard(newBoard);
  };

  const placePrediction = (x: number, y: number) => {
    if (!selectedPrediction) return;
    const cell = board[y][x];
    if (['wall', 'door', 'exit'].includes(cell.type)) return;
    if (cell.revealed) return;
    if (cell.predictionFailed) return;
    const newBoard = board.map(row => row.map(c => ({ ...c })));
    const target = newBoard[y][x];
    // Toggle: clic sobre la misma predicción la borra
    target.prediction = target.prediction === selectedPrediction ? undefined : selectedPrediction;
    setBoard(newBoard);
  };

  const upgradeCard = (cardId: number) => {
    const card = availableCards.find(c => c.id === cardId);
    if (!card) return;
    const cost = UPGRADE_COST[card.powerLevel];
    if (cost === undefined || crystalBallCounter < cost) return;
    const nextLevel: ActiveCardPowerLevel =
      card.powerLevel === 'Neutral' ? 'specificRevealer' : 'Omniscient';
    const nextDetection: DetectionType =
      nextLevel === 'specificRevealer' ? 'FIRE' : null;
    setCrystalBallCounter(prev => prev - cost);
    setAvailableCards(prev => prev.map(c =>
      c.id === cardId
        ? { ...c, powerLevel: nextLevel, detectionType: nextDetection, color: POWER_LEVEL_COLORS[nextLevel] }
        : c
    ));
  };

  const reactivateCard = (cardId: number) => {
    const card = availableCards.find(c => c.id === cardId);
    if (!card || card.cooldownRemaining === 0) return;
    const cost = card.cooldownRemaining;
    if (crystalBallCounter < cost) return;
    setCrystalBallCounter(prev => prev - cost);
    setAvailableCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, cooldownRemaining: 0 } : c
    ));
  };

  const advanceToNextBoard = () => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    setPath([findDoorPosition(newBoard)]);
    setMode('explore');
    setAvailableCards(prev => tickCardCooldowns(prev));
    setSelectedCard(null);
    setCardRotation(0);
    setHoveredCell(null);
    setSelectedPrediction(null);
    setCurrentRound(prev => prev + 1);
  };

  // Reset game completo
  const resetGame = () => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    setEnergy(INITIAL_ENERGY);
    setAdventurerGold(0);
    setPlayerGold(0);
    setMultiplier(1.0);
    setCurrentRound(1);
    setMode('explore');
    setPath([findDoorPosition(newBoard)]);
    setIsExecuting(false);
    setExecutionStep(0);
    setGameOver(false);
    setCrystalBallCounter(0);
    setHoveredCell(null);
    setSelectedCard(null);
    setSelectedPrediction(null);
    setCardRotation(0);
    setAvailableCards(createFixedCards());
    setShowTutorial(true);
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
    // Caso normal para patrones de cartas
    for (const cell of pattern) {
      const newX = x + cell.pos[1];
      const newY = y + cell.pos[0];

      if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
        return false;
      }

      const boardCell = board[newY][newX];
      if (boardCell.type === 'wall' || boardCell.type === 'door' || boardCell.type === 'exit') {
        return false;
      }
    }
    return true;
  };

  const placeCard = (x: number, y: number): void => {
    if (!selectedCard || selectedCard.cooldownRemaining > 0) return;

    const pattern = rotatePattern(selectedCard.patternData, cardRotation);
    if (!canPlaceCard(x, y, pattern)) return;

    const newBoard = [...board.map(row => [...row])];
    const detectionType = selectedCard.detectionType;
    const powerLevel = selectedCard.powerLevel;

    let matchesFound = 0;

    pattern.forEach(cell => {
      const newX = x + cell.pos[1];
      const newY = y + cell.pos[0];
      
      if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
        const boardCell = newBoard[newY][newX];
        
        if (powerLevel === 'Omniscient') {
          boardCell.revealed = true;
          boardCell.counted = true;
        } else if (powerLevel === 'specificRevealer' && detectionType && boardCell.type === 'enemy') {
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
        } else if (powerLevel === 'specificRevealer' && detectionType === 'PILL' && boardCell.type === 'pill' && !boardCell.collected) {
          boardCell.revealed = true;
          if (!boardCell.counted) {
            matchesFound++;
            boardCell.counted = true;
          }
        } else if (boardCell.type === 'enemy' || boardCell.type === 'pill' || (boardCell.type === 'gold' && !boardCell.collected)) {
          boardCell.scanned = true;
          boardCell.hasContent = true;
        } else if (boardCell.type === 'empty' || boardCell.type === 'wall') {
          boardCell.scanned = true;
          boardCell.hasContent = false;
        }
      }
    });

    if (matchesFound > 0) setCrystalBallCounter(prev => prev + matchesFound);

    setBoard(newBoard);

    if (selectedCard) {
      setAvailableCards(prev => prev.map(card => (
        card.id === selectedCard.id
          ? {
              ...card,
              cooldownRemaining: CARD_COOLDOWNS[selectedCard.powerLevel]
            }
          : card
      )));
    }
    setSelectedCard(null);
    setCardRotation(0);
  };

  const handleClick = (x: number, y: number): void => {
    if (isExecuting || gameOver) return;

    if (mode === 'explore') {
      if (selectedCard) {
        placeCard(x, y);
      } else if (selectedPrediction) {
        placePrediction(x, y);
      }
    } else if (mode === 'trace') {
      const lastPos = path[path.length - 1];

      if (board[lastPos.y][lastPos.x].type === 'exit') {
        return;
      }

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
      
      if (cell.type === 'exit') {
        setIsExecuting(false);
        advanceToNextBoard();
        return;
      }

      if (cell.type === 'gold' && !cell.collected && cell.value) {
        goldGained = cell.value;
        const newBoard = [...board.map(row => [...row])];
        newBoard[currentPos.y][currentPos.x].collected = true;
        newBoard[currentPos.y][currentPos.x].revealed = true;
        setBoard(newBoard);
        setAdventurerGold(prev => prev + goldGained);
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
        setPlayerGold(prev => prev + adventurerGold);
        setGameOver(true);
        setIsExecuting(false);
        return;
      }
      
      // La lógica de fin de ronda ahora se maneja cuando el ladrón llega a la puerta
      // y el jugador toma una decisión en el modal
      
      setExecutionStep(executionStep + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [isExecuting, executionStep, energy, adventurerGold, playerGold, currentRound]);

  // Efecto para el comando secreto y prevención de menú contextual
  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    
    // Comando secreto: Ctrl + Shift + R
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        // Revelar todo el tablero
        const newBoard = board.map(row => 
          row.map(cell => ({
            ...cell,
            revealed: true
          }))
        );
        setBoard(newBoard);
      }
    };

    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [board]);

  const shouldShowHeaderIcon = (lineId: string, icon: string, count: number): boolean => {
    const hiddenProbability = HEADER_HIDDEN_PROBABILITY_BY_ICON[icon] ?? 0;

    if (hiddenProbability <= 0) {
      return true;
    }

    const seed = `${lineId}-${icon}-${count}`;
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
    }

    return (hash / 1000) >= hiddenProbability;
  };

  const getLineContent = (cells: Cell[], lineId: string): string => {
    const counts: { [key: string]: number } = {};
    
    // Contar ocurrencias
    cells.forEach(cell => {
      if (cell.type === 'enemy' && cell.enemyType && cell.enemyType in ENEMY_TYPES) {
        const icon = ENEMY_TYPES[cell.enemyType].icon;
        counts[icon] = (counts[icon] || 0) + 1;
      } else if (cell.type === 'pill' && !cell.collected) {
        counts['💊'] = (counts['💊'] || 0) + 1;
      } else if (cell.type === 'gold' && !cell.collected) {
        counts['💰'] = (counts['💰'] || 0) + 1;
      }
    });
    
    // Formatear la salida
    return Object.entries(counts)
      .filter(([icon, count]) => shouldShowHeaderIcon(lineId, icon, count))
      .map(([icon, count]) => `x${count} ${icon}`)
      .join(' ');
  };

  const getColumnContent = (colIndex: number): string => {
    const cells = Array.from({ length: GRID_HEIGHT }, (_, row) => board[row][colIndex]);
    return getLineContent(cells, `col-${colIndex}`);
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

  const getRowContent = (rowIndex: number): string => {
    return getLineContent(board[rowIndex], `row-${rowIndex}`);
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
    else if (cell.type === 'exit') {
      content = (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-xl">🏁</div>
          <div className="text-xs text-yellow-300">salida</div>
        </div>
      );
      bgColor = '#5a3a1a';
    }
    else if (cell.type === 'wall') {
      content = '🧱';
      bgColor = '#1a1a1a';
      borderColor = '#666';
    }
    else if (cell.revealed) {
      if (cell.type === 'gold') {
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
      } else if (cell.type === 'enemy' && cell.enemyType) {
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
      if (selectedCard) {
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
    
    const predType = cell.prediction
      ? PREDICTION_TYPES.find(p => p.id === cell.prediction)
      : null;

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
        {predType && !cell.revealed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-lg opacity-70">{predType.icon}</div>
            <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-blue-400" />
          </div>
        )}
        {cell.predictionFailed && !cell.revealed && (
          <div className="absolute top-0 right-0 text-[10px] leading-none bg-red-600/80 text-white rounded-bl px-0.5">✕</div>
        )}
      </div>
    );
  };

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
                  Eres <span className="text-purple-300 font-semibold">Dungoban</span>, un vidente al que los ladrones acuden para saber cómo hacerse ricos. Tu fama crece mazmorra a mazmorra: cuanto más lejos llegue el ladrón, más oro acumulas.
                </p>
              </div>
              
              {/* Objetivo */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">🎯 Objetivo</h3>
                <p className="text-sm leading-relaxed">
                  Guía al ladrón de la entrada a la salida recogiendo todo el oro posible por el camino. Las mazmorras no terminan: cada sala superada abre la siguiente.
                </p>
                <p className="text-sm leading-relaxed mt-2 text-purple-300">
                  No todas las rutas son igual de seguras. Si el ladrón muere, pierde el oro que llevaba encima.
                </p>
              </div>
              
      
              {/* Mecánica de Cartas */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">🎴 Tus Poderes</h3>
                <p className="text-sm leading-relaxed">
                  Siempre tienes <span className="text-cyan-300 font-semibold">4 cartas fijas</span> en forma de piezas. Usa <span className="text-cyan-300 font-semibold">Click Derecho</span> para girarlas. Al usarlas entran en cooldown, y puedes mejorarlas gastando <span className="text-purple-300 font-semibold">éter</span>.
                </p>
                <p className="text-sm leading-relaxed mt-2 text-purple-300">
                  Las neutrales detectan presencia, las específicas revelan su objetivo y las omniscientes destapan todo su patrón. Cada predicción acertada suma +1 éter.
                </p>
              </div>
              
              {/* Consejos */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">⚠️ Energía</h3>
                <p className="text-sm leading-relaxed">
                  Ten cuidado con la <span className="text-yellow-300 font-semibold">energía</span> de los ladrones. Si llega a cero, perderás todo el botín.
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

      {/* Header con estadísticas principales */}
      <div className="bg-black rounded-lg p-4 mb-4 w-full max-w-6xl">
  {/* En pantallas pequeñas: 1 columna; en >=sm: columnas con anchos iguales a los paneles inferiores */}
  <div className="grid grid-cols-1 lg:grid-cols-[16rem_16rem] gap-2 lg:gap-4 text-white justify-center">
          {/* Ladrón Actual (compacto) */}
          <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 rounded-md p-2 border-2 border-orange-500/50">
            <div className="flex items-center gap-2 mb-1">
              <User className="text-orange-400" size={18} />
              <span className="font-bold text-xs">Ladrón Actual</span>
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
              <div className="flex justify-between items-center">
                <span className="text-[11px]">Cofres en sala:</span>
                <span className="font-bold text-yellow-300 text-sm">
                  {board.flat().filter(c => c.type === 'gold').length} 💰
                </span>
              </div>
            </div>
          </div>

          {/* Oro total acumulado */}
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 rounded-md p-2 border-2 border-blue-500/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-blue-400" size={18} />
              <span className="font-bold text-xs">Oro acumulado</span>
            </div>
            <div className="flex justify-center items-center">
              <span className="font-bold text-yellow-400 text-2xl">${playerGold}</span>
            </div>
          </div>

        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl justify-center items-start">
        {/* Panel de cartas */}
        <div className="bg-black rounded-lg p-4 flex-shrink-0 w-full lg:w-64">
          <div className="text-white font-bold mb-3">📇 Cartas de Escaneo</div>
          <div className="text-xs text-gray-400 mb-3">La mano siempre mantiene 4 cartas.</div>
          <div className="flex flex-row lg:flex-col gap-2 flex-wrap justify-center lg:justify-start">
            {availableCards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setCardRotation(0);
                  setSelectedPrediction(null);
                }}
                disabled={card.cooldownRemaining > 0 || mode !== 'explore'}
                style={{
                  backgroundColor: card.cooldownRemaining > 0
                    ? '#4b5563' 
                    : selectedCard?.id === card.id
                      ? card.color
                      : `${card.color}cc`,
                  opacity: card.cooldownRemaining > 0 ? 0.6 : 1
                }}
                className={`px-4 py-3 rounded-lg font-bold transition-all ${
                  selectedCard?.id === card.id ? 'ring-2 ring-yellow-400' : ''
                } ${card.cooldownRemaining > 0 ? 'cursor-not-allowed' : 'hover:opacity-90'} text-white text-sm text-left`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-black">{CARD_PATTERNS[card.pattern].icon}</span>
                  <span className="text-[10px] uppercase tracking-wide text-white/80">
                    {getCardPowerLabel(card.cooldownRemaining > 0 ? 'Disabled' : card.powerLevel)}
                  </span>
                </div>

                <div className="text-xs mt-2 space-y-1">
                  {card.cooldownRemaining > 0 ? (
                    <div>
                      Disponible en {card.cooldownRemaining} {card.cooldownRemaining === 1 ? 'turno' : 'turnos'}
                    </div>
                  ) : (
                    <div>Lista para usar</div>
                  )}

                  {card.powerLevel === 'specificRevealer' && card.detectionType && (
                    <div className="flex items-center gap-1 text-white/80">
                      <span>Objetivo:</span>
                      <span className="text-base" style={{ lineHeight: '1' }}>{getAbilityIcon(card.detectionType)}</span>
                    </div>
                  )}

                  {card.powerLevel === 'Omniscient' && (
                    <div className="text-white/80">Revela todo el patrón</div>
                  )}

                  {card.powerLevel === 'Neutral' && (
                    <div className="text-white/80">Detecta presencia</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Paleta de predicciones */}
          <div className="mt-4">
            <div className="text-white font-bold mb-2 text-sm">🎯 Predicciones</div>
            <div className="grid grid-cols-3 gap-1">
              {PREDICTION_TYPES.map(pred => (
                <button
                  key={pred.id}
                  onClick={() => {
                    setSelectedPrediction(selectedPrediction === pred.id ? null : pred.id);
                    setSelectedCard(null);
                  }}
                  disabled={mode !== 'explore' || isExecuting || gameOver}
                  className={`p-1.5 rounded text-center transition-all disabled:opacity-40 ${
                    selectedPrediction === pred.id
                      ? 'ring-2 ring-blue-400 bg-blue-900/60'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="text-base">{pred.icon}</div>
                  <div className="text-[9px] text-gray-300 mt-0.5">{pred.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Board */}
  <div className="bg-black rounded-lg p-4 overflow-x-auto">
          <div className="flex">
            <div className="pr-1" style={{ minWidth: '100px' }}></div>
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 45px)`,
              }}
            >
              {Array.from({ length: GRID_WIDTH }, (_, i) => {
                const colContent = getColumnContent(i);
                // Parsear el contenido para separar cada elemento (ej: "x1 💊 x2 🔥" -> ["x1 💊", "x2 🔥"])
                const elements = colContent ? colContent.match(/x\d+\s+\S+/g) || [] : [];
                return (
                  <div 
  key={`col-header-${i}`} 
  className="text-white font-bold pb-1 flex flex-col items-center justify-end gap-0.5"
  style={{ fontSize: '11px', minHeight: '80px', width: '45px' }}
>
  {elements.length > 0 ? (
    elements.map((element, idx) => (
      <div key={idx} className="whitespace-nowrap">
        {element}
      </div>
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
                minWidth: '100px'
              }}
            >
              {Array.from({ length: GRID_HEIGHT }, (_, i) => {
                const rowContent = getRowContent(i);
                return (
                  <div 
                    key={`row-header-${i}`} 
                    className="flex items-center justify-end text-white font-bold"
                    style={{ fontSize: '11px', minWidth: '100px' }}
                  >
                    <div className="whitespace-nowrap">
                      {rowContent || '—'}
                    </div>
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
  <div className="bg-black rounded-lg p-4 flex-shrink-0 w-full sm:w-64 flex flex-col items-center">
    <div className="text-white font-bold mb-2 text-center">
      🔮 Visión
      <div className="text-sm font-normal mt-1">
        <span className="text-purple-300 font-bold text-lg">{crystalBallCounter}</span> éter
      </div>
    </div>

    {/* Bola decorativa */}
    <div
      className="relative flex items-center justify-center rounded-full mb-4"
      style={{
        width: '100px', height: '100px',
        background: 'radial-gradient(circle at 40% 40%, rgba(147,51,234,0.4), rgba(79,70,229,0.6), rgba(30,27,75,0.9))',
        border: '4px solid rgba(131,49,207,0.6)',
        boxShadow: '0 0 20px rgba(147,51,234,0.4)',
      }}
    >
      <div className="text-3xl opacity-60">💫</div>
    </div>

    {/* Acciones con éter */}
    <div className="w-full space-y-2 text-xs text-white">
      <div className="text-gray-400 font-bold uppercase tracking-wider mb-1">Usar éter</div>
      {availableCards.map(card => {
        const upgradeCost = UPGRADE_COST[card.powerLevel];
        const canUpgrade = upgradeCost !== undefined && crystalBallCounter >= upgradeCost && card.powerLevel !== 'Omniscient' && card.cooldownRemaining === 0;
        const canReactivate = card.cooldownRemaining > 0 && crystalBallCounter >= card.cooldownRemaining;
        if (!canUpgrade && !canReactivate) return null;
        return (
          <div key={card.id} className="flex flex-col gap-1">
            {canUpgrade && (
              <button
                onClick={() => upgradeCard(card.id)}
                disabled={isExecuting || gameOver}
                className="w-full px-2 py-1.5 rounded text-left flex justify-between items-center hover:opacity-90 disabled:opacity-40 transition-all"
                style={{ backgroundColor: POWER_LEVEL_COLORS[card.powerLevel] + '33', border: `1px solid ${POWER_LEVEL_COLORS[card.powerLevel]}` }}
              >
                <span>⬆ Mejorar {CARD_PATTERNS[card.pattern].icon}</span>
                <span className="font-bold">{upgradeCost} éter</span>
              </button>
            )}
            {canReactivate && (
              <button
                onClick={() => reactivateCard(card.id)}
                disabled={isExecuting || gameOver}
                className="w-full px-2 py-1.5 rounded text-left flex justify-between items-center bg-yellow-900/30 border border-yellow-600 hover:opacity-90 disabled:opacity-40 transition-all"
              >
                <span>⚡ Reactivar {CARD_PATTERNS[card.pattern].icon}</span>
                <span className="font-bold">{card.cooldownRemaining} éter</span>
              </button>
            )}
          </div>
        );
      })}
      {availableCards.every(card => {
        const upgradeCost = UPGRADE_COST[card.powerLevel];
        return (upgradeCost === undefined || crystalBallCounter < upgradeCost || card.powerLevel === 'Omniscient')
          && (card.cooldownRemaining === 0 || crystalBallCounter < card.cooldownRemaining);
      }) && (
        <div className="text-gray-500 text-center py-2">Sin acciones disponibles</div>
      )}
    </div>
  </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-4 flex-wrap justify-center">
        <button
          onClick={() => {
            setMode(mode === 'explore' ? 'trace' : 'explore');
            setSelectedCard(null);
            setSelectedPrediction(null);
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
        
        {mode === 'explore' && (
          <button
            onClick={checkAllPredictions}
            disabled={isExecuting || gameOver || !board.flat().some(c => c.prediction)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎯 COMPROBAR
          </button>
        )}

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
          <div className="text-3xl font-bold mb-2">💀 ¡SIN ENERGÍA!</div>
          <div className="text-lg">Te quedaste sin energía para continuar.</div>
          <div className="text-sm mt-2">Ronda alcanzada: {currentRound}</div>
          <div className="text-sm">Oro cobrado: ${playerGold}</div>
        </div>
      )}

    </div>
  );
};

export default VidenteGame;
