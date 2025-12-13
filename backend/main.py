from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import math

app = FastAPI(title="Hydro-Lumina Core")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Data into Memory
try:
    df_energy = pd.read_csv("../data/energy_data.csv")
    with open("../data/janaadhaar_users.json", "r") as f:
        users_data = json.load(f)
except Exception as e:
    print(f"❌ Error loading data: {e}. Run data_factory.py first!")
    df_energy = pd.DataFrame()
    users_data = []

# --- 1. THE PHYSICS ENGINE (NILM Logic) ---
def calculate_water_flow(power_kw: float, efficiency_drop: bool = False):
    """
    Formula: Q = (Pe * n) / (rho * g * H)
    
    Pe: Power in Watts
    n (eta): Pump Efficiency (0.75 normal, 0.50 if leaking/cavitation)
    rho: Density (1000 kg/m3)
    g: Gravity (9.81)
    H: Head (30m)
    """
    if power_kw < 5.0: return 0.0 # Ignore standby noise
    
    efficiency = 0.55 if efficiency_drop else 0.75
    rho = 1000
    g = 9.81
    head = 30 # meters
    
    # Power (W) = Flow (m3/s) * rho * g * H / efficiency
    # Flow (m3/s) = (Power_kW * 1000 * efficiency) / (rho * g * H)
    
    flow_m3_s = (power_kw * 1000 * efficiency) / (rho * g * head)
    
    # Convert to Liters per Minute (LPM)
    return round(flow_m3_s * 1000 * 60, 0)

# --- 2. API ENDPOINTS ---

@app.get("/")
def system_status():
    return {"status": "Operational", "grid_connection": "Active", "satellite_link": "Standby"}

@app.get("/analyze-energy")
def analyze_energy(simulate_leak: bool = False):
    """
    Returns the time-series data for the dashboard charts.
    """
    results = []
    for _, row in df_energy.iterrows():
        # If simulating leak, use the 'spike' column, else normal
        # Also, if leak is active, efficiency drops
        
        raw_power = row["leak_spike_kw"] if simulate_leak else row["power_kw"]
        
        # LOGIC: If power is abnormally high (>60kW), it indicates a leak/stress
        is_spike = raw_power > 60.0
        
        flow = calculate_water_flow(raw_power, efficiency_drop=(simulate_leak and is_spike))
        
        results.append({
            "time": row["timestamp"],
            "power_kw": raw_power,
            "flow_lpm": flow,
            "is_anomaly": is_spike and simulate_leak
        })
    return results

@app.get("/users")
def get_users():
    return users_data
