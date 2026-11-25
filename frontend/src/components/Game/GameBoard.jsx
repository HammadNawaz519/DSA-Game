import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

// Plant card definitions matching backend types
const PLANT_CARDS = [
  { type: 1, name: 'Peashooter', cost: 100, icon: '/assets/Cards/card_peashooter.png' },
  { type: 2, name: 'Sunflower', cost: 50, icon: '/assets/Cards/card_sunflower.png' },
  { type: 3, name: 'Wall-nut', cost: 50, icon: '/assets/Cards/card_wallnut.png' },
  { type: 4, name: 'Cherry Bomb', cost: 150, icon: '/assets/Cards/card_cherrybomb.png' },
  { type: 5, name: 'Snow Pea', cost: 175, icon: '/assets/Cards/card_snowpea.png' },
  { type: 6, name: 'Repeater', cost: 200, icon: '/assets/Cards/card_repeaterpea.png' },
  { type: 7, name: 'Potato Mine', cost: 25, icon: '/assets/Cards/card_potatomine.png' },
  { type: 8, name: 'Chomper', cost: 150, icon: '/assets/Cards/card_chomper.png' },
  { type: 9, name: 'Jalapeno', cost: 125, icon: '/assets/Cards/card_jalapeno.png' },
];

// Zombie/spawner cards
const ZOMBIE_CARDS = [
  { type: 1, name: 'Normal Zombie', cost: 50, icon: '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' },
  { type: 2, name: 'Conehead Zombie', cost: 75, icon: '/assets/Zombies/ConeheadZombie/ConeheadZombie/ConeheadZombie_0.png' },
  { type: 3, name: 'Buckethead Zombie', cost: 125, icon: '/assets/Zombies/BucketheadZombie/BucketheadZombie/BucketheadZombie_0.png' },
  { type: 4, name: 'Newspaper Zombie', cost: 90, icon: '/assets/Zombies/NewspaperZombie/NewspaperZombie/NewspaperZombie_0.png' },
  { type: 5, name: 'Flag Zombie', cost: 50, icon: '/assets/Zombies/FlagZombie/FlagZombie/FlagZombie_0.png' },
];

// Sun sprite (rotating)
const SunSprite = ({ sun, x, y }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f + 1) % 22), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={`/assets/Plants/Sun/Sun_${frame}.png`}
      alt="Sun"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 24,
        height: 24,
        objectFit: 'contain',
        cursor: 'pointer',
        imageRendering: 'pixelated',
        animation: 'rotate 3s linear infinite'
      }}
      onClick={() => window.dispatchEvent(new CustomEvent('collect-sun', { detail: { x, y } }))}
    />
  );
};

