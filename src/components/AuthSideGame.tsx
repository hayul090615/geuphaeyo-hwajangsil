import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react';
import rainbowPoopUrl from '../assets/rainbow-poop.png';

type GameItem = { id: number; type: 'poop' | 'coin'; x: number; y: number; speed: number; size: 'normal' | 'giant' };
const PLAYER_SPEED_PERCENT_PER_SECOND = 28;
const MAX_STAGE = 5;
const GIANT_POOP_CHANCE = 0.16;
const PLAYER_MIN_X = 8;
const PLAYER_MAX_X = 92;
const PLAYER_HIT_Y_MIN = 88;
const PLAYER_HIT_Y_MAX = 98;
const ITEM_HIT_X_RADIUS = 6;
const STAGE_ITEM_COUNTS = [
  { poop: 2, coin: 6 },
  { poop: 3, coin: 5 },
  { poop: 4, coin: 4 },
  { poop: 5, coin: 3 },
  { poop: 6, coin: 2 },
] as const;
const makeItem = (id: number, type: GameItem['type'], size: GameItem['size'] = 'normal'): GameItem => ({
  id,
  type,
  size,
  x: 10 + Math.random() * 80,
  y: -10 - Math.random() * 70,
  speed: 0.009 + Math.random() * 0.004,
});
const createStageItems = (stage: number) => {
  const counts = STAGE_ITEM_COUNTS[stage - 1];
  const types: GameItem['type'][] = [
    ...Array.from({ length: counts.poop }, () => 'poop' as const),
    ...Array.from({ length: counts.coin }, () => 'coin' as const),
  ];
  return types.sort(() => Math.random() - 0.5).map((type, id) => makeItem(id, type));
};
type AuthSideGameProps = { onExit?: () => void };

export default function AuthSideGame({ onExit }: AuthSideGameProps) {
  const [items, setItems] = useState<GameItem[]>(() => createStageItems(1));
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [playerX, setPlayerX] = useState(50);
  const [coinEffect, setCoinEffect] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const playerXRef = useRef(50);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const scoreRef = useRef(0);
  const stageRef = useRef(1);
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
    if (gameOver) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, playerX: playerXRef.current };
    setPointerDirection(event);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
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
  }, []);

  useEffect(() => {
    if (gameOver) return undefined;
    let frame = 0;
    let previousTime: number | null = null;
    const createRespawnItem = (item: GameItem, currentItems: GameItem[]) => {
      const shouldSpawnGiant = stageRef.current === MAX_STAGE && item.type === 'poop'
        && !currentItems.some((currentItem) => currentItem.size === 'giant')
        && Math.random() < GIANT_POOP_CHANCE;
      return makeItem(nextId.current++, item.type, shouldSpawnGiant ? 'giant' : 'normal');
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
        const nearPlayer = nextY > PLAYER_HIT_Y_MIN && nextY < PLAYER_HIT_Y_MAX && Math.abs(item.x - playerXRef.current) < ITEM_HIT_X_RADIUS;
        if (nearPlayer) {
          if (item.type === 'coin') {
            collectedCoins += 1;
            setCoinEffect(true);
            window.setTimeout(() => setCoinEffect(false), 350);
            return createRespawnItem(item, currentItems);
          }
          setGameOver(true);
          return item;
        }
        return nextY > 108 ? createRespawnItem(item, currentItems) : { ...item, y: nextY };
      });
      if (collectedCoins > 0) {
        scoreRef.current += collectedCoins;
        setScore(scoreRef.current);
        const nextStage = Math.min(MAX_STAGE, Math.floor(scoreRef.current / 10) + 1);
        if (nextStage > stageRef.current) {
          stageRef.current = nextStage;
          setStage(nextStage);
          const stageItems = createStageItems(nextStage);
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
  }, [gameOver]);

  const restart = () => {
    directionRef.current = 0;
    scoreRef.current = 0;
    stageRef.current = 1;
    playerXRef.current = 50;
    setPlayerX(50);
    const stageItems = createStageItems(1);
    itemsRef.current = stageItems;
    setItems(stageItems);
    setScore(0);
    setStage(1);
    setGameOver(false);
    setCoinEffect(false);
  };

  return <div className={`auth-side-game stage-${stage}`} aria-label="Poop dodge coin game" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onPointerLeave={handlePointerEnd}>
    <div className={`auth-game-score${coinEffect ? ' is-coin-pop' : ''}`}><span className="auth-coin-icon" aria-hidden="true" /> {score}</div>
    <div className="auth-game-stage">STAGE {stage} / {MAX_STAGE}</div>
    {items.map((item) => <Fragment key={item.id}>
      <div className="auth-game-item" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
        {item.type === 'coin' ? <span className="auth-falling-item coin"><span className="auth-coin-icon" aria-hidden="true" /></span> : <img className={`auth-falling-item poop${item.size === 'giant' ? ' giant' : ''}`} src={rainbowPoopUrl} alt="" />}
      </div>
    </Fragment>)}
    <div className="auth-game-player" style={{ left: `${playerX}%` }} aria-label="Player">🚽</div>
    {gameOver && <div className="auth-game-over" role="dialog" aria-modal="true" aria-label="게임 종료"><strong>똥에 맞았어요!</strong><span>점수: {score}</span><div><button type="button" onClick={restart}>다시하기</button><button type="button" onClick={onExit}>종료하기</button></div></div>}
  </div>;
}
