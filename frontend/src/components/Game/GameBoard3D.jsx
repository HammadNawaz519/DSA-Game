import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';
import { Garden3DEngine } from '../../engine/Garden3DEngine';

const PLANT_CARDS = [
  { type: 1, name: 'Peashooter', cost: 100, icon: '/assets/Cards/card_peashooter.png' },
  { type: 2, name: 'Sunflower', cost: 50, icon: '/assets/Cards/card_sunflower.png' },
  { type: 3, name: 'Wall-nut', cost: 50, icon: '/assets/Cards/card_wallnut.png' },
  { type: 4, name: 'Cherry Bomb', cost: 150, icon: '/assets/Cards/card_cherrybomb.png' },
  { type: 5, name: 'Snow Pea', cost: 175, icon: '/assets/Cards/card_snowpea.png' },
];

const ZOMBIE_CARDS = [
  { type: 1, name: 'Walker', cost: 50, icon: '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' },
  { type: 2, name: 'Cone', cost: 75, icon: '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' },
  { type: 3, name: 'Bucket', cost: 125, icon: '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' },
];

/* ---- Sun icon ---- */
const SunIcon = () => (
  <img src="/assets/Plants/Sun/Sun_0.png" alt="Sun"
    style={{ width: 20, height: 20, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
    onError={(e) => { e.target.style.display = 'none'; }}
  />
);

/* ---- Brains icon (simple SVG) ---- */
const BrainIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.73A3 3 0 0 1 4 10a3 3 0 0 1 3-3 2.5 2.5 0 0 1 2.5-5z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.73A3 3 0 0 0 20 10a3 3 0 0 0-3-3 2.5 2.5 0 0 0-2.5-5z" />
  </svg>
);

export default function GameBoard3D({ roomId, playerRole, onExit }) {
  const { user } = useAuth();
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  const [selectedCard, setSelectedCard] = useState(null);
  const [gameState, setGameState] = useState({
    sun: 150, brains: 150, invaders: [], projectiles: [],
    tick: 0, is_game_over: false, winner: 0, end_reason: '',
  });
  const [placedGrid, setPlacedGrid] = useState(
    Array(5).fill(null).map(() => Array(9).fill(null))
  );

  /* ---- Three.js engine ---- */
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new Garden3DEngine(mountRef.current, (row, col) => {
      handleCellClick(row, col);
    });
    engineRef.current = engine;
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); engine.destroy(); };
  }, []);

  /* ---- Sync 3D scene ---- */
  useEffect(() => {
    if (engineRef.current) engineRef.current.updateState(gameState, placedGrid);
  }, [gameState, placedGrid]);

  /* ---- 20 Hz polling from C++ server ---- */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/state?room_id=${roomId}`);
        if (res.ok) setGameState(await res.json());
      } catch (e) { console.error(e); }
    }, 50);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleCellClick = async (r, c) => {
    if (!selectedCard) return;
    if (playerRole === 'PLANT') {
      if (placedGrid[r][c] !== null) return;
      if (gameState.sun < selectedCard.cost) return;
      const newGrid = [...placedGrid];
      newGrid[r][c] = { type: selectedCard.type, icon: selectedCard.icon };
      setPlacedGrid(newGrid);
      await fetch(`${API_BASE}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId, action: 'PLACE_PLANT',
          unit_type: selectedCard.type, row: r, col: c,
          cost: selectedCard.cost, client_id: user?.id || 1001,
        }),
      });
    }
  };

  const handleSpawnZombie = async (card, lane) => {
    if (gameState.brains < card.cost) return;
    await fetch(`${API_BASE}/api/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId, action: 'SPAWN_INVADER',
        unit_type: card.type, row: lane, col: 8,
        cost: card.cost, client_id: user?.id || 1002,
      }),
    });
  };

  const handleUndo = async () => {
    await fetch(`${API_BASE}/api/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, action: 'UNDO', client_id: user?.id || 1001 }),
    });
  };

  /* ---- Active card deck ---- */
  const deckCards = playerRole === 'PLANT' ? PLANT_CARDS : ZOMBIE_CARDS;
  const currency = playerRole === 'PLANT' ? gameState.sun : gameState.brains;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#080f07',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', userSelect: 'none',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* ---- TOP HUD ---- */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 920, maxWidth: '96vw', height: 68,
        background: 'rgba(8, 16, 7, 0.92)',
        border: '2px solid rgba(80, 130, 40, 0.5)',
        borderTop: '3px solid rgba(100, 170, 50, 0.6)',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        zIndex: 100,
        gap: 10,
      }}>
        {/* Resources */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div className="hud-resource hud-sun">
            <SunIcon /> {gameState.sun}
          </div>
          {playerRole === 'ZOMBIE' && (
            <div className="hud-resource hud-brains">
              <BrainIcon /> {gameState.brains}
            </div>
          )}
        </div>

        {/* Card Deck */}
        <div style={{ display: 'flex', gap: 7, flex: 1, justifyContent: 'center' }}>
          {deckCards.map((card) => {
            const affordable = currency >= card.cost;
            return (
              <div
                key={card.type}
                className={`seed-card ${selectedCard?.type === card.type ? 'selected' : ''}`}
                onClick={() => setSelectedCard(card)}
                style={{ opacity: affordable ? 1 : 0.4, cursor: affordable ? 'pointer' : 'not-allowed' }}
                title={`${card.name} — ${card.cost} ${playerRole === 'PLANT' ? 'Sun' : 'Brains'}`}
              >
                <img src={card.icon} alt={card.name}
                  style={{ width: 40, height: 48, objectFit: 'contain', imageRendering: 'pixelated' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 700,
                  color: playerRole === 'PLANT' ? '#ffd060' : '#ff9090',
                }}>
                  {card.cost}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {playerRole === 'PLANT' && (
            <button
              className="pvz-btn pvz-btn-wood"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handleUndo}
            >
              Undo (3s)
            </button>
          )}
          <button
            className="pvz-btn pvz-btn-danger"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={onExit}
          >
            Leave
          </button>
        </div>
      </div>

      {/* ---- 3D CANVAS ---- */}
      <div
        ref={mountRef}
        style={{ width: '100vw', height: '100vh', cursor: selectedCard ? 'crosshair' : 'default' }}
      />

      {/* ---- ZOMBIE LANE DEPLOY PANEL ---- */}
      {playerRole === 'ZOMBIE' && (
        <div style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 10,
          zIndex: 100,
        }}>
          {[0, 1, 2, 3, 4].map((lane) => (
            <button
              key={`spawn-${lane}`}
              className="pvz-btn pvz-btn-danger"
              style={{ padding: '7px 12px', fontSize: 12 }}
              onClick={() => selectedCard && handleSpawnZombie(selectedCard, lane)}
            >
              Lane {lane + 1}
            </button>
          ))}
        </div>
      )}

      {/* ---- GAME OVER MODAL ---- */}
      {gameState.is_game_over && (
        <div className="modal-backdrop">
          <div style={{
            width: 460, maxWidth: '92vw',
            background: 'rgba(8, 16, 7, 0.97)',
            border: `2px solid ${gameState.winner === 1 ? 'rgba(90,170,42,0.6)' : 'rgba(181,48,40,0.6)'}`,
            borderTop: `3px solid ${gameState.winner === 1 ? '#5aaa2a' : '#b53028'}`,
            borderRadius: 6, padding: '32px 28px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          }}>
            <h1 className="game-title" style={{
              fontSize: 36, marginBottom: 10,
              color: gameState.winner === 1 ? '#5aaa2a' : '#b53028',
            }}>
              {gameState.winner === 1 ? 'Victory' : 'Defeat'}
            </h1>
            <p style={{ color: 'rgba(180,160,130,0.7)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {gameState.end_reason || 'Match concluded by authoritative server.'}
            </p>

            <div style={{
              display: 'flex', justifyContent: 'space-around',
              background: 'rgba(5, 12, 4, 0.7)',
              border: '1px solid rgba(80,130,40,0.2)',
              borderRadius: 5, padding: '16px',
              marginBottom: 24,
            }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(140,180,90,0.5)', marginBottom: 6 }}>
                  Rating Change
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: gameState.winner === 1 ? '#5aaa2a' : '#b53028' }}>
                  {gameState.winner === 1 ? '+25 ELO' : '-18 ELO'}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(140,180,90,0.5)', marginBottom: 6 }}>
                  Game Duration
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: '#ffd060' }}>
                  {(gameState.tick / 20).toFixed(1)}s
                </div>
              </div>
            </div>

            <button
              className="pvz-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              onClick={onExit}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
