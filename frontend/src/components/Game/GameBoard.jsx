import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

const PLANT_CARDS = [
  { type: 1, name: 'Peashooter', cost: 100, icon: '/assets/Cards/card_peashooter.png' },
  { type: 2, name: 'Sunflower', cost: 50, icon: '/assets/Cards/card_sunflower.png' },
  { type: 3, name: 'Wall-nut', cost: 50, icon: '/assets/Cards/card_wallnut.png' },
  { type: 4, name: 'Cherry Bomb', cost: 150, icon: '/assets/Cards/card_cherrybomb.png' },
  { type: 5, name: 'Snow Pea', cost: 175, icon: '/assets/Cards/card_snowpea.png' }
];

const ZOMBIE_CARDS = [
  { type: 1, name: 'Normal Zombie', cost: 50, icon: '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' },
  { type: 2, name: 'Conehead', cost: 75, icon: '/assets/Zombies/ConeheadZombie/ConeheadZombie/ConeheadZombie_0.png' },
  { type: 3, name: 'Buckethead', cost: 125, icon: '/assets/Zombies/BucketheadZombie/BucketheadZombie/BucketheadZombie_0.png' },
  { type: 4, name: 'Flag Zombie', cost: 100, icon: '/assets/Zombies/FlagZombie/FlagZombie/FlagZombie_0.png' }
];

const SunIcon = () => (
  <img src="/assets/Plants/Sun/Sun_0.png" alt="Sun"
    style={{ width: 18, height: 18, objectFit: 'contain', imageRendering: 'pixelated' }}
    onError={(e) => { e.target.style.display = 'none'; }}
  />
);

const BrainIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.73A3 3 0 0 1 4 10a3 3 0 0 1 3-3 2.5 2.5 0 0 1 2.5-5z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.73A3 3 0 0 0 20 10a3 3 0 0 0-3-3 2.5 2.5 0 0 0-2.5-5z"/>
  </svg>
);

