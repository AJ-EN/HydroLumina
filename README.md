# 🌊 HydroLumina

**AI-Powered Water Leak Detection Using Energy Signatures & Satellite Imagery**

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <img src="docs/hydrolumina-banner.png" alt="HydroLumina Dashboard" width="800"/>
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Future Scope](#-future-scope)

---

## 🎯 Problem Statement

Indian cities lose **30-50% of treated water** due to:
- Underground pipe leaks that go undetected for weeks
- Illegal water tapping and theft
- Inequitable distribution across neighborhoods

Traditional leak detection requires expensive underground sensors that most municipalities cannot afford. Meanwhile, water theft goes undetected, causing some areas to receive excess water while others face critical shortages.

---

## 💡 Our Solution

**HydroLumina** detects water leaks and theft by analyzing **electricity consumption patterns** at pump stations—without installing any new sensors.

### The Core Insight: "Listen to the Pump"

Every water pump creates a unique **energy signature**. When water leaks occur:
- Pumps work harder to maintain pressure
- Electricity consumption increases abnormally
- The "heartbeat" of the pump changes

We correlate this with **ISRO satellite imagery** (NISAR moisture data) to pinpoint leak locations with high confidence.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **NILM Energy Analysis** | Non-Intrusive Load Monitoring to detect pump anomalies |
| **AI Anomaly Detection** | IsolationForest ML model trained on consumption patterns |
| **Satellite Correlation** | ISRO NISAR integration for ground moisture verification |
| **GIS-Based User Mapping** | Jan Aadhaar database integration to identify affected citizens |
| **BSR Cost Estimation** | Automated repair cost calculation using Schedule of Rates |
| **Real-Time Dashboard** | Tactical command center UI with live telemetry |
| **Dynamic Pipe Network** | Interactive map with flow visualization |
| **Keyboard Shortcuts** | `L` = Leak mode, `W` = Weather simulation |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HYDROLUMINA SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  PUMP STATION │    │   SATELLITE  │    │  JAN AADHAAR │      │
│  │  (Energy Data)│    │  (ISRO NISAR)│    │   DATABASE   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FASTAPI BACKEND                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ IsolationFor│  │  Haversine  │  │    BSR      │      │   │
│  │  │   est (AI)  │  │  GIS Calc   │  │  Estimator  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    REACT FRONTEND                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Recharts   │  │   Leaflet   │  │  Dossier    │      │   │
│  │  │   (Graphs)  │  │    (Map)    │  │   Cards     │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.9+** | Core language |
| **FastAPI** | REST API framework |
| **scikit-learn** | IsolationForest anomaly detection |
| **Pandas & NumPy** | Data processing |
| **NetworkX** | Pipe network graph simulation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Leaflet** | Interactive map visualization |
| **Recharts** | Real-time data charts |
| **CSS3** | Custom tactical theme |

### Data Sources
| Source | Usage |
|--------|-------|
| **ISRO NISAR** | Satellite moisture anomaly detection |
| **Jan Aadhaar** | Citizen database for affected user lookup |
| **BSR 2024** | Basic Schedule of Rates for cost estimation |

---

## 🚀 Installation

### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/HydroLumina.git
cd HydroLumina
```

### 2. Setup Backend
```bash
# Create virtual environment
cd backend
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pandas numpy scikit-learn networkx

# Generate synthetic data
cd ..
python data_factory.py
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

---

## 🎮 Usage

### Start the Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start the Frontend
```bash
cd frontend
npm start
```

### Access the Dashboard
Open your browser and navigate to: **http://localhost:3000**

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `L` | Toggle Leak Simulation Mode |
| `W` | Toggle Weather (Rain) Filter |

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and status |
| `/health` | GET | Health check with model status |
| `/analyze-energy` | GET | Real-time energy analysis with flow calculation |
| `/affected-user` | GET | GIS-matched affected citizen with BSR estimate |
| `/bsr-estimate` | GET | Repair cost estimation |
| `/users` | GET | All Jan Aadhaar users for map display |
| `/satellite-zones` | GET | Satellite anomaly zones (GeoJSON) |
| `/pipe-network` | GET | Pipe network with hydraulic data |
| `/satellite-analysis` | GET | Differential diagnostics (rain vs leak) |

### Example Request
```bash
curl http://localhost:8000/analyze-energy?simulate_leak=true
```

---

## 📁 Project Structure

```
HydroLumina/
├── backend/
│   ├── main.py              # FastAPI server with all endpoints
│   └── venv/                # Python virtual environment
│
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML entry point
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Tactical theme styling
│   │   └── components/
│   │       └── MapView.js   # Leaflet map with pipe network
│   └── package.json         # Node dependencies
│
├── data/
│   ├── energy_data.csv      # 24hr pump electricity readings
│   ├── janaadhaar_users.json # Synthetic citizen database
│   ├── network.graphml      # Pipe network graph
│   └── satellite.json       # ISRO leak zone data
│
├── data_factory.py          # Synthetic data generator
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

---

## ⚙️ How It Works

### 1. Energy Signature Analysis (NILM)
```
Pump Power Consumption → AI Pattern Recognition → Anomaly Detection
```
The IsolationForest algorithm is trained on normal pump operation patterns. When power consumption deviates (e.g., pump working harder due to leak), the system flags it.

### 2. Satellite Correlation
```
ISRO NISAR Moisture Data → Ground Wetness Anomaly → Location Verification
```
We cross-reference energy anomalies with satellite moisture readings to distinguish real leaks from false positives.

### 3. Differential Diagnostics (Rain vs Leak)
```
Rain = Global Signal (affects entire city)
Leak = Local Signal (affects specific junction)
```
The system filters out rain-caused moisture using spatial analysis—rain affects large areas uniformly, while leaks create localized moisture patterns.

### 4. Dynamic Head Physics
```
Tank Level → Head Pressure → Flow Rate → Efficiency
```
Real-time simulation of hydraulic physics, showing how tank levels affect water distribution across the network.

---

## 🔮 Future Scope

1. **SCADA Integration** - Connect to real pump station telemetry
2. **Mobile App** - Field worker app for repair crew dispatch
3. **Predictive Maintenance** - Forecast pipe failures before they happen
4. **Multi-City Deployment** - Scale to other municipalities
5. **IoT Sensors** - Low-cost pressure sensors for validation
6. **Blockchain Logging** - Immutable audit trail for repairs

---

## 👥 Team

Built with ❤️ for water conservation in India.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>HydroLumina</b> - Every Drop Counts 💧
</p>
