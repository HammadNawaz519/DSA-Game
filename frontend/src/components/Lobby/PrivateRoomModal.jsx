import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function PrivateRoomModal({ isOpen, onClose, onStartGame }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('create');
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  /* Poll room status */
  useEffect(() => {
    if (!activeRoom) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/state?room_id=${activeRoom.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            setActiveRoom((prev) => ({ ...prev, ...data.room }));
            if (data.room.started) {
              clearInterval(interval);
              const myRole = (data.room.p1.name === (user?.display_name || user?.username)) ? 'PLANT' : 'ZOMBIE';
              onStartGame(activeRoom.id, myRole);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRoom, user, onStartGame]);

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: user?.id || 1001,
          host_name: user?.display_name || user?.username || 'HostCommander',
          host_elo: user?.elo || 1000,
          mode: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveRoom({
          id: data.room_id, code: data.code,
          p1: { name: user?.display_name || user?.username, elo: user?.elo || 1000, ready: true },
          p2: { name: '', elo: 0, ready: false },
          started: false,
        });
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (e) { setError('Connection error'); }
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/join-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode.trim().toUpperCase(),
          guest_id: user?.id || 1002,
          guest_name: user?.display_name || user?.username || 'GuestPlayer',
          guest_elo: user?.elo || 1000,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveRoom({
          id: data.room_id, code: roomCode.toUpperCase(),
          p1: { name: 'Host', elo: 1000, ready: true },
          p2: { name: user?.display_name || user?.username, elo: user?.elo || 1000, ready: false },
          started: false,
        });
      } else {
        setError(data.error || 'Invalid room code');
      }
    } catch (e) { setError('Connection error'); }
    setLoading(false);
  };

  const handleToggleReady = async () => {
    if (!activeRoom) return;
    const isP1 = activeRoom.p1?.name === (user?.display_name || user?.username);
    const newReady = isP1 ? !activeRoom.p1.ready : !activeRoom.p2.ready;
    await fetch(`${API_BASE}/api/rooms/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: activeRoom.id, user_id: user?.id || 1001, ready: newReady }),
    });
  };

  const handleStartMatch = async () => {
    if (!activeRoom) return;
    const res = await fetch(`${API_BASE}/api/rooms/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: activeRoom.id, host_id: user?.id || 1001 }),
    });
    const data = await res.json();
    if (!data.success) setError(data.error || 'Cannot start match');
  };

  const copyRoomCode = () => {
    if (!activeRoom?.code) return;
    navigator.clipboard.writeText(activeRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  /* ---- Shared error block ---- */
  const ErrorBlock = () => error ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(181, 48, 40, 0.15)',
      border: '1px solid rgba(181, 48, 40, 0.5)',
      borderRadius: 4, padding: '10px 14px',
      marginBottom: 16, fontSize: 13, color: '#ff9b8a',
    }}>
      <AlertIcon /> {error}
    </div>
  ) : null;

  /* ---- Player slot ---- */
  const PlayerSlot = ({ player, label, role, accentColor, isWaiting }) => (
    <div style={{
      background: 'rgba(5, 12, 4, 0.7)',
      border: `2px solid ${isWaiting ? 'rgba(255,255,255,0.1)' : accentColor + '55'}`,
      borderTop: isWaiting ? '2px solid rgba(255,255,255,0.1)' : `3px solid ${accentColor}`,
      borderRadius: 5,
      padding: '18px 14px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 8 }}>
        {isWaiting ? (
          <div style={{ width: 48, height: 48, margin: '0 auto', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 22 }}>?</span>
          </div>
        ) : (
          <img
            src={role === 'PLANT' ? '/assets/Cards/card_sunflower.png' : '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png'}
            alt={role}
            style={{ width: 48, height: 48, objectFit: 'contain', imageRendering: 'pixelated' }}
          />
        )}
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#fce8c4', marginBottom: 3 }}>
        {player?.name || 'Waiting for Friend...'}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(160,145,120,0.6)', marginBottom: 8 }}>
        {isWaiting ? 'Share code above' : label}
      </div>
      {!isWaiting && (
        <div style={{
          display: 'inline-block',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '2px 10px', borderRadius: 3,
          color: player?.ready ? '#5aaa2a' : '#c09040',
          border: `1px solid ${player?.ready ? '#5aaa2a44' : '#c0904044'}`,
          background: player?.ready ? 'rgba(90,170,42,0.1)' : 'rgba(192,144,64,0.1)',
        }}>
          {player?.ready ? 'Ready' : 'Not Ready'}
        </div>
      )}
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div style={{
        width: 520, maxWidth: '94vw',
        background: 'rgba(8, 16, 7, 0.97)',
        border: '2px solid rgba(80, 130, 40, 0.5)',
        borderTop: '3px solid rgba(100, 170, 50, 0.7)',
        borderRadius: 6,
        padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        animation: 'slide-up 0.2s ease',
      }}>
        {!activeRoom ? (
          /* ---- ROOM SETUP ---- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fce8c4', marginBottom: 3 }}>
                  Play With a Friend
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(160,145,120,0.65)' }}>Private room — no matchmaking queue</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(180,160,130,0.4)', cursor: 'pointer', fontSize: 18, padding: 4 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fce8c4'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(180,160,130,0.4)'}
              >✕</button>
            </div>

            {/* Tab toggles */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(80,130,40,0.2)', marginBottom: 22 }}>
              {['create', 'join'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #5aaa2a' : '2px solid transparent',
                    color: tab === t ? '#fce8c4' : 'rgba(160,145,120,0.5)',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '8px 18px', cursor: 'pointer',
                    marginBottom: -1, transition: 'color 0.1s, border-color 0.1s',
                  }}
                >
                  {t === 'create' ? 'Create Room' : 'Join by Code'}
                </button>
              ))}
            </div>

            <ErrorBlock />

            {tab === 'create' ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(160,145,120,0.65)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  Generate an authoritative private match room on the C++ server.<br />
                  Share the 6-character code with your opponent to begin.
                </p>
                <button
                  className="pvz-btn"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14 }}
                  onClick={handleCreate}
                >
                  {loading ? 'Generating Room...' : 'Generate Private Room Code'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: 'block', marginBottom: 8,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'rgba(130,190,80,0.8)',
                  }}>
                    6-Character Room Code
                  </label>
                  <input
                    className="pvz-input"
                    type="text"
                    maxLength={6}
                    required
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GARD42"
                    style={{ fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', fontWeight: 700, color: '#ffd060' }}
                  />
                </div>
                <button
                  type="submit"
                  className="pvz-btn"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14 }}
                >
                  {loading ? 'Joining Room...' : 'Enter Friend Room'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ---- PRE-GAME LOBBY ---- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fce8c4', marginBottom: 3 }}>
                  Tactical Waiting Room
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(160,145,120,0.5)' }}>Both players must be ready to start</p>
              </div>
              <button
                className="pvz-btn pvz-btn-danger"
                style={{ padding: '7px 14px', fontSize: 12 }}
                onClick={() => setActiveRoom(null)}
              >
                Leave
              </button>
            </div>

            {/* Room code badge */}
            <div style={{
              background: 'rgba(5, 12, 4, 0.8)',
              border: '1px dashed rgba(90, 170, 42, 0.4)',
              borderRadius: 5,
              padding: '14px 18px',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(130,180,80,0.5)',
                marginBottom: 6,
              }}>
                Private Room Code
              </div>
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 34, fontWeight: 700,
                color: '#ffd060', letterSpacing: '0.3em',
                marginBottom: 10,
              }}>
                {activeRoom.code}
              </div>
              <button
                className="pvz-btn pvz-btn-wood"
                style={{ padding: '7px 16px', fontSize: 12 }}
                onClick={copyRoomCode}
              >
                {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy Code</>}
              </button>
            </div>

            {/* Player slots */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <PlayerSlot
                player={activeRoom.p1}
                label="Plant Commander · Host"
                role="PLANT"
                accentColor="#5aaa2a"
                isWaiting={false}
              />
              <PlayerSlot
                player={activeRoom.p2?.name ? activeRoom.p2 : null}
                label="Zombie General · Guest"
                role="ZOMBIE"
                accentColor="#c03028"
                isWaiting={!activeRoom.p2?.name}
              />
            </div>

            <ErrorBlock />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="pvz-btn pvz-btn-wood"
                style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
                onClick={handleToggleReady}
              >
                Toggle Ready
              </button>
              {activeRoom.p1?.name === (user?.display_name || user?.username) && (
                <button
                  className="pvz-btn"
                  style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
                  onClick={handleStartMatch}
                  disabled={!activeRoom.p2?.ready}
                >
                  Start Match
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
