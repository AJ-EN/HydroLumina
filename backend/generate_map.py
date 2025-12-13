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
config = {
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
                        "color": [0, 255, 255], # Cyan
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
                        "label": "ISRO NISAR Anomaly",
                        "color": [255, 0, 0], # Red
                        "columns": {"geojson": "geometry"},
                        "isVisible": True,
                        "visConfig": {"opacity": 0.4, "stroked": True, "filled": True}
                    }
                }
            ]
        },
        "mapStyle": {
            "styleType": "dark" # Government/Sci-Fi look
        }
    }
}

# Generate Map
map_1 = KeplerGl(height=800, config=config)
map_1.add_data(data=df_users, name="citizens")
map_1.add_data(data=satellite_geo, name="satellite")

# Save directly to Frontend Public folder
output_path = f"{OUTPUT_DIR}/map.html"
map_1.save_to_html(file_name=output_path)

print(f"✅ Map generated successfully at: {output_path}")
