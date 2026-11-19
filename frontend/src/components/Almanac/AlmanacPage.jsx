import React, { useState } from 'react';

const PLANT_CARDS = [
  { name: 'Peashooter',   img: '/assets/Cards/card_peashooter.png',  role: 'Offense',   desc: 'Standard attacker. Fires peas at incoming zombies at regular intervals.' },
  { name: 'Sunflower',    img: '/assets/Cards/card_sunflower.png',   role: 'Economy',   desc: 'Generates Sun resources over time. Essential for sustaining your defense.' },
  { name: 'Wall-nut',     img: '/assets/Cards/card_wallnut.png',     role: 'Defense',   desc: 'High-HP barrier. Absorbs massive amounts of zombie damage.' },
  { name: 'Cherry Bomb',  img: '/assets/Cards/card_cherrybomb.png',  role: 'Explosive', desc: '3x3 area explosive triggered instantly. Destroys all zombies in radius.' },
  { name: 'Snow Pea',     img: '/assets/Cards/card_snowpea.png',     role: 'Support',   desc: 'Fires frozen peas that slow zombie movement speed by 50%.' },
  { name: 'Repeater',     img: '/assets/Cards/card_repeaterpea.png', role: 'Offense',   desc: 'Fires two peas simultaneously. Double the DPS of standard Peashooter.' },
  { name: 'Spikeweed',    img: '/assets/Cards/card_spikeweed.png',   role: 'Trap',      desc: 'Ground trap that damages zombies walking over it. No sun generation needed.' },
  { name: 'Three-Peater', img: '/assets/Cards/card_threepeashooter.png', role: 'AoE',  desc: 'Fires peas in three lanes simultaneously. Excellent crowd control.' },
];

const TRAVERSAL_LABELS = {
  level_order: 'Level Order (BFS)',
  pre_order:   'Pre-Order (Root → Left → Right)',
  in_order:    'In-Order (Left → Root → Right)',
  post_order:  'Post-Order (Left → Right → Root)',
};

const ALMANAC_DATA = {
  pre_order:   ['Flora Hierarchy [Root]','Peashooter [Offense]','Sunflower [Economy]','Wall-nut [Defense]','Cherry Bomb [Explosive]','Snow Pea [Support]'],
  in_order:    ['Cherry Bomb [Explosive]','Peashooter [Offense]','Sunflower [Economy]','Flora Hierarchy [Root]','Snow Pea [Support]','Wall-nut [Defense]'],
  post_order:  ['Cherry Bomb [Explosive]','Sunflower [Economy]','Peashooter [Offense]','Snow Pea [Support]','Wall-nut [Defense]','Flora Hierarchy [Root]'],
  level_order: ['Flora Hierarchy [Root]','Peashooter [Offense]','Wall-nut [Defense]','Sunflower [Economy]','Snow Pea [Support]','Cherry Bomb [Explosive]'],
};

const ROLE_COLORS = {
  Offense: '#5aaa2a', Economy: '#ffd060', Defense: '#6080d0',
  Explosive: '#e05030', Support: '#40bbd0', Trap: '#c09040', AoE: '#c060d0',
};

export default function AlmanacPage({ onNavigate }) {
  const [traversalType, setTraversalType] = useState('level_order');
  const [selectedPlant, setSelectedPlant] = useState(PLANT_CARDS[0]);

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

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 className="game-title" style={{ fontSize: 28, color: '#fce8c4', marginBottom: 4 }}>Garden Almanac</h1>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(130,180,80,0.6)' }}>
              Student-Authored Binary Tree · 4 Traversal Modes
            </p>
          </div>
          <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('menu')}>
            Back to Menu
          </button>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Plant roster */}
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(130,180,80,0.6)', marginBottom: 10,
            }}>
              Registered Plants
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PLANT_CARDS.map((p) => (
                <div
                  key={p.name}
                  onClick={() => setSelectedPlant(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: selectedPlant?.name === p.name ? 'rgba(90,170,42,0.12)' : 'rgba(8,16,7,0.8)',
                    border: `2px solid ${selectedPlant?.name === p.name ? 'rgba(90,170,42,0.5)' : 'rgba(80,130,40,0.2)'}`,
                    borderRadius: 5, cursor: 'pointer',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (selectedPlant?.name !== p.name) e.currentTarget.style.borderColor = 'rgba(80,130,40,0.4)'; }}
                  onMouseLeave={(e) => { if (selectedPlant?.name !== p.name) e.currentTarget.style.borderColor = 'rgba(80,130,40,0.2)'; }}
                >
                  <img src={p.img} alt={p.name} style={{ width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' }} />
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#fce8c4' }}>{p.name}</div>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                      color: ROLE_COLORS[p.role] || '#aaa',
                    }}>
                      {p.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Plant detail */}
            {selectedPlant && (
              <div style={{
                background: 'rgba(8, 16, 7, 0.92)',
                border: '2px solid rgba(80, 130, 40, 0.3)',
                borderRadius: 6, padding: '20px 22px',
                display: 'flex', gap: 20, alignItems: 'center',
              }}>
                <img
                  src={selectedPlant.img}
                  alt={selectedPlant.name}
                  style={{ width: 80, height: 80, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
                />
                <div>
                  <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: '#fce8c4', marginBottom: 4 }}>
                    {selectedPlant.name}
                  </h2>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: ROLE_COLORS[selectedPlant.role] || '#aaa',
                    border: `1px solid ${(ROLE_COLORS[selectedPlant.role] || '#aaa') + '44'}`,
                    padding: '2px 10px', borderRadius: 3, display: 'inline-block', marginBottom: 10,
                  }}>
                    {selectedPlant.role}
                  </span>
                  <p style={{ fontSize: 13, color: 'rgba(180,160,130,0.75)', lineHeight: 1.6 }}>
                    {selectedPlant.desc}
                  </p>
                </div>
              </div>
            )}

            {/* Traversal panel */}
            <div style={{
              background: 'rgba(8, 16, 7, 0.92)',
              border: '2px solid rgba(80, 130, 40, 0.3)',
              borderRadius: 6, padding: '20px 22px',
              flex: 1,
            }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(130,180,80,0.6)', marginBottom: 10,
                }}>
                  Tree Traversal Mode
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.keys(ALMANAC_DATA).map((type) => (
                    <button
                      key={type}
                      className={traversalType === type ? 'pvz-btn' : 'pvz-btn pvz-btn-wood'}
                      style={{ padding: '7px 14px', fontSize: 11 }}
                      onClick={() => setTraversalType(type)}
                    >
                      {type.replace('_', '-')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
                color: 'rgba(130,180,80,0.5)', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                {TRAVERSAL_LABELS[traversalType]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALMANAC_DATA[traversalType].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 14px',
                    background: 'rgba(5, 12, 4, 0.6)',
                    border: '1px solid rgba(80, 130, 40, 0.2)',
                    borderRadius: 4,
                  }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 14, minWidth: 24, textAlign: 'right',
                      color: 'rgba(130, 180, 80, 0.5)',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: 13, color: '#fce8c4' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
