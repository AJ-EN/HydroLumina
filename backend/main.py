"""
HydroLumina FastAPI Backend
Provides real-time energy analysis and water flow calculations for the HUD dashboard.

Endpoints:
  - GET /analyze-energy : Returns energy consumption data with calculated water flow
  - GET /health         : Health check endpoint

Features:
  - IsolationForest anomaly detection for leak identification
  - Dynamic head simulation for realistic physics
  - BSR (Basic Schedule of Rates) cost estimation
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
from sklearn.ensemble import IsolationForest
import json

app = FastAPI(
    title="HydroLumina API",
    description="Water Distribution Monitoring System - Backend Intelligence",
    version="1.0.0"
)

# CORS Configuration - Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# DATA PATHS
# =============================================================================
DATA_DIR = Path(__file__).parent.parent / "data"
ENERGY_DATA_PATH = DATA_DIR / "energy_data.csv"
USERS_DATA_PATH = DATA_DIR / "janaadhaar_users.json"

# =============================================================================
# PHYSICS SIMULATION
# =============================================================================

# Dynamic tank state (simulates real tank levels)
tank_state = {
    "level_m": 8.0,      # Current water level in meters
    "max_level_m": 10.0, # Tank capacity
    "inflow_lps": 50.0,  # Supply rate
    "outflow_lps": 45.0  # Consumption rate
}


def calculate_water_flow(power_kw: float, leak_mode: bool = False) -> dict:
    """
    Smarter flow calculation with dynamic head physics.
    
    NILM Energy Signature → Pump Efficiency → Flow Rate
    
    Args:
        power_kw: Current power consumption in kW
        leak_mode: Whether to simulate leak conditions
    
    Returns:
        Dictionary with flow_lpm, efficiency, and tank_level
    """
    global tank_state
    
    # Pump efficiency curve (power vs efficiency)
    # Real pumps have optimal operating points
    if power_kw < 30:
        efficiency = 0.55  # Low load = poor efficiency
    elif power_kw < 50:
        efficiency = 0.78  # Optimal range
    elif power_kw < 70:
        efficiency = 0.72  # Slightly overloaded
    else:
        efficiency = 0.60  # Overloaded pump
    
    # Head calculation (dynamic based on tank level)
    # H = (P * η) / (ρ * g * Q) → Q = (P * η) / (ρ * g * H)
    static_head = 25.0  # meters (elevation difference)
    tank_head = tank_state["max_level_m"] - tank_state["level_m"]  # Dynamic!
    total_head = static_head + tank_head
    
    # Simplified flow calculation (L/s)
    # Real: Q = (P * 1000 * η) / (ρ * g * H)
    # Where ρ=1000 kg/m³, g=9.81 m/s²
    flow_lps = (power_kw * 1000 * efficiency) / (1000 * 9.81 * total_head)
    
    # Leak mode: Increased consumption, reduced efficiency
    if leak_mode:
        efficiency *= 0.7  # Pump works harder
        tank_state["outflow_lps"] = 65.0  # More water leaving system
        flow_lps *= 0.6  # Less reaches end users
    else:
        tank_state["outflow_lps"] = 45.0
    
    # Update tank level (simulate over time)
    delta = (tank_state["inflow_lps"] - tank_state["outflow_lps"]) * 0.01
    tank_state["level_m"] = max(0.5, min(tank_state["max_level_m"], 
                                          tank_state["level_m"] + delta))
    
    # Convert to LPM for frontend
    flow_lpm = int(flow_lps * 60)
    
    return {
        "flow_lpm": flow_lpm,
        "efficiency": round(efficiency, 2),
        "tank_level_m": round(tank_state["level_m"], 2),
        "head_m": round(total_head, 1)
    }


# =============================================================================
# ANOMALY DETECTION
# =============================================================================

def detect_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Use IsolationForest to detect anomalies in energy consumption.
    Returns DataFrame with 'is_anomaly' column.
    """
    # Features for anomaly detection
    features = df[['power_kw', 'voltage_v', 'current_a', 'power_factor']].copy()
    
    # Train IsolationForest
    model = IsolationForest(
        contamination=0.05,  # Expect ~5% anomalies
        random_state=42,
        n_estimators=100
    )
    
    # Predict: -1 = anomaly, 1 = normal
    predictions = model.fit_predict(features)
    df['is_anomaly'] = predictions == -1
    df['anomaly_score'] = model.decision_function(features)
    
    return df


# =============================================================================
# BSR COST ESTIMATION
# =============================================================================

BSR_CATALOG = {
    "pipe_repair_small": {
        "code": "PHED-2024-Item-3.1",
        "description": "Pipe Repair < 50mm GI",
        "base_cost": 2500,
        "labor_hours": 2
    },
    "pipe_repair_medium": {
        "code": "PHED-2024-Item-4.2", 
        "description": "Pipe Repair > 100mm DI",
        "base_cost": 8500,
        "labor_hours": 6
    },
    "pipe_repair_large": {
        "code": "PHED-2024-Item-5.3",
        "description": "Main Line Repair > 200mm",
        "base_cost": 25000,
        "labor_hours": 12
    },
    "valve_replacement": {
        "code": "PHED-2024-Item-6.1",
        "description": "Valve Replacement",
        "base_cost": 4500,
        "labor_hours": 3
    }
}


