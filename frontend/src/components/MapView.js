import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom leak icon
const leakIcon = L.divIcon({
    className: 'leak-marker',
    html: `<div style="
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, #ff2a2a 0%, transparent 70%);
    border: 2px solid #ff2a2a;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Custom component to handle map transitions
const MapController = ({ leakMode, leakLocation }) => {
    const map = useMap();

    useEffect(() => {
        if (leakMode && leakLocation) {
            // Fly to leak location with smooth animation
            map.flyTo([leakLocation.lat, leakLocation.lon], 16, {
                duration: 2,
                easeLinearity: 0.25
            });
        } else if (!leakMode) {
            // Reset to overview
            map.flyTo([26.9124, 75.7873], 14, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [leakMode, leakLocation, map]);

    return null;
};

const MapView = ({ leakMode, onUserSelect }) => {
    const [janAadhaarUsers, setJanAadhaarUsers] = useState([]);
    const [satelliteZones, setSatelliteZones] = useState(null);
    const [leakLocation, setLeakLocation] = useState(null);

    // Fetch Data on Load
    useEffect(() => {
        // Fetch Users
        fetch('http://127.0.0.1:8000/users')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error && Array.isArray(data)) {
                    setJanAadhaarUsers(data);
                }
            })
            .catch(err => console.error("Failed to fetch users:", err));

        // Fetch Satellite Zones
        fetch('http://127.0.0.1:8000/satellite-zones')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setSatelliteZones(data);
                    // Extract leak point from satellite data
                    const leakPoint = data.features?.find(f => f.geometry?.type === 'Point');
                    if (leakPoint) {
                        setLeakLocation({
                            lat: leakPoint.geometry.coordinates[1],
                            lon: leakPoint.geometry.coordinates[0],
                            properties: leakPoint.properties
                        });
                    }
                }
            })
            .catch(err => console.error("Failed to fetch satellite zones:", err));
    }, []);

    // Memoized style function to avoid re-creating on every render
    const satelliteStyle = useMemo(() => (feature) => {
        const severity = feature.properties?.severity || 'WARNING';
        const isPolygon = feature.geometry?.type === 'Polygon';

        if (!isPolygon) return { opacity: 0, fillOpacity: 0 }; // Hide non-polygon features

        return {
            fillColor: severity === 'CRITICAL' ? '#ff2a2a' : '#ffaa00',
            fillOpacity: leakMode ? 0.35 : 0,
            color: severity === 'CRITICAL' ? '#ff2a2a' : '#ffaa00',
            weight: leakMode ? 2 : 0,
            dashArray: '6, 4'
        };
    }, [leakMode]);

    // Filter polygons only for GeoJSON
    const polygonData = useMemo(() => {
        if (!satelliteZones) return null;
        return {
            ...satelliteZones,
            features: satelliteZones.features?.filter(f => f.geometry?.type === 'Polygon') || []
        };
    }, [satelliteZones]);

    // Handle click on user marker
    const handleUserClick = useCallback((user) => {
        // Enrich with defaults for dossier display
        const enrichedUser = {
            ...user,
            name: user.name || 'Unknown User',
            id: user.id || 'N/A',
            location: user.locality || 'Unknown',
            coordinates: { lat: user.lat, lon: user.lon },
            family_members: user.family_size || 4,
            status: leakMode ? 'POTENTIAL_IMPACT' : 'NORMAL',
            bsr_code: 'PHED-2024-Item-4.2',
            bsr_description: 'Standard Pipe Repair',
            est_cost: '₹ 8,500',
            contractor: 'Jal Nigam Maintenance',
            repair_priority: leakMode ? 'P1 - IMMEDIATE' : 'P3 - ROUTINE',
            distance_to_leak_km: leakLocation
                ? calculateDistance(user.lat, user.lon, leakLocation.lat, leakLocation.lon).toFixed(2)
                : 'N/A'
        };
        onUserSelect(enrichedUser);
    }, [onUserSelect, leakMode, leakLocation]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-dim)'
        }}>
            <MapContainer
                center={[26.9124, 75.7873]}
                zoom={14}
                style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
                zoomControl={true}
            >
                {/* Dark theme tile layer - CartoDB Dark Matter */}
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Map Controller for transitions */}
                <MapController leakMode={leakMode} leakLocation={leakLocation} />

                {/* SATELLITE ZONES (GeoJSON polygons) - Only render when leakMode changes */}
                {polygonData && polygonData.features.length > 0 && (
                    <GeoJSON
                        key={`zones-${leakMode}`} // Force re-render on mode change
                        data={polygonData}
                        style={satelliteStyle}
                        onEachFeature={(feature, layer) => {
                            if (feature.properties?.name) {
                                layer.bindTooltip(
                                    `<div style="background:#111;color:#fff;padding:4px 8px;border:1px solid #ff2a2a;font-size:11px;">
                    <strong>${feature.properties.name}</strong><br/>
                    <span style="color:#ff2a2a;">${feature.properties.severity || 'ALERT'}</span>
                  </div>`,
                                    { permanent: false, direction: 'top', className: '' }
                                );
                            }
                        }}
                    />
                )}

                {/* LEAK POINT MARKER (pulsing red) */}
                {leakMode && leakLocation && (
                    <Marker position={[leakLocation.lat, leakLocation.lon]} icon={leakIcon}>
                        <Popup>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                                <strong style={{ color: '#ff2a2a' }}>LEAK DETECTED</strong><br />
                                {leakLocation.properties?.name || 'Junction J5'}<br />
                                <span style={{ color: '#888' }}>
                                    {leakLocation.lat.toFixed(4)}, {leakLocation.lon.toFixed(4)}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* JAN AADHAAR USERS (Circle Markers) */}
                {janAadhaarUsers.map((user, index) => (
                    <CircleMarker
                        key={user.id || index}
                        center={[user.lat, user.lon]}
                        radius={leakMode ? 10 : 7}
                        pathOptions={{
                            fillColor: leakMode ? '#ffaa00' : '#00f2ff',
                            fillOpacity: 0.85,
                            color: '#ffffff',
                            weight: 2
                        }}
                        eventHandlers={{
                            click: () => handleUserClick(user)
                        }}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', minWidth: '150px' }}>
                                <strong>{user.name}</strong><br />
                                <span style={{ color: '#888' }}>ID: {user.id}</span><br />
                                <span style={{ color: '#00f2ff' }}>{user.locality}</span>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Injection of pulse animation CSS */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        .leak-marker { background: transparent; border: none; }
        .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 10, 0.95);
          border: 1px solid #333;
          border-radius: 4px;
          color: #fff;
        }
        .leaflet-popup-tip { background: rgba(10, 10, 10, 0.95); }
        .leaflet-control-zoom a {
          background: #111 !important;
          color: #fff !important;
          border: 1px solid #333 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #222 !important;
        }
      `}</style>
        </div>
    );
};

// Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default MapView;
