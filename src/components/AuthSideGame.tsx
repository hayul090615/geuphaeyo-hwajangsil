import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react';
import rainbowPoopUrl from '../assets/rainbow-poop.png';

type GameItem = { id: number; type: 'poop' | 'coin'; x: number; y: number; speed: number; size: 'normal' | 'giant' | 'cluster'; scale: number };
const PLAYER_SPEED_PERCENT_PER_SECOND = 28;
const MAX_STAGE = 5;
const GIANT_POOP_CHANCE = 0.16;
const CLUSTER_POOP_CHANCE = 0.2;
const HIGH_SCORE_KEY = 'your-poop-rainbow-best-score';
const PLAYER_MIN_X = 8;
const PLAYER_MAX_X = 92;
const SPAWN_LINE_Y = 12;
const BOTTOM_LINE_Y = 96;
const PLAYER_HIT_Y_CENTER = 94;
const PLAYER_HIT_Y_RADIUS = 2.2;
const ITEM_HIT_X_RADIUS = 2.8;
const COIN_HIT_X_RADIUS = 6;
const COIN_HIT_Y_RADIUS = 3.5;
const STAGE_ITEM_COUNTS = [
  { poop: 5, coin: 6 },
  { poop: 6, coin: 5 },
  { poop: 7, coin: 4 },
  { poop: 8, coin: 3 },
  { poop: 10, coin: 2 },
] as const;
const getLargePoopScale = (stage: number) => stage === 2 ? 2 : stage === 3 ? 2.5 : 3;
const getEndlessLevel = (score: number) => score < MAX_STAGE * 10 ? 0 : Math.floor((score - MAX_STAGE * 10) / 10) + 1;
const readHighScore = () => {
  try {
    return Number(window.localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveHighScore = (score: number) => {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // localStorage may be unavailable in private browsing contexts.
  }
};
const getItemHitXRadius = (item: GameItem) => item.type === 'coin' ? COIN_HIT_X_RADIUS : item.size === 'giant'
  ? Math.min(5.6, ITEM_HIT_X_RADIUS * item.scale)
  : item.size === 'cluster' ? ITEM_HIT_X_RADIUS * 1.5 : ITEM_HIT_X_RADIUS;
const getItemHitYRadius = (item: GameItem) => item.type === 'coin' ? COIN_HIT_Y_RADIUS : item.size === 'giant'
  ? Math.min(4.5, PLAYER_HIT_Y_RADIUS * item.scale)
  : item.size === 'cluster' ? PLAYER_HIT_Y_RADIUS * 1.5 : PLAYER_HIT_Y_RADIUS;
const makeItem = (id: number, type: GameItem['type'], size: GameItem['size'] = 'normal', scale = 1): GameItem => ({
  id,
  type,
  size,
  scale,
  x: 10 + Math.random() * 80,
  y: SPAWN_LINE_Y,
  speed: 0.009 + Math.random() * 0.004,
});
const createStageItems = (stage: number, endlessLevel = 0) => {
  const counts = STAGE_ITEM_COUNTS[stage - 1];
  const types: GameItem['type'][] = [
    ...Array.from({ length: counts.poop + (stage === MAX_STAGE ? endlessLevel : 0) }, () => 'poop' as const),
    ...Array.from({ length: counts.coin }, () => 'coin' as const),
  ];
  const items = types.sort(() => Math.random() - 0.5).map((type, id) => makeItem(id, type));
  const poopItems = items.filter((item) => item.type === 'poop');
  if (stage >= 2 && stage <= 4 && poopItems.length > 0) {
    const target = poopItems[Math.floor(Math.random() * poopItems.length)];
    return items.map((item) => item.id === target.id ? makeItem(item.id, 'poop', 'giant', getLargePoopScale(stage)) : item);
  }
  if (stage === MAX_STAGE && poopItems.length > 0) {
    const target = poopItems[Math.floor(Math.random() * poopItems.length)];
    return items.map((item) => item.id === target.id ? makeItem(item.id, 'poop', 'cluster', 1.15) : item);
  }
  return items;
};
type AuthSideGameProps = { onExit?: () => void };

export default function AuthSideGame({ onExit }: AuthSideGameProps) {
  const [items, setItems] = useState<GameItem[]>(() => createStageItems(1));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(readHighScore);
  const [stage, setStage] = useState(1);
  const [endlessLevel, setEndlessLevel] = useState(0);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50);
  const [coinEffect, setCoinEffect] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fireEffect, setFireEffect] = useState<{ id: number; x: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const playerXRef = useRef(50);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);
  const stageRef = useRef(1);
  const endlessLevelRef = useRef(0);
  const livesRef = useRef(3);
  const invulnerableUntilRef = useRef(0);
  const itemsRef = useRef<GameItem[]>([]);
  const nextId = useRef(20);
  const pointerStartRef = useRef<{ id: number; x: number; playerX: number } | null>(null);
  itemsRef.current = items;

  const setPointerDirection = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const deadZone = bounds.width * 0.15;
    directionRef.current = event.clientX < center - deadZone ? -1 : event.clientX > center + deadZone ? 1 : 0;
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (gameOver || paused) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, playerX: playerXRef.current };
    setPointerDirection(event);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (paused) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const nextPlayerX = Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100));
      playerXRef.current = nextPlayerX;
      setPlayerX(nextPlayerX);
      return;
    }
    const pointerStart = pointerStartRef.current;
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaPercent = ((event.clientX - pointerStart.x) / bounds.width) * 100;
    if (Math.abs(deltaPercent) < 1) return;
    const nextPlayerX = Math.max(8, Math.min(92, pointerStart.playerX + deltaPercent));
    playerXRef.current = nextPlayerX;
    setPlayerX(nextPlayerX);
    directionRef.current = 0;
  };
  const stopPointerDirection = () => {
    pointerStartRef.current = null;
    directionRef.current = 0;
  };
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current?.id === event.pointerId) stopPointerDirection();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (paused) return;
      event.preventDefault();
      directionRef.current = event.key === 'ArrowLeft' ? -1 : 1;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') directionRef.current = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopPointerDirection);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopPointerDirection);
    };
  }, [paused]);

  useEffect(() => {
    if (gameOver || paused) return undefined;
    let frame = 0;
    let previousTime: number | null = null;
    const createRespawnItem = (item: GameItem, currentItems: GameItem[]) => {
      const shouldSpawnGiant = stageRef.current >= 2 && stageRef.current < MAX_STAGE && item.type === 'poop'
        && !currentItems.some((currentItem) => currentItem.size === 'giant')
        && Math.random() < GIANT_POOP_CHANCE;
      const shouldSpawnCluster = stageRef.current === MAX_STAGE && item.type === 'poop'
        && !currentItems.some((currentItem) => currentItem.size === 'cluster')
        && Math.random() < CLUSTER_POOP_CHANCE;
      if (shouldSpawnGiant) return makeItem(nextId.current++, item.type, 'giant', getLargePoopScale(stageRef.current));
      if (shouldSpawnCluster) return makeItem(nextId.current++, item.type, 'cluster', 1.15);
      return makeItem(nextId.current++, item.type);
    };
    const tick = (time: number) => {
      const elapsedSeconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const nextPlayerX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, playerXRef.current + directionRef.current * PLAYER_SPEED_PERCENT_PER_SECOND * elapsedSeconds));
      playerXRef.current = nextPlayerX;
      setPlayerX(nextPlayerX);
      const currentItems = itemsRef.current;
      let collectedCoins = 0;
      const nextItems = currentItems.map((item) => {
        const nextY = item.y + item.speed * 16;
        const nearPlayer = Math.abs(nextY - PLAYER_HIT_Y_CENTER) < getItemHitYRadius(item)
          && Math.abs(item.x - playerXRef.current) < getItemHitXRadius(item);
        if (nearPlayer) {
          if (item.type === 'coin') {
            collectedCoins += 1;
            setCoinEffect(true);
            window.setTimeout(() => setCoinEffect(false), 350);
            return createRespawnItem(item, currentItems);
          }
          if (time >= invulnerableUntilRef.current) {
            const nextLives = livesRef.current - 1;
            livesRef.current = nextLives;
            setLives(nextLives);
            invulnerableUntilRef.current = time + 900;
            if (nextLives <= 0) setGameOver(true);
          }
          return createRespawnItem(item, currentItems);
        }
        const touchesPoopLine = item.y < BOTTOM_LINE_Y && nextY >= BOTTOM_LINE_Y;
        if (touchesPoopLine) {
          setFireEffect({ id: item.id, x: item.x });
          window.setTimeout(() => setFireEffect((current) => current?.id === item.id ? null : current), 320);
          return createRespawnItem(item, currentItems);
        }
        return nextY > 108 ? createRespawnItem(item, currentItems) : { ...item, y: nextY };
      });
      if (collectedCoins > 0) {
        const nextScore = scoreRef.current + collectedCoins;
        scoreRef.current = nextScore;
        setScore(nextScore);
        if (nextScore > highScoreRef.current) {
          highScoreRef.current = nextScore;
          setHighScore(nextScore);
          saveHighScore(nextScore);
        }
        const nextStage = Math.min(MAX_STAGE, Math.floor(nextScore / 10) + 1);
        const nextEndlessLevel = getEndlessLevel(nextScore);
        if (nextStage > stageRef.current || nextEndlessLevel > endlessLevelRef.current) {
          stageRef.current = nextStage;
          setStage(nextStage);
          endlessLevelRef.current = nextEndlessLevel;
          setEndlessLevel(nextEndlessLevel);
          const stageItems = createStageItems(nextStage, nextEndlessLevel);
          itemsRef.current = stageItems;
          setItems(stageItems);
        } else {
          itemsRef.current = nextItems;
          setItems(nextItems);
        }
      } else {
        itemsRef.current = nextItems;
        setItems(nextItems);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [gameOver, paused]);

  const restart = () => {
    directionRef.current = 0;
    scoreRef.current = 0;
    endlessLevelRef.current = 0;
    livesRef.current = 3;
    invulnerableUntilRef.current = 0;
    stageRef.current = 1;
    playerXRef.current = 50;
    setPlayerX(50);
    const stageItems = createStageItems(1);
    itemsRef.current = stageItems;
    setItems(stageItems);
    setScore(0);
    setLives(3);
    setEndlessLevel(0);
    setStage(1);
    setPaused(false);
    setGameOver(false);
    setCoinEffect(false);
    setFireEffect(null);
  };
  const togglePause = () => {
    if (gameOver) return;
    pointerStartRef.current = null;
    directionRef.current = 0;
    setPaused((current) => !current);
  };

  return <div className={`auth-side-game stage-${stage}`} aria-label="Poop dodge coin game" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onPointerLeave={handlePointerEnd}>
    <button className="auth-game-pause" type="button" aria-label={paused ? '게임 재개' : '게임 일시정지'} onPointerDown={(event) => event.stopPropagation()} onClick={togglePause}>{paused ? '▶️' : '⏸️'}</button>
    <div className="auth-game-lives" aria-label={`생명 ${lives}개`}>❤️ × {lives}</div>
    <div className={`auth-game-score${coinEffect ? ' is-coin-pop' : ''}`}><span className="auth-coin-icon" aria-hidden="true" /> {score}</div>
    <div className="auth-game-best">최고기록 {highScore}</div>
    <div className="auth-game-stage">{endlessLevel > 0 ? `STAGE ${MAX_STAGE}+${endlessLevel}` : `STAGE ${stage} / ${MAX_STAGE}`}</div>
    <div className="auth-game-spawn-line" aria-hidden="true" />
    {items.map((item) => <Fragment key={item.id}>
      <div className="auth-game-item" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
        {item.type === 'coin' ? <span className="auth-falling-item coin"><span className="auth-coin-icon" aria-hidden="true" /></span> : item.size === 'cluster' ? <span className="auth-falling-item poop cluster" aria-hidden="true"><img src={rainbowPoopUrl} alt="" /><img src={rainbowPoopUrl} alt="" /><img src={rainbowPoopUrl} alt="" /></span> : <img className={`auth-falling-item poop${item.size === 'giant' ? ' giant' : ''}`} style={item.size === 'giant' ? { width: `${32 * item.scale}px`, height: `${32 * item.scale}px` } : undefined} src={rainbowPoopUrl} alt="" />}
      </div>
    </Fragment>)}
    <div className="auth-poop-line" aria-hidden="true" />
    {fireEffect && <span className="auth-poop-fire" style={{ left: `${fireEffect.x}%` }} aria-hidden="true">🔥</span>}
    <div className="auth-game-player" style={{ left: `${playerX}%` }} aria-label="Player">🚽</div>
    {paused && !gameOver && <div className="auth-game-paused" aria-live="polite">일시정지</div>}
    {gameOver && <div className="auth-game-over" role="dialog" aria-modal="true" aria-label="게임 종료"><strong>똥에 맞았어요!</strong><span>점수: {score}</span><div><button type="button" onClick={restart}>다시하기</button><button type="button" onClick={onExit}>종료하기</button></div></div>}
  </div>;
}