def estimate_repair_cost(leak_severity: str = "medium") -> dict:
    """
    Estimate repair cost based on BSR (Basic Schedule of Rates).
    """
    severity_map = {
        "small": "pipe_repair_small",
        "medium": "pipe_repair_medium", 
        "large": "pipe_repair_large"
    }
    
    item_key = severity_map.get(leak_severity, "pipe_repair_medium")
    item = BSR_CATALOG[item_key]
    
    # Calculate with Rajasthan labor rates (approx ₹450/hour)
    labor_cost = item["labor_hours"] * 450
    material_contingency = item["base_cost"] * 0.15  # 15% contingency
    total = item["base_cost"] + labor_cost + material_contingency
    
    return {
        "bsr_code": item["code"],
        "bsr_description": item["description"],
        "est_cost": f"₹ {int(total):,}",
        "breakdown": {
            "material": item["base_cost"],
            "labor": labor_cost,
            "contingency": int(material_contingency)
        }
    }


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """API root - returns service info."""
    return {
        "service": "HydroLumina API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": ["/analyze-energy", "/health", "/bsr-estimate", "/affected-user"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    data_available = ENERGY_DATA_PATH.exists()
    return {
        "status": "healthy" if data_available else "degraded",
        "data_available": data_available,
        "tank_level_m": tank_state["level_m"]
    }


@app.get("/analyze-energy")
async def analyze_energy(
    simulate_leak: bool = Query(default=False, description="Toggle leak simulation mode"),
    limit: Optional[int] = Query(default=None, description="Limit number of records")
):
    """
    Main analysis endpoint - returns energy data with calculated water flow.
    
    Args:
        simulate_leak: If True, uses leak_spike_kw instead of power_kw
        limit: Optional limit on number of records returned
    
    Returns:
        List of energy readings with calculated flow rates
    """
    try:
        # Load energy data
        df = pd.read_csv(ENERGY_DATA_PATH)
        
        # Use appropriate power column based on mode
        power_column = 'leak_spike_kw' if simulate_leak else 'power_kw'
        
        # Detect anomalies
        df = detect_anomalies(df)
        
        # Calculate flow for each reading
        results = []
        for _, row in df.iterrows():
            power = row[power_column]
            flow_data = calculate_water_flow(power, leak_mode=simulate_leak)
            
            results.append({
                "timestamp": row['timestamp'],
                "power_kw": round(row[power_column], 1),
                "voltage_v": row['voltage_v'],
                "current_a": row['current_a'],
                "frequency_hz": row['frequency_hz'],
                "power_factor": row['power_factor'],
                "flow_lpm": flow_data['flow_lpm'],
                "efficiency": flow_data['efficiency'],
                "tank_level_m": flow_data['tank_level_m'],
                "is_anomaly": bool(row['is_anomaly']),
                "anomaly_score": round(row['anomaly_score'], 3)
            })
        
        # Apply limit if specified
        if limit:
            results = results[-limit:]
        
        return results
        
    except FileNotFoundError:
        return {"error": "Energy data not found. Please run data_factory.py first."}
    except Exception as e:
        return {"error": str(e)}


@app.get("/affected-user")
async def get_affected_user(
    zone: str = Query(default="ZONE_4_SECTOR_B", description="Zone identifier")
):
    """
    Get the user affected by a leak in the specified zone.
    Returns Jan Aadhaar data with BSR cost estimate.
    """
    try:
        # Load user data
        with open(USERS_DATA_PATH, 'r') as f:
            users = json.load(f)
        
        # Find user in affected zone (for demo, pick a random one)
        # In production, this would use GIS data to find users near leak
        affected_user = np.random.choice(users)
        
        # Get BSR cost estimate
        bsr_data = estimate_repair_cost("medium")
        
        return {
            "id": affected_user["id"],
            "name": affected_user["name"].upper(),
            "location": zone,
            "locality": affected_user["locality"],
            "status": "CRITICAL_PRESSURE_DROP",
            "last_update": "T-MINUS 00:02:00",
            "family_members": np.random.randint(3, 8),
            "water_usage": f"{int(affected_user['avg_daily_usage_liters'])} L/DAY",
            "phone": affected_user["phone"],
            **bsr_data,
            "contractor": "L&T Civil (Auto-Assigned)",
            "repair_priority": "P1 - IMMEDIATE"
        }
        
    except FileNotFoundError:
        return {"error": "User data not found. Please run data_factory.py first."}
    except Exception as e:
        return {"error": str(e)}


@app.get("/bsr-estimate")
async def bsr_estimate(
    severity: str = Query(default="medium", description="Leak severity: small, medium, large")
):
    """
    Get BSR cost estimate for a repair job.
    """
    return estimate_repair_cost(severity)


@app.get("/network-status")
async def network_status():
    """
    Get current water network status.
    """
    return {
        "pump_stations": {
            "online": 3,
            "total": 3,
            "status": "NOMINAL"
        },
        "tanks": {
            "T1": {"level_percent": 72, "status": "NORMAL"},
            "T2": {"level_percent": 65, "status": "NORMAL"},
            "T3": {"level_percent": 45, "status": "LOW"}
        },
        "active_alerts": 0,
        "last_sync": "2024-12-11T14:30:00Z"
    }


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 HYDROLUMINA BACKEND STARTING...")
    print("="*60)
    print("\nEndpoints:")
    print("  📊 GET /analyze-energy    - Energy analysis with flow calculation")
    print("  👤 GET /affected-user     - Get affected user data")
    print("  💰 GET /bsr-estimate      - BSR repair cost estimation")
    print("  🔧 GET /network-status    - Water network status")
    print("  ❤️  GET /health            - Health check")
    print("\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
