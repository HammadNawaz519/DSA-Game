import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

export default function Lobby({ onNavigate, onStartGame }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMode, setSelectedMode] = useState(1); // 1 = PvP, 2 = Coop
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          host_name: user?.display_name || 'Player1',
          host_id: user?.id || 1001,
          mode: selectedMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onStartGame(data.room_id, 'PLANT', selectedMode);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (e) {
      setError('Connection error');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (roomId, mode) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          guest_name: user?.display_name || 'GuestPlayer',
          guest_id: user?.id || 1002,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onStartGame(roomId, mode === 1 ? 'ZOMBIE' : 'COOP_PARTNER', mode);
      } else {
        setError(data.error || 'Room unavailable');
      }
    } catch (e) {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(8, 16, 7, 1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 20px',
      position: 'relative',
    }}>
      <img
        src="/assets/Items/Background/Background_0.jpg"
        alt=""
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <h1 className="game-title" style={{ fontSize: 26, color: '#fce8c4', marginBottom: 4 }}>
              Multiplayer Battle Lobby
            </h1>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(130,180,80,0.6)',
            }}>
              Browse open custom games or host your own tactical match
            </p>
          </div>
          <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('menu')}>
            ← Back to Menu
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(181, 48, 40, 0.15)',
            border: '1px solid rgba(181, 48, 40, 0.5)',
            borderRadius: 4, padding: '10px 14px',
            marginBottom: 20, fontSize: 12, color: '#ff9b8a',
          }}>
            <span style={{fontWeight: 'bold'}}>!</span>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Create Room Box */}
          <div style={{
            background: 'rgba(8, 16, 7, 0.92)',
            border: '2px solid rgba(80, 130, 40, 0.3)',
            borderRadius: 6, padding: '20px 22px',
          }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: '#fce8c4', marginBottom: 16,
            }}>
              Host Match Room
            </h2>
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', marginBottom: 5,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(130,190,80,0.8)',
                }}>
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  className="pvz-input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Tactical Lawn Alpha"
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', marginBottom: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(130,190,80,0.8)',
                }}>
                  Game Mode
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedMode(1)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 4,
                      background: selectedMode === 1 ? 'rgba(90,170,42,0.2)' : 'rgba(5,12,4,0.7)',
                      border: `1px solid ${selectedMode === 1 ? '#5aaa2a' : 'rgba(80,130,40,0.3)'}`,
                      color: selectedMode === 1 ? '#fce8c4' : 'rgba(180,160,130,0.6)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    1v1 PvP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode(2)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 4,
                      background: selectedMode === 2 ? 'rgba(90,170,42,0.2)' : 'rgba(5,12,4,0.7)',
                      border: `1px solid ${selectedMode === 2 ? '#5aaa2a' : 'rgba(80,130,40,0.3)'}`,
                      color: selectedMode === 2 ? '#fce8c4' : 'rgba(180,160,130,0.6)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    2-Player Co-op
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="pvz-btn"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}
              >
                {loading ? 'Creating...' : 'Create & Host Room'}
              </button>
            </form>
          </div>

          {/* Active Rooms Box */}
          <div style={{
            background: 'rgba(8, 16, 7, 0.92)',
            border: '2px solid rgba(80, 130, 40, 0.3)',
            borderRadius: 6, padding: '20px 22px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: '#fce8c4',
              }}>
                Active Rooms ({rooms.length})
              </h2>
              <button
                className="pvz-btn pvz-btn-wood"
                style={{ padding: '6px 12px', fontSize: 11 }}
                onClick={fetchRooms}
              >
                ↻ Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxHeight: 340, overflowY: 'auto' }}>
              {rooms.length === 0 ? (
                <div style={{
                  padding: '40px 16px', textAlign: 'center',
                  color: 'rgba(160,145,120,0.4)', fontSize: 13,
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em',
                }}>
                  No active rooms found. Host a new game!
                </div>
              ) : (
                rooms.map((r) => (
                  <div key={r.id} style={{
                    background: 'rgba(5, 12, 4, 0.7)',
                    border: '1px solid rgba(80, 130, 40, 0.25)',
                    borderRadius: 4, padding: '12px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#fce8c4' }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(160,145,120,0.6)', marginTop: 2 }}>
                        Host: {r.p1} &nbsp;·&nbsp; {r.p2 ? 'Occupied (2/2)' : 'Waiting (1/2)'}
                      </div>
                    </div>
                    <div>
                      {r.p2 ? (
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: '#b53028',
                        }}>
                          In Progress
                        </span>
                      ) : (
                        <button
                          className="pvz-btn"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => handleJoinRoom(r.id, 1)}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}