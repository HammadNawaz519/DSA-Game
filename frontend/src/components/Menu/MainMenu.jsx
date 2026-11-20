import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lobby3DScene } from '../../engine/Lobby3DScene';

function getRank(elo) {
  if (!elo || elo < 1000) return { title: 'Seedling Recruit',   cls: 'rank-seedling'    };
  if (elo >= 1400)        return { title: 'Grandmaster Florist', cls: 'rank-grandmaster' };
  if (elo >= 1200)        return { title: 'Diamond Guardian',    cls: 'rank-diamond'     };
  if (elo >= 1100)        return { title: 'Gold Defender',       cls: 'rank-gold'        };
  return                         { title: 'Silver Sentinel',     cls: 'rank-silver'      };
}

const MODES = [
  {
    id: 'online',
    title: 'Play Online',
    sub: 'Ranked 1v1',
    desc: 'Match against live opponents in authoritative competitive combat.',
    btnLabel: 'Battle',
    btnClass: 'pvz-btn',
    accentColor: '#5aaa2a',
    cardAsset: '/assets/Cards/card_peashooter.png',
    featured: true,
  },
  {
    id: 'friend',
    title: 'Play With Friend',
    sub: 'Private Room',
    desc: 'Duel directly using a private 6-character match code.',
    btnLabel: 'Private Duel',
    btnClass: 'pvz-btn pvz-btn-wood',
    accentColor: '#b8860b',
    cardAsset: '/assets/Cards/card_sunflower.png',
  },
  {
    id: 'ai',
    title: 'Practice vs AI',
    sub: 'Solo Training',
    desc: 'Hone defensive builds against server wave simulations.',
    btnLabel: 'Train',
    btnClass: 'pvz-btn pvz-btn-blue',
    accentColor: '#2a6fa8',
    cardAsset: '/assets/Cards/card_snowpea.png',
  },
  {
    id: 'coop',
    title: 'Co-op Survival',
    sub: 'Alliance',
    desc: '2-Player alliance defending against coordinated onslaughts.',
    btnLabel: 'Alliance',
    btnClass: 'pvz-btn pvz-btn-wood',
    accentColor: '#7a3ea8',
    cardAsset: '/assets/Cards/card_wallnut.png',
  },
];

