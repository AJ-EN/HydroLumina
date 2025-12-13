import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [leakMode, setLeakMode] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ power: 0, flow: 0 });
  const [selectedUser, setSelectedUser] = useState(null);

  // Poll Backend for Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/analyze-energy?simulate_leak=${leakMode}`);
        const data = await res.json();
        setChartData(data);

        // Update "Live" metrics (taking the latest relevant point)
        // If leak mode is on, we look for the spike area
        const latest = leakMode
          ? data.find(d => d.is_anomaly) || data[data.length - 1]
          : data[data.length - 1];

        if (latest) {
          setMetrics({
            power: latest.power_kw,
            flow: latest.flow_lpm
          });
        }
      } catch (err) {
        console.error("Backend Error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Update every 3s
    return () => clearInterval(interval);
  }, [leakMode]);

  // Handle User Click Simulation (For Demo)
  // In a real Kepler app, you'd listen to map events. 
  // For hackathon speed, we toggle the card when Leak Mode is active.
  useEffect(() => {
    if (leakMode) {
      setTimeout(() => {
        setSelectedUser({
          id: "1093-4821-9921",
          name: "Rameshwar Lal",
          family: 6,
          status: "CRITICAL (Low Pressure)"
        });
      }, 2000); // Show card 2s after leak trigger
    } else {
      setSelectedUser(null);
    }
  }, [leakMode]);

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="header">
          <h1 className="title">HYDRO-LUMINA</h1>
          <span className="subtitle">Rajasthan Water Governance Grid</span>
        </div>

        {/* METRICS */}
        <div className="metric-card">
          <span className="metric-label">Grid Load (NILM)</span>
          <div className="metric-value power-val">
            {metrics.power.toFixed(1)} <span className="value-unit">kW</span>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Water Flow (Calc)</span>
          <div className="metric-value water-val">
            {metrics.flow.toFixed(0)} <span className="value-unit">LPM</span>
          </div>
        </div>

        {/* CHART */}
        <div style={{ height: '200px', width: '100%', marginTop: '20px' }}>
          <span className="metric-label">Real-time Analysis</span>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#000', border: '1px solid #333' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="power_kw" stroke="#facc15" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="flow_lpm" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CONTROL */}
        <div className="control-panel">
          <button
            className={`leak-btn ${leakMode ? 'alert' : 'normal'}`}
            onClick={() => setLeakMode(!leakMode)}
          >
            {leakMode ? '⚠ LEAK DETECTED' : 'SYSTEM NORMAL'}
          </button>
        </div>
      </div>

      {/* MAP AREA */}
      <div className="map-container">
        <iframe
          title="Kepler Map"
          src="/map.html"
          className="kepler-frame"
        />

        {/* JAN AADHAAR OVERLAY */}
        {selectedUser && (
          <div className="jan-aadhaar-card">
            <div className="ja-header">
              <span className="ja-logo">JAN AADHAAR</span>
              <span style={{ color: 'red' }}>⚠ ALERT</span>
            </div>
            <div className="ja-body">
              <div className="ja-row">
                <span className="ja-label">ID Number</span>
                <span className="ja-data">{selectedUser.id}</span>
              </div>
              <div className="ja-row">
                <span className="ja-label">Head of Family</span>
                <span className="ja-data">{selectedUser.name}</span>
              </div>
              <div className="ja-row">
                <span className="ja-label">Members</span>
                <span className="ja-data">{selectedUser.family}</span>
              </div>
              <div className="ja-row">
                <span className="ja-label">Status</span>
                <span className="ja-data" style={{ color: '#facc15' }}>{selectedUser.status}</span>
              </div>
              <button className="action-btn">
                INITIATE DBT REFUND
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
