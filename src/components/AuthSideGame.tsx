import { useEffect, useRef, useState, type PointerEvent } from 'react';

type GameItem = { id: number; type: 'poop' | 'coin'; x: number; y: number; speed: number; trail: number[] };
const PLAYER_SPEED_PERCENT_PER_SECOND = 24;
const PLAYER_MIN_X = 8;
const PLAYER_MAX_X = 92;
const PLAYER_HIT_Y_MIN = 88;
const PLAYER_HIT_Y_MAX = 98;
const ITEM_HIT_X_RADIUS = 6;
const makeItem = (id: number, type: GameItem['type']): GameItem => ({
  id,
  type,
  x: 10 + Math.random() * 80,
  y: -10 - Math.random() * 70,
  speed: 0.009 + Math.random() * 0.004,
  trail: [],
});
const initialItems = () => Array.from({ length: 8 }, (_, id) => makeItem(id, id % 3 === 0 ? 'poop' : 'coin'));
type AuthSideGameProps = { onExit?: () => void };

export default function AuthSideGame({ onExit }: AuthSideGameProps) {
  const [items, setItems] = useState<GameItem[]>(initialItems);
  const [score, setScore] = useState(0);
  const [playerX, setPlayerX] = useState(50);
  const [coinEffect, setCoinEffect] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const playerXRef = useRef(50);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const nextId = useRef(20);

  const setPointerDirection = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    directionRef.current = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
  };
  const stopPointerDirection = () => { directionRef.current = 0; };

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
    const tick = (time: number) => {
      const elapsedSeconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const nextPlayerX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, playerXRef.current + directionRef.current * PLAYER_SPEED_PERCENT_PER_SECOND * elapsedSeconds));
      playerXRef.current = nextPlayerX;
      setPlayerX(nextPlayerX);
      setItems((current) => current.map((item) => {
        const nextY = item.y + item.speed * 16;
        const trail = item.type === 'poop' ? [item.y, ...item.trail].slice(0, 5) : [];
        const nearPlayer = nextY > PLAYER_HIT_Y_MIN && nextY < PLAYER_HIT_Y_MAX && Math.abs(item.x - playerXRef.current) < ITEM_HIT_X_RADIUS;
        if (nearPlayer) {
          if (item.type === 'coin') {
            setScore((value) => value + 1);
            setCoinEffect(true);
            window.setTimeout(() => setCoinEffect(false), 350);
            return makeItem(nextId.current++, 'coin');
          }
          setGameOver(true);
          return item;
        }
        return nextY > 108 ? makeItem(nextId.current++, item.type) : { ...item, y: nextY, trail };
      }));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [gameOver]);

  const restart = () => {
    directionRef.current = 0;
    playerXRef.current = 50;
    setPlayerX(50);
    setItems(initialItems());
    setScore(0);
    setGameOver(false);
    setCoinEffect(false);
  };

  return <div className="auth-side-game" aria-label="Poop dodge coin game" onPointerDown={setPointerDirection} onPointerMove={(event) => { if (event.buttons > 0) setPointerDirection(event); }} onPointerUp={stopPointerDirection} onPointerCancel={stopPointerDirection} onPointerLeave={stopPointerDirection}>
    <div className={`auth-game-score${coinEffect ? ' is-coin-pop' : ''}`}>🪙 {score}</div>
    {items.map((item) => <div key={item.id} className="auth-game-item" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
      {item.type === 'poop' && item.trail.map((y, index) => <span key={`${item.id}-trail-${index}`} className="auth-poop-trail" style={{ top: `${y - item.y}%`, opacity: 0.32 - index * 0.055 }}>💩</span>)}
      <span className={`auth-falling-item ${item.type}`}>{item.type === 'coin' ? '🪙' : '💩'}</span>
    </div>)}
    <div className="auth-game-player" style={{ left: `${playerX}%` }} aria-label="Player">🚽</div>
    {gameOver && <div className="auth-game-over" role="dialog" aria-modal="true" aria-label="Game over"><strong>You got hit!</strong><span>Score: {score}</span><div><button type="button" onClick={restart}>Restart</button><button type="button" onClick={onExit}>Exit</button></div></div>}
  </div>;
}