export default function MainMenu({
  onNavigate,
  onOpenAuth,
  onOpenMatchmaking,
  onOpenPrivateRoom,
  onStartPracticeAI,
}) {
  const { user, logout } = useAuth();
  const rank = getRank(user?.elo || 1000);
  const mountRef = useRef(null);
  const lobby3DRef = useRef(null);

  // Initialize animated 3D lobby scene
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new Lobby3DScene(mountRef.current);
    lobby3DRef.current = scene;

    const handleResize = () => scene.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.destroy();
    };
  }, []);

  const handleMode = (id) => {
    if (!user) { onOpenAuth(); return; }
    if (id === 'online') onOpenMatchmaking();
    else if (id === 'friend') onOpenPrivateRoom();
    else if (id === 'ai') onStartPracticeAI(user);
    else if (id === 'coop') onNavigate('lobby');
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* 3D Background Canvas Viewport */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Atmospheric lighting vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, rgba(7, 17, 6, 0.45) 0%, rgba(7, 17, 6, 0.88) 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* ---- TOP BAR ---- */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        borderBottom: '1px solid rgba(80, 130, 40, 0.25)',
        background: 'rgba(7, 16, 6, 0.75)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Emblem & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/assets/Cards/card_sunflower.png"
            alt="PvZ"
            style={{ width: 40, height: 40, objectFit: 'contain', imageRendering: 'pixelated' }}
          />
          <div>
            <div className="game-title" style={{ fontSize: 18, color: '#ffd060', lineHeight: 1.1 }}>
              Tactical Warfare
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              color: 'rgba(130, 180, 80, 0.7)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Plants vs Zombies — Tactical Strategy
            </div>
          </div>
        </div>

        {/* User Identity / Auth */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', marginRight: 4 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 14, color: '#fce8c4',
              }}>
                {user.display_name}
              </div>
              <div className={`game-label ${rank.cls}`} style={{ fontSize: 10 }}>
                {rank.title} &nbsp;·&nbsp; {user.elo} ELO
              </div>
            </div>

            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px solid rgba(130, 180, 80, 0.6)',
              overflow: 'hidden', background: '#0e1a08',
              flexShrink: 0,
            }}>
              <img
                src="/assets/Cards/card_sunflower.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {user.is_admin && (
              <button className="pvz-btn pvz-btn-danger" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => onNavigate('admin')}>
                ⚙ Admin
              </button>
            )}
            <button className="pvz-btn pvz-btn-wood" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => onNavigate('profile')}>
              👤 Career
            </button>
            <button className="pvz-btn pvz-btn-danger" style={{ padding: '6px 12px', fontSize: 11 }} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="pvz-btn" style={{ fontSize: 12, padding: '8px 18px' }} onClick={onOpenAuth}>
            Sign In / Register
          </button>
        )}
      </div>

      {/* ---- CENTER GAME MODE PANELS ---- */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
      }}>
        {/* Title header */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="game-title" style={{ fontSize: 28, color: '#fce8c4', marginBottom: 4, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            Battle Arena
          </h1>
          <p style={{
            color: 'rgba(180, 165, 140, 0.7)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Select a battle operation to deploy onto the 3D lawn
          </p>
        </div>

        {/* 4 Mode Cards (Clash Royale / 8 Ball Pool Style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          width: '100%',
          maxWidth: 1040,
        }}>
          {MODES.map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleMode(mode.id)}
              style={{
                position: 'relative',
                background: mode.featured ? 'rgba(12, 26, 10, 0.94)' : 'rgba(8, 17, 7, 0.92)',
                border: `2px solid ${mode.accentColor}55`,
                borderTop: `3px solid ${mode.accentColor}`,
                borderRadius: 6,
                padding: '20px 16px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: mode.featured ? '0 10px 28px rgba(0,0,0,0.8), 0 0 0 1px rgba(90,170,42,0.3)' : '0 6px 20px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)',
                overflow: 'hidden',
                minHeight: 200,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = mode.accentColor;
                e.currentTarget.style.boxShadow = `0 14px 34px rgba(0,0,0,0.85), 0 0 16px ${mode.accentColor}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${mode.accentColor}55`;
                e.currentTarget.style.boxShadow = mode.featured ? '0 10px 28px rgba(0,0,0,0.8), 0 0 0 1px rgba(90,170,42,0.3)' : '0 6px 20px rgba(0,0,0,0.7)';
              }}
            >
              {/* Plant card preview watermark */}
              <img
                src={mode.cardAsset}
                alt=""
                style={{
                  position: 'absolute',
                  right: -10,
                  bottom: -10,
                  width: 90,
                  opacity: 0.12,
                  pointerEvents: 'none',
                }}
              />

              {/* Top row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 24,
                    fontWeight: 700,
                    color: mode.accentColor,
                  }}>
                    {mode.id === 'online' && '⚔'}
                    {mode.id === 'friend' && '🤝'}
                    {mode.id === 'ai' && '🤖'}
                    {mode.id === 'coop' && '🛡'}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: mode.accentColor,
                    border: `1px solid ${mode.accentColor}55`,
                    borderRadius: 3,
                    padding: '2px 8px',
                    background: `${mode.accentColor}18`,
                  }}>
                    {mode.sub}
                  </span>
                </div>

                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#fce8c4',
                  marginBottom: 6,
                }}>
                  {mode.title}
                </h2>
                <p style={{
                  fontSize: 11,
                  color: 'rgba(180, 165, 140, 0.75)',
                  lineHeight: 1.5,
                }}>
                  {mode.desc}
                </p>
              </div>

              {/* Action Button */}
              <button
                className={mode.btnClass}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '10px', marginTop: 12 }}
                onClick={(e) => { e.stopPropagation(); handleMode(mode.id); }}
              >
                {mode.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- BOTTOM DOCK ---- */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        padding: '12px 24px',
        borderTop: '1px solid rgba(80, 130, 40, 0.25)',
        background: 'rgba(7, 16, 6, 0.8)',
        backdropFilter: 'blur(8px)',
      }}>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 16px', fontSize: 11 }} onClick={() => onNavigate('leaderboard')}>
          🏆 Leaderboard
        </button>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 16px', fontSize: 11 }} onClick={() => onNavigate('almanac')}>
          📖 Garden Almanac
        </button>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 16px', fontSize: 11 }} onClick={() => onNavigate('profile')}>
          📊 Career Stats
        </button>
        {user?.is_admin && (
          <button className="pvz-btn pvz-btn-danger" style={{ padding: '8px 16px', fontSize: 11 }} onClick={() => onNavigate('admin')}>
            ⚙ Mission Control
          </button>
        )}
      </div>
    </div>
  );
}