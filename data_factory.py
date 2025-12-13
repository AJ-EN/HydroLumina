"""
HydroLumina Data Factory
Generates synthetic data for the hackathon demo:
1. energy_data.csv - 24 hours of electricity readings with pump spikes
2. janaadhaar_users.json - 50 fake citizens with Rajasthani names
3. network.graphml - Synthetic pipe network for WNTR simulation
"""

import pandas as pd
import numpy as np
import json
import networkx as nx
from datetime import datetime, timedelta
import os

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# =============================================================================
# 1. ENERGY DATA GENERATION
# =============================================================================

def generate_energy_data():
    """
    Generate 24 hours of electricity consumption data with realistic pump spikes.
    Simulates a water distribution pump station with normal operation and anomalies.
    """
    print("📊 Generating energy_data.csv...")
    
    # Time range: 24 hours at 5-minute intervals
    start_time = datetime(2024, 12, 11, 0, 0, 0)
    timestamps = [start_time + timedelta(minutes=5*i) for i in range(288)]  # 288 = 24*12
    
    # Base load (kW) - typical pump station consumption
    base_load = 45.0
    
    # Create realistic consumption pattern
    power_readings = []
    leak_spike_readings = []  # Power readings when leak is simulated
    flow_actual = []  # Actual water flow (for comparison)
    
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        
        # Daily pattern: higher during day, lower at night
        if 6 <= hour < 9:  # Morning peak
            multiplier = 1.3
        elif 9 <= hour < 17:  # Day
            multiplier = 1.1
        elif 17 <= hour < 21:  # Evening peak
            multiplier = 1.4
        else:  # Night
            multiplier = 0.7
        
        # Add some noise
        noise = np.random.normal(0, 2)
        
        # Calculate normal power
        power = base_load * multiplier + noise
        
        # Calculate leak spike power (what happens during a leak)
        # Leak event: Hours 14-16 (2 PM to 4 PM) - pump works harder
        if 14 <= hour < 16:
            leak_power = power + np.random.uniform(20, 35)  # Big spike!
            actual_flow = power * 0.3  # Reduced efficiency due to leak
        else:
            leak_power = power + np.random.uniform(0, 5)  # Minor variation
            actual_flow = power * 0.6  # Normal efficiency
        
        power_readings.append(max(0, power))
        leak_spike_readings.append(max(0, leak_power))
        flow_actual.append(max(0, actual_flow))
    
    # Create DataFrame
    df = pd.DataFrame({
        'timestamp': [ts.strftime('%H:%M') for ts in timestamps],  # Just time for chart
        'power_kw': [round(p, 1) for p in power_readings],
        'leak_spike_kw': [round(p, 1) for p in leak_spike_readings],  # Power during leak simulation
        'voltage_v': [round(np.random.uniform(395, 405), 1) for _ in range(288)],
        'current_a': [round(p / 400 * 1000, 1) for p in power_readings],
        'frequency_hz': [round(np.random.uniform(49.8, 50.2), 2) for _ in range(288)],
        'power_factor': [round(np.random.uniform(0.85, 0.95), 2) for _ in range(288)],
        'flow_actual_lps': [round(f, 1) for f in flow_actual],
    })
    
    df.to_csv('data/energy_data.csv', index=False)
    print(f"   ✅ Created data/energy_data.csv ({len(df)} records)")
    return df


# =============================================================================
# 2. JAN AADHAAR USER DATA
# =============================================================================

def generate_janaadhaar_users():
    """
    Generate 50 fake citizens with Rajasthani names and Jaipur locations.
    """
    print("👥 Generating janaadhaar_users.json...")
    
    # Rajasthani first names
    first_names = [
        "Arjun", "Bharat", "Chandan", "Deepak", "Ganesh",
        "Hari", "Ishwar", "Jagdish", "Karan", "Lakshman",
        "Mahesh", "Naresh", "Om", "Prakash", "Rajesh",
        "Suresh", "Tarun", "Umesh", "Vijay", "Yash",
        "Anita", "Bhavna", "Chitra", "Deepa", "Gita",
        "Hemlata", "Indira", "Jaya", "Kamla", "Laxmi",
        "Meena", "Neelam", "Padma", "Radha", "Savitri",
        "Sunita", "Tara", "Uma", "Vimla", "Yamuna",
        "Anil", "Balram", "Chhotu", "Dharam", "Gopal",
        "Hansraj", "Jagat", "Kishan", "Lal", "Madan"
    ]
    
    # Rajasthani last names
    last_names = [
        "Sharma", "Gupta", "Jain", "Meena", "Yadav",
        "Verma", "Singh", "Choudhary", "Saini", "Rajput",
        "Kumawat", "Soni", "Agarwal", "Bansal", "Mittal",
        "Goyal", "Khandelwal", "Maheshwari", "Rathore", "Shekhawat"
    ]
    
    # Jaipur area coordinates (approximate)
    jaipur_center = (26.9124, 75.7873)
    
    # Jaipur localities
    localities = [
        "Malviya Nagar", "Vaishali Nagar", "Mansarovar", "Raja Park",
        "Tonk Road", "Jagatpura", "Sodala", "Bani Park", "C-Scheme",
        "MI Road", "Sanganer", "Sitapura", "Vidhyadhar Nagar", "Jhotwara"
    ]
    
    users = []
    for i in range(50):
        # Random location within ~5km of Jaipur center
        lat = jaipur_center[0] + np.random.uniform(-0.05, 0.05)
        lon = jaipur_center[1] + np.random.uniform(-0.05, 0.05)
        
        user = {
            "id": f"JA-{10000 + i}",
            "name": f"{np.random.choice(first_names)} {np.random.choice(last_names)}",
            "locality": np.random.choice(localities),
            "lat": round(lat, 6),  # Flat structure for Kepler
            "lon": round(lon, 6),  # Flat structure for Kepler
            "connection_type": np.random.choice(["Domestic", "Commercial", "Industrial"], p=[0.7, 0.2, 0.1]),
            "meter_id": f"WM-{np.random.randint(100000, 999999)}",
            "avg_daily_usage_liters": round(np.random.uniform(100, 500), 1),
            "last_bill_amount": round(np.random.uniform(200, 1500), 2),
            "phone": f"+91 {np.random.randint(7000000000, 9999999999)}"
        }
        users.append(user)
    
    with open('data/janaadhaar_users.json', 'w') as f:
        json.dump(users, f, indent=2)
    
    print(f"   ✅ Created data/janaadhaar_users.json ({len(users)} users)")
    return users


