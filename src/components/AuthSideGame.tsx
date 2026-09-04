import { useEffect, useRef, useState } from 'react';

type GameItem = { id: number; type: 'poop' | 'coin'; x: number; y: number; speed: number; trail: number[] };
const makeItem = (id: number, type: GameItem['type']): GameItem => ({ id, type, x: 10 + Math.random() * 80, y: -10 - Math.random() * 70, speed: 0.009 + Math.random() * 0.004, trail: [] });
const initialItems = () => Array.from({ length: 8 }, (_, id) => makeItem(id, id % 3 === 0 ? 'poop' : 'coin'));
type AuthSideGameProps = { onExit?: () => void };

export default function AuthSideGame({ onExit }: AuthSideGameProps) {
  const [items, setItems] = useState<GameItem[]>(initialItems);
  const [score, setScore] = useState(0);
  const [playerX, setPlayerX] = useState(50);
  const [coinEffect, setCoinEffect] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const playerXRef = useRef(50);
  const nextId = useRef(20);
  useEffect(() => {
    if (gameOver) return undefined;
    let frame = 0;
    const tick = (time: number) => {
      const nextPlayerX = 50 + Math.sin(time / 2100) * 34;
      playerXRef.current = nextPlayerX; setPlayerX(nextPlayerX);
      setItems((current) => current.map((item) => {
        const nextY = item.y + item.speed * 16;
        const trail = item.type === 'poop' ? [item.y, ...item.trail].slice(0, 5) : [];
        const nearPlayer = nextY > 82 && nextY < 101 && Math.abs(item.x - playerXRef.current) < 11;
        if (nearPlayer) {
          if (item.type === 'coin') { setScore((value) => value + 1); setCoinEffect(true); window.setTimeout(() => setCoinEffect(false), 350); return makeItem(nextId.current++, 'coin'); }
          setGameOver(true); return item;
        }
        return nextY > 108 ? makeItem(nextId.current++, item.type) : { ...item, y: nextY, trail };
      }));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [gameOver]);
  const restart = () => { setItems(initialItems()); setScore(0); setGameOver(false); setCoinEffect(false); };
  return <div className="auth-side-game" aria-label="똥 피하기 코인 게임">
    <div className={`auth-game-score${coinEffect ? ' is-coin-pop' : ''}`}>🪙 {score}</div>
    {items.map((item) => <div key={item.id} className="auth-game-item" style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.type === 'poop' && item.trail.map((y, index) => <span key={`${item.id}-trail-${index}`} className="auth-poop-trail" style={{ top: `${y - item.y}%`, opacity: 0.32 - index * 0.055 }}>💩</span>)}<span className={`auth-falling-item ${item.type}`}>{item.type === 'coin' ? '🪙' : '💩'}</span></div>)}
    <div className="auth-game-player" style={{ left: `${playerX}%` }} aria-label="사람 캐릭터">🧍</div>
    {gameOver && <div className="auth-game-over" role="dialog" aria-modal="true" aria-label="게임 종료"><strong>똥을 맞았어요!</strong><span>획득 코인: {score}</span><div><button type="button" onClick={restart}>다시하기</button><button type="button" onClick={onExit}>종료하기</button></div></div>}
  </div>;
}
