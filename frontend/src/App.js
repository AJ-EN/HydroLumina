import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import './App.css';

const App = () => {
  const [leakMode, setLeakMode] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ power: 0.0, flow: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from FastAPI
        const res = await fetch(`http://127.0.0.1:8000/analyze-energy?simulate_leak=${leakMode}`);
        const data = await res.json();

        setIsConnected(true);

        // Slice data to keep chart clean (last 50 points)
        const recentData = data.slice(-50);
        setChartData(recentData);

        // Update HUD Metrics
        const latest = recentData[recentData.length - 1];
        if (latest) {
          setMetrics({
            power: latest.power_kw,
            flow: latest.flow_lpm
          });
        }
      } catch (err) {
        setIsConnected(false);
        console.warn("Backend Disconnected. Running in Offline HUD Mode.");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [leakMode]);

  // --- INTERACTION SIMULATION ---
  useEffect(() => {
    if (leakMode) {
      // Delay the "Intelligence Find" to make it feel like a search
      const timer = setTimeout(() => {
        setSelectedUser({
          id: "JA-1093-4821",
          name: "RAMESHWAR LAL",
          location: "ZONE_4_SECTOR_B",
          status: "CRITICAL_PRESSURE_DROP",
          last_update: "T-MINUS 00:02:00",
          family_members: 6,
          water_usage: "450 L/DAY",
          // BSR (Basic Schedule of Rates) Integration
          bsr_code: "PHED-2024-Item-4.2",
          bsr_description: "Pipe Repair > 100mm DI",
          est_cost: "₹ 12,450",
          contractor: "L&T Civil (Auto-Assigned)",
          repair_priority: "P1 - IMMEDIATE"
        });
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setSelectedUser(null);
    }
  }, [leakMode]);

  // Get current timestamp
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="app-container">

      {/* TOP COMMAND BAR */}
      <header className="top-bar">
        <div className="brand-section">
          <span className="brand-title">HYDRO<span style={{ color: 'var(--accent-cyan)' }}>LUMINA</span></span>
          <span className="mission-tag">OP: WATER_SECURITY</span>
          <span className="mission-tag">LOC: JAIPUR_GRID</span>
          {/* Edge Compute Mode Indicator */}
          <span className="mission-tag" style={{ color: '#4ade80', borderColor: '#4ade80' }}>
            ● EDGE_COMPUTE
          </span>
        </div>
        <div className="status-indicator">
          <span>SYS: {isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span>STATUS: {leakMode ? <span style={{ color: 'var(--accent-alert)' }}>ALERT</span> : <span style={{ color: 'var(--accent-cyan)' }}>OPTIMAL</span>}</span>
          <div className="blink" style={{ backgroundColor: leakMode ? 'var(--accent-alert)' : 'var(--accent-cyan)' }}></div>
        </div>
      </header>

      <div className="main-grid">

        {/* LEFT INTELLIGENCE PANEL */}
        <aside className="intel-panel">

          <div className="panel-header">// REAL-TIME TELEMETRY</div>

          <div className="data-section">
            <div className="metric-row">
              <span className="metric-label">GRID_LOAD [NILM]</span>
              <span className="metric-label">{getCurrentTime()}</span>
            </div>
            <span className="metric-value-lg" style={{ color: 'var(--accent-amber)' }}>
              {metrics.power.toFixed(1)} <span className="metric-unit">kW</span>
            </span>
          </div>

          <div className="data-section">
            <div className="metric-row">
              <span className="metric-label">WATER_FLOW [CALC]</span>
            </div>
            <span className="metric-value-lg" style={{ color: 'var(--accent-cyan)' }}>
              {metrics.flow} <span className="metric-unit">LPM</span>
            </span>

            {/* HUD CHART */}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={140} minHeight={140}>
                <LineChart data={chartData}>
                  <Line
                    type="step"
                    dataKey="flow_lpm"
                    stroke="var(--accent-cyan)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="step"
                    dataKey="power_kw"
                    stroke="var(--accent-amber)"
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                    opacity={0.5}
                  />
                  <XAxis hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid #333',
                      color: '#fff',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '10px'
                    }}
                    labelStyle={{ color: '#888' }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '9px', color: '#444', marginTop: '5px', textAlign: 'right' }}>
              T-MINUS 1HR WINDOW
            </div>
          </div>

          <div className="panel-header">// SENSOR NETWORK</div>
          <div className="data-section" style={{ flex: 1 }}>
            <div className="metric-row">
              <span className="metric-label">ISRO_NISAR_LINK</span>
              <span style={{ color: leakMode ? 'var(--accent-cyan)' : '#444' }}>
                {leakMode ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">JAN_AADHAAR_DB</span>
              <span style={{ color: 'var(--accent-cyan)' }}>CONNECTED</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">BACKEND_API</span>
              <span style={{ color: isConnected ? 'var(--accent-cyan)' : 'var(--accent-alert)' }}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">PUMP_STATIONS</span>
              <span style={{ color: 'var(--accent-cyan)' }}>3 ONLINE</span>
            </div>
          </div>

          <div className="action-area">
            <button
              className={`btn-primary ${leakMode ? 'active' : ''}`}
              onClick={() => setLeakMode(!leakMode)}
            >
              {leakMode ? '[!] TERMINATE SIMULATION' : '[ ] INITIATE LEAK SCENARIO'}
            </button>
          </div>
        </aside>

        {/* MAP VIEWPORT */}
        <main className="viewport">
          <iframe
            src={leakMode ? "/map_leak.html" : "/map_normal.html"}
            title="Kepler Map"
            className="map-frame"
            key={leakMode ? 'leak' : 'normal'}  // Force re-render on mode change
          />

          {/* INTELLIGENCE DOSSIER (Overlay) */}
          {selectedUser && (
            <div className="dossier-card">
              <div className="dossier-header">
                <span>// PRIORITY ALERT DETECTED</span>
                <span style={{ fontSize: '10px' }}>Lv.1 CRITICAL</span>
              </div>
              <div className="dossier-body">
                <div className="dossier-row">
                  <span className="dossier-label">SUBJECT_NAME</span>
                  <span className="dossier-data">{selectedUser.name}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">JAN_AADHAAR_ID</span>
                  <span className="dossier-data">{selectedUser.id}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">SECTOR</span>
                  <span className="dossier-data">{selectedUser.location}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">FAMILY_SIZE</span>
                  <span className="dossier-data">{selectedUser.family_members} MEMBERS</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">STATUS</span>
                  <span className="dossier-data" style={{ color: 'var(--accent-alert)' }}>
                    {selectedUser.status}
                  </span>
                </div>

                {/* BSR COST ESTIMATION SECTION */}
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px dashed var(--border-dim)',
                  background: 'rgba(0,242,255,0.03)'
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                    {/* BSR AUTO-COSTING MODULE */}
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">BSR_CODE</span>
                    <span className="dossier-data" style={{ color: 'var(--accent-amber)' }}>
                      {selectedUser.bsr_code}
                    </span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">DESCRIPTION</span>
                    <span className="dossier-data" style={{ fontSize: '10px' }}>
                      {selectedUser.bsr_description}
                    </span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">EST_COST</span>
                    <span className="dossier-data" style={{ color: '#4ade80', fontSize: '14px' }}>
                      {selectedUser.est_cost}
                    </span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">CONTRACTOR</span>
                    <span className="dossier-data">{selectedUser.contractor}</span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">PRIORITY</span>
                    <span className="dossier-data" style={{ color: 'var(--accent-alert)' }}>
                      {selectedUser.repair_priority}
                    </span>
                  </div>
                </div>

                <button className="btn-action" style={{ marginTop: '15px' }}>
                  AUTHORIZE DBT REFUND + DISPATCH REPAIR
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