# =============================================================================
# 3. NETWORK GRAPH (PIPE NETWORK)
# =============================================================================

def generate_network():
    """
    Generate a synthetic pipe network for Jaipur water distribution.
    Uses NetworkX to create a graph that can be used with WNTR.
    """
    print("🔧 Generating network.graphml...")
    
    # Create a water distribution network graph
    G = nx.Graph()
    
    # Jaipur center
    center = (26.9124, 75.7873)
    
    # Add reservoir/source node
    G.add_node("R1", 
               node_type="reservoir",
               latitude=center[0] + 0.02,
               longitude=center[1] - 0.02,
               elevation=350.0,
               name="Main Reservoir")
    
    # Add pump station
    G.add_node("P1",
               node_type="pump",
               latitude=center[0] + 0.015,
               longitude=center[1] - 0.015,
               elevation=340.0,
               name="Central Pump Station")
    
    # Add tank nodes
    tank_positions = [
        ("T1", 0.01, 0.01, "Malviya Nagar Tank"),
        ("T2", -0.01, 0.02, "Vaishali Nagar Tank"),
        ("T3", 0.02, -0.01, "Mansarovar Tank"),
    ]
    
    for tank_id, lat_offset, lon_offset, name in tank_positions:
        G.add_node(tank_id,
                   node_type="tank",
                   latitude=center[0] + lat_offset,
                   longitude=center[1] + lon_offset,
                   elevation=330.0,
                   name=name)
    
    # Add junction nodes (distribution points)
    junction_count = 20
    for i in range(junction_count):
        lat = center[0] + np.random.uniform(-0.03, 0.03)
        lon = center[1] + np.random.uniform(-0.03, 0.03)
        
        G.add_node(f"J{i+1}",
                   node_type="junction",
                   latitude=lat,
                   longitude=lon,
                   elevation=np.random.uniform(310, 340),
                   demand=np.random.uniform(10, 50))  # Base demand in LPS
    
    # Add pipes (edges)
    # Connect reservoir to pump
    G.add_edge("R1", "P1", pipe_id="PIPE_R1_P1", diameter=500, length=200, roughness=100)
    
    # Connect pump to tanks
    G.add_edge("P1", "T1", pipe_id="PIPE_P1_T1", diameter=400, length=1500, roughness=100)
    G.add_edge("P1", "T2", pipe_id="PIPE_P1_T2", diameter=400, length=2000, roughness=100)
    G.add_edge("P1", "T3", pipe_id="PIPE_P1_T3", diameter=400, length=1800, roughness=100)
    
    # Connect tanks to junctions
    for i in range(1, junction_count + 1):
        tank = np.random.choice(["T1", "T2", "T3"])
        diameter = np.random.choice([100, 150, 200, 250])
        length = np.random.uniform(200, 1000)
        G.add_edge(tank, f"J{i}", 
                   pipe_id=f"PIPE_{tank}_J{i}",
                   diameter=diameter,
                   length=round(length, 1),
                   roughness=np.random.uniform(90, 110))
    
    # Add some inter-junction connections for redundancy
    for i in range(5):
        j1 = f"J{np.random.randint(1, junction_count + 1)}"
        j2 = f"J{np.random.randint(1, junction_count + 1)}"
        if j1 != j2 and not G.has_edge(j1, j2):
            G.add_edge(j1, j2,
                       pipe_id=f"PIPE_{j1}_{j2}",
                       diameter=np.random.choice([100, 150]),
                       length=np.random.uniform(100, 500),
                       roughness=100)
    
    # Mark a potential leak location
    leak_junction = "J5"
    G.nodes[leak_junction]["leak_potential"] = True
    G.nodes[leak_junction]["name"] = "Suspected Leak Zone"
    
    # Save as GraphML
    nx.write_graphml(G, 'data/network.graphml')
    print(f"   ✅ Created data/network.graphml ({G.number_of_nodes()} nodes, {G.number_of_edges()} pipes)")
    
    return G


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏭 HYDROLUMINA DATA FACTORY")
    print("="*60 + "\n")
    
    # Generate all data
    energy_df = generate_energy_data()
    users = generate_janaadhaar_users()
    network = generate_network()
    
    print("\n" + "="*60)
    print("✅ DATA GENERATION COMPLETE!")
    print("="*60)
    print("\nGenerated files in /data folder:")
    print("  📊 energy_data.csv      - 24 hours of electricity readings")
    print("  👥 janaadhaar_users.json - 50 citizens with Jan Aadhaar IDs")
    print("  🔧 network.graphml       - Water pipe network graph")
    print("\n")
