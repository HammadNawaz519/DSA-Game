import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

export default function MatchmakingModal({ isOpen, onClose, onMatchFound }) {
  const { user } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const [matchedData, setMatchedData] = useState(null);
  const [vsCountdown, setVsCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      setMatchedData(null);
      setVsCountdown(3);
      return;
    }

    const startQueue = async () => {
      try {
        await fetch(`${API_BASE}/api/matchmaking/queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id || 1001,
            username: user?.display_name || user?.username || 'Commander',
            elo: user?.elo || 1000,
            mode: 1,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    };

    startQueue();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/matchmaking/status?user_id=${user?.id || 1001}`);
        if (res.ok) {
          const data = await res.json();
          if (data.matched) {
            setMatchedData(data);
            clearInterval(interval);
          } else {
            setElapsed(data.elapsed_sec || 0);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, user]);

  useEffect(() => {
    if (!matchedData) return;
    if (vsCountdown > 0) {
      const t = setTimeout(() => setVsCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      onMatchFound(matchedData.room_id, matchedData.role);
    }
  }, [matchedData, vsCountdown]);

  const handleCancel = async () => {
    try {
      await fetch(`${API_BASE}/api/matchmaking/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id || 1001 }),
      });
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      {!matchedData ? (
        /* ---- SEARCHING STATE ---- */
        <div style={{
          width: 420, maxWidth: '92vw',
          background: 'rgba(8, 16, 7, 0.97)',
          border: '2px solid rgba(80, 130, 40, 0.5)',
          borderRadius: 6,
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          animation: 'slide-up 0.2s ease',
        }}>
          {/* CSS-based radar spinner */}
          <div style={{
            width: 100, height: 100, margin: '0 auto 24px',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Outer ring */}
            <div style={{
              position: 'absolute', inset: 0,
              border: '2px solid rgba(90,170,42,0.3)',
              borderRadius: '50%',
            }} />
            {/* Middle ring */}
            <div style={{
              position: 'absolute', top: 12, left: 12, right: 12, bottom: 12,
              border: '1.5px solid rgba(90,170,42,0.2)',
              borderRadius: '50%',
            }} />
            {/* Inner ring */}
            <div style={{
              position: 'absolute', top: 24, left: 24, right: 24, bottom: 24,
              border: '1.5px solid rgba(90,170,42,0.3)',
              borderRadius: '50%',
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 5, height: 5,
              background: '#5aaa2a',
              borderRadius: '50%',
            }} />
            {/* Rotating sweep line */}
            <div style={{
              position: 'absolute', inset: 0,
              border: '2px solid transparent',
              borderTopColor: '#5aaa2a',
              borderRadius: '50%',
              animation: 'spin 1.4s linear infinite',
            }} />
          </div>

          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 22,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: '#fce8c4', marginBottom: 6,
          }}>
            Finding Opponent
          </h2>
          <p style={{ color: 'rgba(160,145,120,0.65)', fontSize: 13, marginBottom: 24 }}>
            ELO range: ±{100 + elapsed * 25} &nbsp;·&nbsp; Searching: {elapsed}s
          </p>

          {/* Player card */}
          <div style={{
            background: 'rgba(5, 12, 4, 0.7)',
            border: '1px solid rgba(80, 130, 40, 0.3)',
            borderRadius: 5,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 24, textAlign: 'left',
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              border: '2px solid rgba(130, 180, 80, 0.5)',
              overflow: 'hidden', background: '#0e1a08', flexShrink: 0,
            }}>
              <img src="/assets/Cards/card_sunflower.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#fce8c4' }}>
                {user?.display_name || 'Commander'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(130, 190, 80, 0.7)' }}>
                Rating: {user?.elo || 1000} ELO
              </div>
            </div>
          </div>

          <button
            className="pvz-btn pvz-btn-danger"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 13 }}
            onClick={handleCancel}
          >
            Cancel Search
          </button>
        </div>
      ) : (
        /* ---- MATCH FOUND — VS SCREEN ---- */
        <div style={{
          width: 760, maxWidth: '96vw',
          textAlign: 'center',
          animation: 'slide-up 0.25s ease',
        }}>
          {/* MATCH FOUND title */}
          <div className="game-title" style={{
            fontSize: 42, color: '#ffd060',
            textShadow: '0 0 30px rgba(255, 208, 60, 0.4)',
            marginBottom: 28,
            letterSpacing: '0.08em',
          }}>
            Match Found
          </div>

          {/* VS layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 1fr',
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Player card — You */}
            <div style={{
              background: 'rgba(8, 16, 7, 0.95)',
              border: '2px solid rgba(90, 170, 42, 0.6)',
              borderTop: '3px solid #5aaa2a',
              borderRadius: 6,
              padding: '28px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <img
                src={matchedData.role === 'PLANT' ? '/assets/Cards/card_peashooter.png' : '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png'}
                alt={matchedData.role}
                style={{ width: 60, height: 60, objectFit: 'contain', imageRendering: 'pixelated', opacity: 0.9 }}
              />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#fce8c4' }}>
                {user?.display_name || 'You'}
              </div>
              <div style={{ fontSize: 13, color: '#5aaa2a' }}>{user?.elo || 1000} ELO</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: matchedData.role === 'PLANT' ? '#5aaa2a' : '#c05050',
                border: `1px solid ${matchedData.role === 'PLANT' ? '#5aaa2a44' : '#c0505044'}`,
                borderRadius: 3, padding: '3px 10px',
              }}>
                {matchedData.role === 'PLANT' ? 'Plant Commander' : 'Zombie General'}
              </div>
            </div>

            {/* VS + countdown */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 32, fontWeight: 900,
                color: '#c03028',
                textShadow: '0 0 20px rgba(192, 48, 40, 0.6)',
                lineHeight: 1,
                marginBottom: 14,
              }}>
                VS
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 48, fontWeight: 700,
                color: '#ffffff',
                animation: 'countdown-pop 1s ease-in-out',
                key: vsCountdown,
              }}>
                {vsCountdown}
              </div>
            </div>

            {/* Opponent card */}
            <div style={{
              background: 'rgba(8, 16, 7, 0.95)',
              border: '2px solid rgba(192, 60, 60, 0.5)',
              borderTop: '3px solid #c03028',
              borderRadius: 6,
              padding: '28px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <img
                src={matchedData.role === 'PLANT' ? '/assets/Zombies/NormalZombie/Zombie/Zombie_0.png' : '/assets/Cards/card_peashooter.png'}
                alt={matchedData.role === 'PLANT' ? 'Zombie' : 'Plant'}
                style={{ width: 60, height: 60, objectFit: 'contain', imageRendering: 'pixelated', opacity: 0.9 }}
              />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#fce8c4' }}>
                {matchedData.opponent}
              </div>
              <div style={{ fontSize: 13, color: '#c05050' }}>{matchedData.opponent_elo} ELO</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: matchedData.role !== 'PLANT' ? '#5aaa2a' : '#c05050',
                border: `1px solid ${matchedData.role !== 'PLANT' ? '#5aaa2a44' : '#c0505044'}`,
                borderRadius: 3, padding: '3px 10px',
              }}>
                {matchedData.role === 'PLANT' ? 'Zombie General' : 'Plant Commander'}
              </div>
            </div>
          </div>

          <p style={{ marginTop: 20, color: 'rgba(160,145,120,0.5)', fontSize: 13 }}>
            Battle starts in {vsCountdown} second{vsCountdown !== 1 ? 's' : ''}...
          </p>
        </div>
      )}
    </div>
  );
}