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

// Infrastructure node icons
const createNodeIcon = (nodeType, isLeak = false) => {
    const configs = {
        reservoir: { icon: '💧', bg: '#3b82f6', size: 28 },
        pump: { icon: '⚡', bg: '#f59e0b', size: 24 },
        tank: { icon: '🏛️', bg: '#8b5cf6', size: 24 },
        junction: {
            icon: isLeak ? '⚠️' : '●',
            bg: isLeak ? '#ff2a2a' : '#1a1a1a',
            size: isLeak ? 20 : 12
        }
    };
    const config = configs[nodeType] || configs.junction;

    return L.divIcon({
        className: 'infra-node',
        html: `<div style="
            width: ${config.size}px;
            height: ${config.size}px;
            background: ${config.bg};
            border: 2px solid ${isLeak ? '#ff2a2a' : 'rgba(255,255,255,0.3)'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${config.size * 0.5}px;
            box-shadow: 0 0 ${isLeak ? '15px' : '8px'} ${config.bg}80;
            ${isLeak ? 'animation: pulse 1s ease-in-out infinite;' : ''}
        ">${config.icon}</div>`,
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size / 2]
    });
};

// Custom component to handle map transitions
const MapController = ({ leakMode, leakLocation }) => {
    const map = useMap();

    useEffect(() => {
        if (leakMode && leakLocation) {
            map.flyTo([leakLocation.lat, leakLocation.lon], 16, {
                duration: 2,
                easeLinearity: 0.25
            });
        } else if (!leakMode) {
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
    const [pipeNetwork, setPipeNetwork] = useState(null);
    const [infraNodes, setInfraNodes] = useState([]);

    // Fetch Static Data on Load
    useEffect(() => {
        fetch('http://127.0.0.1:8000/users')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error && Array.isArray(data)) {
                    setJanAadhaarUsers(data);
                }
            })
            .catch(err => console.error("Failed to fetch users:", err));

        fetch('http://127.0.0.1:8000/satellite-zones')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setSatelliteZones(data);
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

    // Fetch Pipe Network with Infrastructure Nodes
    useEffect(() => {
        fetch(`http://127.0.0.1:8000/pipe-network?leak_mode=${leakMode}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.features) {
                    setPipeNetwork(data);
                    // Extract infrastructure nodes
                    if (data.nodes) {
                        setInfraNodes(data.nodes);
                    }
                }
            })
            .catch(err => console.error("Pipe fetch error:", err));
    }, [leakMode]);

    // Satellite zone styling
    const satelliteStyle = useMemo(() => (feature) => {
        const severity = feature.properties?.severity || 'WARNING';
        const isPolygon = feature.geometry?.type === 'Polygon';
        if (!isPolygon) return { opacity: 0, fillOpacity: 0 };
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

    // Enhanced pipe styling with animation support
    const pipeStyle = useMemo(() => (feature) => {
        const props = feature.properties || {};
        const status = props.status || 'NORMAL';
        const pipeClass = props.pipe_class || 'DISTRIBUTION';

        // Base weight from pipe class
        let weight = props.weight || 2;

        // Dash pattern for flow animation
        let dashArray = null;
        let dashOffset = null;

        if (status === 'CRITICAL') {
            dashArray = '10, 8';
        } else if (props.animated) {
            // Animated flow pattern
            dashArray = '4, 8';
        }

        return {
            color: props.color || '#00f2ff',
            weight: weight,
            opacity: status === 'CRITICAL' ? 1 : 0.8,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round',
            className: `pipe-line ${status.toLowerCase()} ${pipeClass.toLowerCase()} ${props.animated ? 'animated' : ''}`
        };
    }, []);

    // User click handler
    const handleUserClick = useCallback((user) => {
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
        <div style={{ width: '100%', height: '100%' }}>
            <MapContainer
                center={[26.9124, 75.7873]}
                zoom={14}
                style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController leakMode={leakMode} leakLocation={leakLocation} />

                {/* PIPE NETWORK - Enhanced Visualization */}
                {pipeNetwork && pipeNetwork.features?.length > 0 && (
                    <GeoJSON
                        key={`pipes-${leakMode}-${Date.now()}`}
                        data={pipeNetwork}
                        style={pipeStyle}
                        onEachFeature={(feature, layer) => {
                            const props = feature.properties;
                            const statusColor = props.status === 'CRITICAL' ? '#ff2a2a' :
                                props.status === 'REDUCED' ? '#ffaa00' : '#4ade80';

                            layer.bindPopup(
                                `<div class="pipe-popup-content">
                                    <div class="popup-header" style="border-color:${props.color};">
                                        <span class="pipe-class ${props.pipe_class?.toLowerCase()}">${props.pipe_class}</span>
                                        <span class="pipe-id">${props.pipe_id}</span>
                                    </div>
                                    <div class="popup-body">
                                        <div class="popup-row">
                                            <span class="label">ROUTE</span>
                                            <span class="value">${props.from_node} → ${props.to_node}</span>
                                        </div>
                                        <div class="popup-row">
                                            <span class="label">DIAMETER</span>
                                            <span class="value">${props.diameter_mm}mm</span>
                                        </div>
                                        <div class="popup-row">
                                            <span class="label">LENGTH</span>
                                            <span class="value">${props.length_m}m</span>
                                        </div>
                                        <div class="popup-divider"></div>
                                        <div class="popup-row highlight">
                                            <span class="label">FLOW RATE</span>
                                            <span class="value flow">${props.flow_lpm} LPM</span>
                                        </div>
                                        <div class="popup-row">
                                            <span class="label">VELOCITY</span>
                                            <span class="value">${props.flow_velocity} m/s</span>
                                        </div>
                                        <div class="popup-row">
                                            <span class="label">PRESSURE LOSS</span>
                                            <span class="value" style="color:${props.pressure_loss_pct > 50 ? '#ff2a2a' : '#888'};">${props.pressure_loss_pct}%</span>
                                        </div>
                                        <div class="popup-status" style="background:${statusColor}20;border-color:${statusColor};">
                                            <span style="color:${statusColor};">● ${props.status}</span>
                                        </div>
                                    </div>
                                </div>`,
                                { className: 'custom-pipe-popup' }
                            );
                        }}
                    />
                )}

                {/* INFRASTRUCTURE NODES - Reservoir, Pump, Tank, Junction */}
                {infraNodes.map((node, index) => {
                    const props = node.properties;
                    const coords = node.geometry.coordinates;

                    // Skip regular junctions in normal mode to reduce clutter
                    if (props.node_type === 'junction' && !props.is_leak && !leakMode) {
                        return null;
                    }

                    return (
                        <Marker
                            key={`node-${props.node_id}-${index}`}
                            position={[coords[1], coords[0]]}
                            icon={createNodeIcon(props.node_type, props.is_leak)}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', minWidth: '140px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px',
                                        paddingBottom: '8px',
                                        borderBottom: `2px solid ${props.color}`
                                    }}>
                                        <span style={{ fontSize: '18px' }}>{props.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: props.color }}>{props.name}</div>
                                            <div style={{ fontSize: '9px', color: '#888' }}>{props.node_type.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div style={{ color: '#888' }}>
                                        <div>ELEVATION: {props.elevation}m</div>
                                        {props.demand_lps > 0 && <div>DEMAND: {props.demand_lps} L/s</div>}
                                    </div>
                                    {props.is_leak && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '6px',
                                            background: 'rgba(255,42,42,0.2)',
                                            border: '1px solid #ff2a2a',
                                            borderRadius: '4px',
                                            color: '#ff2a2a',
                                            textAlign: 'center'
                                        }}>
                                            ⚠️ LEAK DETECTED
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* SATELLITE ZONES */}
                {polygonData && polygonData.features.length > 0 && (
                    <GeoJSON
                        key={`zones-${leakMode}`}
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

                {/* LEAK POINT MARKER */}
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

                {/* JAN AADHAAR USERS */}
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

            {/* Enhanced CSS Styles */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                }
                @keyframes flowAnimation {
                    0% { stroke-dashoffset: 24; }
                    100% { stroke-dashoffset: 0; }
                }
                .leak-marker, .infra-node { background: transparent; border: none; }
                
                /* Pipe animations */
                .pipe-line.animated path {
                    animation: flowAnimation 1s linear infinite;
                }
                .pipe-line.critical path {
                    filter: drop-shadow(0 0 6px #ff2a2a);
                }
                .pipe-line.main path {
                    filter: drop-shadow(0 0 3px #00f2ff40);
                }
                
                /* Popup styling */
                .leaflet-popup-content-wrapper {
                    background: rgba(10, 10, 10, 0.98);
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: #fff;
                    padding: 0;
                }
                .leaflet-popup-tip { background: rgba(10, 10, 10, 0.98); }
                .leaflet-popup-content { margin: 0; }
                
                .custom-pipe-popup .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .pipe-popup-content {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    min-width: 180px;
                }
                .pipe-popup-content .popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #111;
                    border-bottom: 2px solid #00f2ff;
                }
                .pipe-popup-content .pipe-class {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 8px;
                    font-weight: bold;
                }
                .pipe-popup-content .pipe-class.main { background: #00f2ff30; color: #00f2ff; }
                .pipe-popup-content .pipe-class.secondary { background: #00d4aa30; color: #00d4aa; }
                .pipe-popup-content .pipe-class.distribution { background: #00b8d430; color: #00b8d4; }
                .pipe-popup-content .pipe-id { color: #888; }
                .pipe-popup-content .popup-body { padding: 10px 12px; }
                .pipe-popup-content .popup-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                .pipe-popup-content .popup-row .label { color: #666; }
                .pipe-popup-content .popup-row .value { color: #fff; }
                .pipe-popup-content .popup-row .value.flow { color: #00f2ff; font-weight: bold; }
                .pipe-popup-content .popup-divider {
                    height: 1px;
                    background: #333;
                    margin: 8px 0;
                }
                .pipe-popup-content .popup-status {
                    margin-top: 8px;
                    padding: 6px;
                    border-radius: 4px;
                    text-align: center;
                    font-weight: bold;
                    border: 1px solid;
                }
                
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
    const R = 6371;
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
