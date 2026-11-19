import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../context/AuthContext';

function getRankStyle(idx) {
  if (idx === 0) return { color: '#ffd700', label: '#1' };
  if (idx === 1) return { color: '#c0c0c0', label: '#2' };
  if (idx === 2) return { color: '#cd7f32', label: '#3' };
  return { color: 'rgba(180,160,130,0.5)', label: `#${idx + 1}` };
}

function getRankRowClass(idx) {
  if (idx === 0) return 'lb-gold';
  if (idx === 1) return 'lb-silver';
  if (idx === 2) return 'lb-bronze';
  return '';
}

function getRankTitle(elo) {
  if (!elo || elo < 1000) return 'Seedling';
  if (elo >= 1400) return 'Grandmaster';
  if (elo >= 1200) return 'Diamond';
  if (elo >= 1100) return 'Gold';
  return 'Silver';
}

export default function LeaderboardPage({ onNavigate }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        if (res.ok) setLeaders(await res.json());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(8, 16, 7, 1)',
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '36px 20px',
    }}>
      {/* Faint background */}
      <img
        src="/assets/Items/Background/Background_0.jpg"
        alt=""
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 820 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 className="game-title" style={{ fontSize: 28, color: '#fce8c4', marginBottom: 4 }}>
              Global Leaderboard
            </h1>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(130,180,80,0.6)',
            }}>
              Powered by Student AVL-Tree Self-Balancing Engine
            </p>
          </div>
          <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('menu')}>
            Back to Menu
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: 'rgba(8, 16, 7, 0.92)',
          border: '2px solid rgba(80, 130, 40, 0.3)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(160,145,120,0.5)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
              Loading rankings...
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(160,145,120,0.4)', fontSize: 14, lineHeight: 1.7 }}>
              No matches recorded yet.<br />
              Play a match to climb the ranks.
            </div>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 56, textAlign: 'center' }}>Rank</th>
                  <th>Player</th>
                  <th>Tier</th>
                  <th>Rating</th>
                  <th>Wins</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((p, idx) => {
                  const rs = getRankStyle(idx);
                  return (
                    <tr key={p.user_id} className={getRankRowClass(idx)}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="lb-rank-num" style={{ color: rs.color }}>
                          {rs.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#fce8c4' }}>{p.display_name}</td>
                      <td>
                        <span style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                          color: 'rgba(130,190,80,0.7)',
                        }}>
                          {getRankTitle(p.elo)}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#ffd060' }}>
                        {p.elo}
                      </td>
                      <td style={{ color: '#5aaa2a', fontWeight: 600 }}>{p.wins}</td>
                      <td style={{ color: 'rgba(180,160,130,0.6)' }}>{p.matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