export default function GameBoard({ roomId, playerRole, onExit }) {
  const { user } = useAuth();
  const mountRef = useRef(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameState, setGameState] = useState({
    sun: 150, brains: 150, invaders: [], projectiles: [], plants: [], tick: 0,
    is_game_over: false, winner_role: 0, end_reason: ''
  });
  const [placedPlants, setPlacedPlants] = useState(
    Array(5).fill(null).map(() => Array(9).fill(null))
  );
  const [ws, setWs] = useState(null);

  // Grid dimensions in pixels
  const GRID_WIDTH = 920;
  const GRID_HEIGHT = 560;
  const COLS = 9;
  const ROWS = 5;
  const CELL_W = GRID_WIDTH / COLS;
  const CELL_H = GRID_HEIGHT / ROWS;

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws_url = API_BASE.replace('http', 'ws').replace('https', 'wss') + `/ws/game`;
    const socket = new WebSocket(ws_url);

    socket.onopen = () => {
      console.log('[WS] Connected to game server');
      // Join the match
      socket.send(JSON.stringify({
        type: 'JOIN_MATCH',
        token: localStorage.getItem('pvz_token'),
        room_id: roomId,
        role: playerRole
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TICK_UPDATE') {
          setGameState(prev => ({ ...prev, ...data }));
        } else if (data.type === 'ERROR') {
          console.error('[WS] Server error:', data.msg);
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected');
    };

    socket.onerror = (e) => {
      console.error('[WS] Error:', e);
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [roomId, playerRole]);

  // Poll game state as backup (every 500ms)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/state?room_id=${roomId}`);
        if (res.ok) setGameState(await res.json());
      } catch (e) {}
    }, 500);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleCellClick = (col, row) => {
    if (!selectedCard || !ws || playerRole !== 'PLANT') return;

    // Send action via WebSocket
    ws.send(JSON.stringify({
      type: 'PLACE_PLANT',
      plant_type: selectedCard.type,
      row: row,
      col: col,
      cost: selectedCard.cost
    }));

    setSelectedCard(null);
  };

  const handleSpawnZombie = (lane) => {
    if (!selectedCard || !ws || playerRole !== 'ZOMBIE') return;
    ws.send(JSON.stringify({
      type: 'SPAWN_ZOMBIE',
      zombie_type: selectedCard.type,
      lane: lane
    }));
    setSelectedCard(null);
  };

  const handleUndo = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'UNDO_LAST_ACTION' }));
  };

  const handleCollectSun = (sunId) => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'COLLECT_SUN', sun_id: sunId }));
  };

  // Update placed plants from game state
  useEffect(() => {
    const newPlants = Array(5).fill(null).map(() => Array(9).fill(null));

    if (gameState.invaders?.length > 0) {
      gameState.invaders.forEach(inv => {
        const col = Math.floor((inv.x - 40) / 82);
        if (col >= 0 && col < 9) {
          newPlants[inv.lane][col] = {
            type: 0, // Zombie consuming
            isZombined: true
          };
        }
      });
    }

    setPlacedPlants(newPlants);
  }, [gameState.invaders]);

  const currentCards = playerRole === 'PLANT' ? PLANT_CARDS : ZOMBIE_CARDS;
  const currency = playerRole === 'PLANT' ? gameState.sun : gameState.brains;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a1208',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top HUD with actual sun/sun sprite */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        height: 68,
        background: 'rgba(8, 16, 7, 0.92)',
        border: '2px solid rgba(80, 130, 40, 0.5)',
        borderTop: '3px solid rgba(100, 170, 50, 0.6)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        zIndex: 100,
        gap: 10,
      }}>
        {/* Resources with actual sun sprite */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <img src="/assets/Plants/Sun/Sun_0.png"
               alt="Sun"
               style={{ width: 24, height: 24, objectFit: 'contain', imageRendering: 'pixelated' }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 20,
            fontWeight: 700,
            color: '#ffd060'
          }}>
            {gameState.sun}
          </span>
          {playerRole === 'ZOMBIE' && (
            <>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 14,
                color: '#c05050',
                margin: '0 8px'
              }}>⚔</span>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 20,
                fontWeight: 700,
                color: '#ff9090'
              }}>
                {gameState.brains}
              </span>
            </>
          )}
        </div>

        {/* Card Deck with actual sprites */}
        <div style={{
          display: 'flex',
          gap: 8,
          flex: 1,
          justifyContent: 'center',
          overflowX: 'auto',
          padding: '0 10px'
        }}>
          {currentCards.map((card) => {
            const affordable = currency >= card.cost;
            return (
              <div
                key={card.type}
                onClick={() => setSelectedCard(card)}
                style={{
                  width: 56,
                  height: 76,
                  borderRadius: 4,
                  border: `2px solid ${affordable ? '#4a3010' : '#2a2a2a'}`,
                  background: 'linear-gradient(180deg, #2e1c08 0%, #1a0f04 100%)',
                  cursor: affordable ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 4,
                  transition: 'transform 0.1s, border-color 0.1s',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
                  position: 'relative',
                  opacity: affordable ? 1 : 0.4,
                  transform: selectedCard?.type === card.type ? 'scale(1.05) translateY(-3px)' : 'scale(1)'
                }}
                title={`${card.name} — ${card.cost} ${playerRole === 'PLANT' ? 'Sun' : 'Brains'}`}
              >
                <img
                  src={card.icon}
                  alt={card.name}
                  style={{
                    width: 44,
                    height: 52,
                    objectFit: 'contain',
                    imageRendering: 'pixelated'
                  }}
                  className={selectedCard?.type === card.type ? 'card-selected' : ''}
                />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: affordable ? (playerRole === 'PLANT' ? '#ffd060' : '#ff9090') : '#888',
                }}>
                  {card.cost}
                </span>
                {selectedCard?.type === card.type && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    fontFamily: "'Cinzel', serif",
                    fontSize: 10,
                    color: '#ffd060',
                  }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {playerRole === 'PLANT' && (
            <button
              onClick={handleUndo}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                background: 'linear-gradient(180deg, #5aaa2a 0%, #357015 60%, #264e0e 100%)',
                border: '2px solid #4a3010',
                borderTop: '2px solid #7dd44a',
                borderBottom: '3px solid #1a3a07',
                borderRadius: 5,
                cursor: 'pointer',
                color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
              }}
            >
              Undo
            </button>
          )}
          <button
            onClick={onExit}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: 'linear-gradient(180deg, #b53028 0%, #771a14 60%, #4e1009 100%)',
              border: '2px solid #8c2218',
              borderTop: '2px solid #e05545',
              borderBottom: '3px solid #280603',
              borderRadius: 5,
              cursor: 'pointer',
              color: '#fff',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
            }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* Game Grid using actual background */}
      <div
        style={{
          flex: 1,
          width: '100%',
          backgroundImage: 'url(/assets/Items/Background/Adventure_0.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          cursor: selectedCard ? 'crosshair' : 'default'
        }}
      >
        {/* Grid overlay with actual lawn cells */}
        <div style={{
          position: 'absolute',
          inset: 0,
          margin: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: 2,
          pointerEvents: 'none'
        }}>
          {Array(5).fill(null).map((_, row) => (
            Array(9).fill(null).map((_, col) => (
              <div
                key={`${row}-${col}`}
                onClick={() => handleCellClick(col, row)}
                style={{
                  background: 'rgba(71, 139, 39, 0.4)',
                  border: '1px solid rgba(100, 160, 60, 0.3)',
                  borderRadius: 3,
                  cursor: selectedCard ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  pointerEvents: 'auto'
                }}
              />
            ))
          ))}
        </div>

        {/* Render plants */}
        {gameState.invaders?.map((invader, idx) => {
          const col = Math.floor((invader.x - 40) / 82);
          if (col >= 0 && col < 9) {
            return (
              <div
                key={`inv-${invader.id}`}
                style={{
                  position: 'absolute',
                  left: 20 + col * CELL_W + CELL_W / 2 - 20,
                  top: 20 + invader.lane * CELL_H + CELL_H / 2 - 20,
                  width: CELL_W - 4,
                  height: CELL_H - 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                <img
                  src={`/assets/Zombies/NormalZombie/Zombie/Zombie_${Math.min(invader.id % 22, 21)}.png`}
                  alt="Zombie"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    transform: `scaleX(${invader.is_chilled ? -1 : 1})`
                  }}
                />
              </div>
            );
          }
          return null;
        })}

        {/* Render projectiles */}
        {gameState.projectiles?.map((proj, idx) => {
          const col = Math.floor((proj.x - 40) / 82);
          return (
            <div
              key={`proj-${idx}`}
              style={{
                position: 'absolute',
                left: proj.x - 6,
                top: 20 + proj.lane * CELL_H + CELL_H / 2 - 6,
                width: 12,
                height: 12,
                zIndex: 20
              }}
            >
              <img
                src={proj.ice ? '/assets/Bullets/PeaIce/PeaIce_0.png' : '/assets/Bullets/PeaNormal/PeaNormal_0.png'}
                alt="Projectile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'pixelated'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Zombie deploy panel for Zombie player */}
      {playerRole === 'ZOMBIE' && selectedCard && (
        <div style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 100,
        }}>
          {[0, 1, 2, 3, 4].map((lane) => (
            <button
              key={`spawn-${lane}`}
              onClick={() => handleSpawnZombie(lane)}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                background: 'linear-gradient(180deg, #b53028 0%, #771a14 60%, #4e1009 100%)',
                border: '2px solid #8c2218',
                borderRadius: 5,
                cursor: 'pointer',
                color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
              }}
            >
              Lane {lane + 1}
            </button>
          ))}
        </div>
      )}

      {/* Game Over Modal with victory/defeat screens */}
      {gameState.is_game_over && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: 560,
            maxWidth: '96vw',
            textAlign: 'center',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            <img
              src={gameState.winner_role === 1 ? '/assets/Screen/GameVictory.png' : '/assets/Screen/GameLoose.png'}
              alt={gameState.winner_role === 1 ? 'Victory' : 'Defeat'}
              style={{
                width: '100%',
                height: 'auto',
                imageRendering: 'pixelated'
              }}
            />
            <div style={{
              padding: '24px',
              background: 'rgba(5, 12, 4, 0.9)',
            }}>
              <h2 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 28,
                fontWeight: 700,
                color: gameState.winner_role === 1 ? '#5aaa2a' : '#b53028',
                marginBottom: 16
              }}>
                {gameState.winner_role === 1 ? 'Victory!' : 'Defeat!'}
              </h2>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14,
                color: 'rgba(180,165,140,0.8)',
                marginBottom: 20
              }}>
                {gameState.end_reason || 'Match concluded'}
              </p>
              <button
                onClick={onExit}
                style={{
                  padding: '12px 28px',
                  fontSize: 14,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(180deg, #5aaa2a 0%, #357015 60%, #264e0e 100%)',
                  border: '2px solid #4a3010',
                  borderRadius: 5,
                  cursor: 'pointer'
                }}
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .card-selected { filter: drop-shadow(0 0 8px #ffd060); }
      `}</style>
    </div>
  );
}