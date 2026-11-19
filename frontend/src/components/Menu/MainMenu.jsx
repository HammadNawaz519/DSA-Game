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

/* SVG icons — clean, functional, no emojis */
const SvgSword = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="3" x2="3" y2="17"/><path d="M14 6l4 4"/>
    <path d="M3 21l3-3"/><path d="M14 14l-4 4"/>
  </svg>
);

const SvgUsers = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    <circle cx="17" cy="9" r="3"/><path d="M23 21v-1a3 3 0 0 0-3-3h-2"/>
  </svg>
);

const SvgBot = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V5"/><circle cx="12" cy="4" r="1"/>
    <line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);

const SvgShield = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const SvgTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H2V4h4"/><path d="M18 9h4V4h-4"/>
    <path d="M12 17v4"/><path d="M8 21h8"/>
    <path d="M18 4H6v5a6 6 0 0 0 12 0V4z"/>
  </svg>
);

const SvgBook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const SvgUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const SvgSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const MODES = [
  {
    id: 'online',
    icon: <SvgSword />,
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
    icon: <SvgUsers />,
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
    icon: <SvgBot />,
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
    icon: <SvgShield />,
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
        padding: '16px 28px',
        borderBottom: '1px solid rgba(80, 130, 40, 0.25)',
        background: 'rgba(7, 16, 6, 0.75)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Emblem & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/assets/Cards/card_sunflower.png"
            alt="PvZ"
            style={{ width: 42, height: 42, objectFit: 'contain', imageRendering: 'pixelated' }}
          />
          <div>
            <div className="game-title" style={{ fontSize: 20, color: '#ffd060', lineHeight: 1.1 }}>
              Tactical Warfare
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
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
                fontWeight: 700, fontSize: 15, color: '#fce8c4',
              }}>
                {user.display_name}
              </div>
              <div className={`game-label ${rank.cls}`} style={{ fontSize: 11 }}>
                {rank.title} &nbsp;&middot;&nbsp; {user.elo} ELO
              </div>
            </div>

            <div style={{
              width: 38, height: 38, borderRadius: '50%',
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
                <SvgSettings /> Admin
              </button>
            )}
            <button className="pvz-btn pvz-btn-wood" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => onNavigate('profile')}>
              <SvgUser /> Career
            </button>
            <button className="pvz-btn pvz-btn-danger" style={{ padding: '6px 12px', fontSize: 11 }} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="pvz-btn" style={{ fontSize: 13, padding: '9px 20px' }} onClick={onOpenAuth}>
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
        padding: '0 24px',
        gap: 20,
      }}>
        {/* Title header */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="game-title" style={{ fontSize: 32, color: '#fce8c4', marginBottom: 4, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            Battle Arena
          </h1>
          <p style={{
            color: 'rgba(180, 165, 140, 0.7)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
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
          gap: 16,
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
                padding: '22px 18px 18px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: mode.featured ? '0 10px 28px rgba(0,0,0,0.8), 0 0 0 1px rgba(90,170,42,0.3)' : '0 6px 20px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)',
                overflow: 'hidden',
                minHeight: 220,
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
                  width: 95,
                  opacity: 0.12,
                  pointerEvents: 'none',
                }}
              />

              {/* Top row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  {mode.icon}
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
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
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#fce8c4',
                  marginBottom: 6,
                }}>
                  {mode.title}
                </h2>
                <p style={{
                  fontSize: 12,
                  color: 'rgba(180, 165, 140, 0.75)',
                  lineHeight: 1.5,
                }}>
                  {mode.desc}
                </p>
              </div>

              {/* Action Button */}
              <button
                className={mode.btnClass}
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px', marginTop: 14 }}
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
        gap: 12,
        padding: '14px 28px',
        borderTop: '1px solid rgba(80, 130, 40, 0.25)',
        background: 'rgba(7, 16, 6, 0.8)',
        backdropFilter: 'blur(8px)',
      }}>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('leaderboard')}>
          <SvgTrophy /> Leaderboard
        </button>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('almanac')}>
          <SvgBook /> Garden Almanac
        </button>
        <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('profile')}>
          <SvgUser /> Career Stats
        </button>
        {user?.is_admin && (
          <button className="pvz-btn pvz-btn-danger" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('admin')}>
            <SvgSettings /> Mission Control
          </button>
        )}
      </div>
    </div>
  );
}
