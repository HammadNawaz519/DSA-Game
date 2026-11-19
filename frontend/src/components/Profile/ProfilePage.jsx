import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../../context/AuthContext';

function getRankInfo(elo) {
  if (!elo || elo < 1000) return { title: 'Seedling Recruit', cls: 'rank-seedling' };
  if (elo >= 1400) return { title: 'Grandmaster Florist', cls: 'rank-grandmaster' };
  if (elo >= 1200) return { title: 'Diamond Guardian', cls: 'rank-diamond' };
  if (elo >= 1100) return { title: 'Gold Defender', cls: 'rank-gold' };
  return { title: 'Silver Sentinel', cls: 'rank-silver' };
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(5, 12, 4, 0.7)',
      border: '1px solid rgba(80, 130, 40, 0.2)',
      borderRadius: 5,
      padding: '14px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(140,180,90,0.6)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || '#fce8c4' }}>
        {value}
      </div>
    </div>
  );
}

export default function ProfilePage({ onNavigate }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    setProfile({
      user_id: user?.id || 1001,
      username: user?.username || 'Player',
      display_name: user?.display_name || 'Player',
      elo: user?.elo || 1000,
      wins: 12, losses: 4, draws: 1,
      total_matches: 17,
      win_percentage: '70.6%',
      pvp_wins: 9, coop_wins: 3,
      history: [
        { match_id: 'M-102', mode: '1v1 PvP', role: 'Plant', result: 'VICTORY', elo_change: '+25', time: '10 mins ago' },
        { match_id: 'M-101', mode: '1v1 PvP', role: 'Zombie', result: 'DEFEAT', elo_change: '-18', time: '2 hours ago' },
        { match_id: 'M-100', mode: 'Co-op', role: 'Defender', result: 'VICTORY', elo_change: '+15', time: 'Yesterday' },
      ],
    });
  }, [user]);

  if (!profile) return null;

  const rank = getRankInfo(profile.elo);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(8, 16, 7, 1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '36px 20px',
      position: 'relative',
    }}>
      {/* Background */}
      <img
        src="/assets/Items/Background/Background_0.jpg"
        alt=""
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 820 }}>
        {/* Nav header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 className="game-title" style={{ fontSize: 28, color: '#fce8c4', marginBottom: 4 }}>Career Profile</h1>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(130,180,80,0.6)' }}>
              Powered by Skip-List Match History
            </p>
          </div>
          <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('menu')}>
            Back to Menu
          </button>
        </div>

        {/* Profile identity */}
        <div style={{
          background: 'rgba(8, 16, 7, 0.92)',
          border: '2px solid rgba(80, 130, 40, 0.3)',
          borderRadius: 6, padding: '22px 24px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '2px solid rgba(130, 180, 80, 0.5)',
            overflow: 'hidden', background: '#0e1a08', flexShrink: 0,
          }}>
            <img src="/assets/Cards/card_sunflower.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Identity */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#fce8c4', marginBottom: 3 }}>
              {profile.display_name}
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`game-label ${rank.cls}`} style={{ fontSize: 12 }}>{rank.title}</span>
              <span style={{ color: 'rgba(160,145,120,0.4)', fontSize: 12 }}>·</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#ffd060' }}>
                {profile.elo} ELO
              </span>
              <span style={{ color: 'rgba(160,145,120,0.4)', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: 'rgba(160,145,120,0.5)' }}>ID #{profile.user_id}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Matches" value={profile.total_matches} />
          <StatBox label="Victories" value={profile.wins} color="#5aaa2a" />
          <StatBox label="Defeats" value={profile.losses} color="#b53028" />
          <StatBox label="Win Rate" value={profile.win_percentage} color="#ffd060" />
        </div>

        {/* Match History */}
        <div style={{
          background: 'rgba(8, 16, 7, 0.92)',
          border: '2px solid rgba(80, 130, 40, 0.3)',
          borderRadius: 6, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(80, 130, 40, 0.2)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 13,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(130, 180, 80, 0.8)',
          }}>
            Match History
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.history.map((m) => (
              <div
                key={m.match_id}
                className={`match-row ${m.result === 'VICTORY' ? 'victory' : 'defeat'}`}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 12,
                    color: 'rgba(160,145,120,0.5)',
                  }}>
                    {m.match_id}
                  </span>
                  <span style={{ fontSize: 13, color: '#fce8c4' }}>{m.mode}</span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, color: 'rgba(160,145,120,0.5)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {m.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 14,
                    color: m.result === 'VICTORY' ? '#5aaa2a' : '#b53028',
                  }}>
                    {m.result}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 13,
                    color: m.elo_change.startsWith('+') ? '#5aaa2a' : '#b53028',
                  }}>
                    {m.elo_change} ELO
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(160,145,120,0.4)' }}>{m.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