export default function GameBoard({ roomId, playerRole, onExit }) {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameState, setGameState] = useState({
    sun: 150,
    brains: 150,
    invaders: [],
    projectiles: [],
    tick: 0,
    is_game_over: false,
    winner: 0
  });

  const [placedGrid, setPlacedGrid] = useState(
    Array(5).fill(null).map(() => Array(9).fill(null))
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/state?room_id=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setGameState(data);
        }
      } catch (e) {
        console.error(e);
      }
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
          room_id: roomId,
          action: 'PLACE_PLANT',
          unit_type: selectedCard.type,
          row: r,
          col: c,
          cost: selectedCard.cost,
          client_id: user?.id || 1001
        })
      });
    }
  };

  const handleSpawnZombie = async (card, lane) => {
    if (gameState.brains < card.cost) return;
    await fetch(`${API_BASE}/api/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        action: 'SPAWN_INVADER',
        unit_type: card.type,
        row: lane,
        col: 8,
        cost: card.cost,
        client_id: user?.id || 1002
      })
    });
  };

  const handleUndo = async () => {
    await fetch(`${API_BASE}/api/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        action: 'UNDO',
        client_id: user?.id || 1001
      })
    });
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'rgba(8, 16, 7, 1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      userSelect: 'none', overflow: 'hidden'
    }}>
      {/* Top HUD Bar */}
      <div style={{
        width: '900px', height: '76px', marginTop: '10px',
        background: 'rgba(8, 16, 7, 0.95)',
        border: '2px solid rgba(80, 130, 40, 0.4)',
        borderRadius: '6px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px', zIndex: 10
      }}>
        {/* Sun & Brain Meter */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div className="hud-resource hud-sun">
            <SunIcon /> Sun: {gameState.sun}
          </div>
          {playerRole === 'ZOMBIE' && (
            <div className="hud-resource hud-brains">
              <BrainIcon /> Brains: {gameState.brains}
            </div>
          )}
        </div>

        {/* Card Decks */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {playerRole === 'PLANT' ? (
            PLANT_CARDS.map((card) => (
              <div
                key={card.type}
                className={`seed-card ${selectedCard?.type === card.type ? 'selected' : ''}`}
                onClick={() => setSelectedCard(card)}
                style={{ opacity: gameState.sun >= card.cost ? 1 : 0.5 }}
              >
                <img src={card.icon} alt={card.name} style={{ width: '40px', height: '48px', objectFit: 'contain' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffd700' }}>{card.cost}</span>
              </div>
            ))
          ) : (
            ZOMBIE_CARDS.map((card) => (
              <div
                key={card.type}
                className={`seed-card ${selectedCard?.type === card.type ? 'selected' : ''}`}
                onClick={() => setSelectedCard(card)}
                style={{ opacity: gameState.brains >= card.cost ? 1 : 0.5 }}
              >
                <img src={card.icon} alt={card.name} style={{ width: '40px', height: '48px', objectFit: 'contain' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff9999' }}>{card.cost}</span>
              </div>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {playerRole === 'PLANT' && (
            <button className="pvz-btn pvz-btn-wood" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={handleUndo}>
              Undo
            </button>
          )}
          <button className="pvz-btn pvz-btn-danger" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={onExit}>
            Leave
          </button>
        </div>
      </div>

      {/* 5x9 Lawn Battlefield */}
      <div style={{
        position: 'relative', width: '900px', height: '540px', marginTop: '15px',
        backgroundImage: 'url(/assets/Screen/Adventure_0.png)',
        backgroundSize: 'cover', borderRadius: '6px', overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
      }}>
        {/* Lawnmowers on Left Column */}
        {[0, 1, 2, 3, 4].map((r) => (
          <img
            key={`mower-${r}`}
            src="/assets/Items/car.png"
            alt="Lawnmower"
            style={{
              position: 'absolute', left: '10px', top: `${r * 98 + 20}px`,
              width: '50px', height: '45px', zIndex: 4
            }}
          />
        ))}

        {/* 5x9 Interactive Grid Cells */}
        <div style={{
          position: 'absolute', left: '70px', top: '10px',
          display: 'grid', gridTemplateColumns: 'repeat(9, 84px)',
          gridTemplateRows: 'repeat(5, 98px)', zIndex: 2
        }}>
          {placedGrid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className="lawn-cell"
                onClick={() => handleCellClick(r, c)}
              >
                {cell && (
                  <img
                    src={cell.icon}
                    alt="Plant"
                    style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Dynamic Projectiles Rendering */}
        {gameState.projectiles?.map((p, idx) => (
          <img
            key={`proj-${idx}`}
            src={p.ice ? '/assets/Bullets/PeaIce/PeaIce_0.png' : '/assets/Bullets/PeaNormal/PeaNormal_0.png'}
            alt="bullet"
            style={{
              position: 'absolute',
              left: `${p.x}px`,
              top: `${p.lane * 98 + 45}px`,
              width: '24px',
              height: '24px',
              zIndex: 5
            }}
          />
        ))}

        {/* Dynamic Invaders Rendering */}
        {gameState.invaders?.map((inv) => (
          <div
            key={inv.id}
            style={{
              position: 'absolute',
              left: `${inv.x}px`,
              top: `${inv.lane * 98 + 15}px`,
              width: '70px',
              height: '85px',
              zIndex: 6,
              transition: 'left 0.05s linear'
            }}
          >
            <img
              src="/assets/Zombies/NormalZombie/Zombie/Zombie_0.png"
              alt="Zombie"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            {/* Health Bar */}
            <div style={{
              position: 'absolute', top: '-6px', left: '5px',
              width: '60px', height: '4px', background: '#333', borderRadius: '2px'
            }}>
              <div style={{
                height: '100%', width: `${Math.max(0, (inv.hp / 200) * 100)}%`,
                background: '#ff4444', borderRadius: '2px'
              }} />
            </div>
          </div>
        ))}

        {/* Zombie Spawner Buttons for Player 2 */}
        {playerRole === 'ZOMBIE' && (
          <div style={{
            position: 'absolute', right: '10px', top: '10px',
            display: 'flex', flexDirection: 'column', gap: '58px', zIndex: 10
          }}>
            {[0, 1, 2, 3, 4].map((lane) => (
              <button
                key={`spawn-${lane}`}
                className="pvz-btn"
                style={{ padding: '6px 10px', fontSize: '11px' }}
                onClick={() => selectedCard && handleSpawnZombie(selectedCard, lane)}
              >
                Send Lane {lane + 1}
              </button>
            ))}
          </div>
        )}

        {/* Game Over Modal */}
        {gameState.is_game_over && (
          <div className="modal-backdrop">
            <div className="pvz-card" style={{ textAlign: 'center', width: 440, padding: 32 }}>
              <img
                src={gameState.winner === 1 ? '/assets/Screen/GameVictory.png' : '/assets/Screen/GameLoose.png'}
                alt="Game Result"
                style={{ maxWidth: '320px', marginBottom: '20px' }}
              />
              <h2 className="game-title" style={{ color: gameState.winner === 1 ? '#5aaa2a' : '#b53028', fontSize: 24, marginBottom: '20px' }}>
                {gameState.winner === 1 ? 'Plants Defended the Garden' : 'Zombies Overran the Garden'}
              </h2>
              <button className="pvz-btn" style={{ fontSize: '14px', padding: '12px 30px' }} onClick={onExit}>
                Return to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
