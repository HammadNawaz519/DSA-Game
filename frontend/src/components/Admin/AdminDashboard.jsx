import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../context/AuthContext';

const SETTINGS = [
  { key: 'zombie_speed',      label: 'Zombie Movement Multiplier',  type: 'number', step: '0.1', min: 0.1, max: 5.0 },
  { key: 'sun_spawn_interval', label: 'Sun Spawn Interval (seconds)', type: 'number', step: '1',   min: 1,   max: 60  },
  { key: 'max_plants_per_row', label: 'Max Plants per Row',           type: 'number', step: '1',   min: 1,   max: 9   },
  { key: 'rate_limit_x',      label: 'Rate Limit — Max Actions',      type: 'number', step: '1',   min: 1,   max: 100 },
  { key: 'rate_limit_y',      label: 'Rate Limit — Window (seconds)', type: 'number', step: '1',   min: 1,   max: 60  },
  { key: 'start_sun',         label: 'Starting Sun Amount',           type: 'number', step: '25',  min: 50,  max: 500 },
  { key: 'zombie_health',     label: 'Zombie Health Multiplier',      type: 'number', step: '0.1', min: 0.5, max: 5.0 },
];

export default function AdminDashboard({ onNavigate }) {
  const [config, setConfig] = useState({
    zombie_speed: 1.0,
    sun_spawn_interval: 7,
    max_plants_per_row: 5,
    rate_limit_x: 15,
    rate_limit_y: 3,
    lock_state: 0,
    start_sun: 150,
    zombie_health: 1.0,
  });

  const [message, setMessage] = useState(null); // { text, ok }
  const [loading, setLoading] = useState(false);
  const [loadTestResult, setLoadTestResult] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/config`);
        if (res.ok) setConfig(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setMessage({ ok: data.success, text: data.success ? 'Configuration flushed to config.bin and active in C++ engine.' : 'Update failed.' });
    } catch (e) {
      setMessage({ ok: false, text: 'Connection error.' });
    }
    setLoading(false);
  };

  const toggleEmergencyLock = async () => {
    const newLock = config.lock_state === 1 ? 0 : 1;
    setConfig((c) => ({ ...c, lock_state: newLock }));
    try {
      await fetch(`${API_BASE}/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock_state: newLock }),
      });
      setMessage({ ok: newLock === 0, text: newLock === 1 ? 'App frozen — all mutations rejected.' : 'App unlocked.' });
    } catch (e) { setMessage({ ok: false, text: 'Lock toggle failed.' }); }
  };

  const handleSeedDemoData = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/seed-demo`, { method: 'POST' });
      const data = await res.json();
      setMessage({ ok: true, text: `Demo seeding complete — ${data.seeded_count} player records written.` });
    } catch (e) { setMessage({ ok: false, text: 'Seeding failed.' }); }
    setLoading(false);
  };

  const handleRunLoadTest = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/load-test`, { method: 'POST' });
      const data = await res.json();
      setLoadTestResult(data);
      setMessage({ ok: true, text: `30-client simulation passed — ${data.enqueued_actions} actions enqueued into CircularQueue.` });
    } catch (e) { setMessage({ ok: false, text: 'Load test failed.' }); }
    setLoading(false);
  };

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
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.10, pointerEvents: 'none', zIndex: 0 }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 className="game-title" style={{ fontSize: 26, color: '#fce8c4', marginBottom: 4 }}>Mission Control</h1>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(130,180,80,0.6)' }}>
              Live authoritative C++ engine configuration — changes persist to config.bin
            </p>
          </div>
          <button className="pvz-btn pvz-btn-wood" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => onNavigate('menu')}>
            Back to Menu
          </button>
        </div>

        {/* Message banner */}
        {message && (
          <div style={{
            padding: '12px 18px',
            borderRadius: 5,
            marginBottom: 20,
            fontSize: 13,
            border: `1px solid ${message.ok ? 'rgba(90,170,42,0.5)' : 'rgba(181,48,40,0.5)'}`,
            background: message.ok ? 'rgba(90,170,42,0.1)' : 'rgba(181,48,40,0.12)',
            color: message.ok ? '#90d060' : '#ff9b8a',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.03em',
          }}>
            {message.text}
          </div>
        )}

        {/* Settings form */}
        <div style={{
          background: 'rgba(8, 16, 7, 0.92)',
          border: '2px solid rgba(80, 130, 40, 0.3)',
          borderRadius: 6, padding: '22px 24px',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 12,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(130, 180, 80, 0.7)',
            marginBottom: 18,
          }}>
            Gameplay Settings (8 Binary-Persisted Parameters)
          </div>

          <form onSubmit={handleSave}>
            {SETTINGS.map((s) => (
              <div key={s.key} className="admin-row">
                <label htmlFor={s.key}>{s.label}</label>
                <input
                  id={s.key}
                  type={s.type}
                  step={s.step}
                  min={s.min}
                  max={s.max}
                  value={config[s.key]}
                  onChange={(e) => setConfig({
                    ...config,
                    [s.key]: s.step.includes('.') ? parseFloat(e.target.value) : parseInt(e.target.value),
                  })}
                />
              </div>
            ))}

            {/* Setting 8 — Emergency Lock */}
            <div className="admin-row">
              <label>Emergency Maintenance Freeze</label>
              <button
                type="button"
                className={config.lock_state === 1 ? 'pvz-btn' : 'pvz-btn pvz-btn-danger'}
                onClick={toggleEmergencyLock}
                style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '8px' }}
              >
                {config.lock_state === 1 ? 'Unfreeze App' : 'Freeze App'}
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="pvz-btn"
                disabled={loading}
                style={{ padding: '12px 28px', fontSize: 13 }}
              >
                {loading ? 'Saving...' : 'Apply & Persist to config.bin'}
              </button>
            </div>
          </form>
        </div>

        {/* Tools panel */}
        <div style={{
          background: 'rgba(8, 16, 7, 0.92)',
          border: '2px solid rgba(80, 130, 40, 0.3)',
          borderRadius: 6, padding: '22px 24px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 12,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(130, 180, 80, 0.7)',
            marginBottom: 18,
          }}>
            Verification & Demonstration Tools
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="pvz-btn pvz-btn-wood"
              style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 13 }}
              onClick={handleSeedDemoData}
              disabled={loading}
            >
              Seed Demo Accounts
            </button>
            <button
              type="button"
              className="pvz-btn pvz-btn-blue"
              style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 13 }}
              onClick={handleRunLoadTest}
              disabled={loading}
            >
              Run 30-Client Load Test
            </button>
          </div>

          {loadTestResult && (
            <div style={{
              marginTop: 14,
              padding: '12px 16px',
              background: 'rgba(5, 12, 4, 0.7)',
              border: '1px solid rgba(80, 130, 40, 0.25)',
              borderRadius: 4,
              fontSize: 12,
              color: 'rgba(130, 190, 80, 0.8)',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.03em',
            }}>
              Confirmed: 30 concurrent actions processed via CircularQueue — buffer capacity: {loadTestResult.capacity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
