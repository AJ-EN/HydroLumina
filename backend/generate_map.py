from keplergl import KeplerGl
import pandas as pd
import json
import os

# Ensure output directory exists
OUTPUT_DIR = "../frontend/public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load Data
df_users = pd.read_json("../data/janaadhaar_users.json")
with open("../data/satellite.json", "r") as f:
    satellite_geo = json.load(f)

# Config for Dark Mode & Layers
config_base = {
    "version": "v1",
    "config": {
        "visState": {
            "layers": [
                {
                    "id": "jan_aadhaar_layer",
                    "type": "point",
                    "config": {
                        "dataId": "citizens",
                        "label": "Jan Aadhaar Households",
                        "color": [0, 255, 255],  # Cyan
                        "columns": {"lat": "lat", "lng": "lon"},
                        "isVisible": True,
                        "visConfig": {"radius": 15, "opacity": 0.8}
                    }
                }
            ]
        },
        "mapStyle": {
            "styleType": "dark"  # Government/Sci-Fi look
        },
        "mapState": {
            "latitude": 26.9124,
            "longitude": 75.7873,
            "zoom": 12
        }
    }
}

# Config for Leak Mode (with satellite layer)
config_leak = {
    "version": "v1",
    "config": {
        "visState": {
            "layers": [
                {
                    "id": "jan_aadhaar_layer",
                    "type": "point",
                    "config": {
                        "dataId": "citizens",
                        "label": "Jan Aadhaar Households",
                        "color": [0, 255, 255],  # Cyan
                        "columns": {"lat": "lat", "lng": "lon"},
                        "isVisible": True,
                        "visConfig": {"radius": 15, "opacity": 0.8}
                    }
                },
                {
                    "id": "satellite_layer",
                    "type": "geojson",
                    "config": {
                        "dataId": "satellite",
                        "label": "ISRO NISAR Anomaly Zones",
                        "color": [255, 42, 42],  # Alert Red
                        "columns": {"geojson": "_geojson"},
                        "isVisible": True,
                        "visConfig": {
                            "opacity": 0.5,
                            "stroked": True,
                            "filled": True,
                            "strokeColor": [255, 42, 42],
                            "strokeWidth": 2
                        }
                    }
                }
            ]
        },
        "mapStyle": {
            "styleType": "dark"
        },
        "mapState": {
            "latitude": 26.9124,
            "longitude": 75.7873,
            "zoom": 12
        }
    }
}

print("🗺️  Generating Kepler maps...")

# ============================================
# 1. NORMAL MAP (Peace Time - No Red Zones)
# ============================================
map_normal = KeplerGl(height=800, config=config_base)
map_normal.add_data(data=df_users, name="citizens")
# NO satellite data for normal mode
map_normal.save_to_html(file_name=f"{OUTPUT_DIR}/map_normal.html")
print("   ✅ Generated map_normal.html (Peace Time)")

# ============================================
# 2. LEAK MAP (War Time - With Red Zones)
# ============================================
map_leak = KeplerGl(height=800, config=config_leak)
map_leak.add_data(data=df_users, name="citizens")
map_leak.add_data(data=satellite_geo, name="satellite")  # <--- THE RED BLOB
map_leak.save_to_html(file_name=f"{OUTPUT_DIR}/map_leak.html")
print("   ✅ Generated map_leak.html (Alert Mode with NISAR Anomalies)")

# ============================================
# 3. LEGACY SUPPORT (keep map.html as leak map)
# ============================================
import shutil
shutil.copy(f"{OUTPUT_DIR}/map_leak.html", f"{OUTPUT_DIR}/map.html")
print("   ✅ Copied map_leak.html → map.html (legacy support)")

print("\n🎯 Map generation complete!")
print("   - map_normal.html: Clean citizen view")
print("   - map_leak.html: NISAR anomaly zones visible")
