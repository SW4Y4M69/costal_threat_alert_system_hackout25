
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  const [reading, setReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isAlertBlinking, setIsAlertBlinking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({ lat: 12.9716, lon: 80.22 });
  const [locationName, setLocationName] = useState('Chennai Coast');
  const [sensorMarkers, setSensorMarkers] = useState([]);
  const chartRef = useRef(null);
  const mapRef = useRef(null);
  const wsRef = useRef(null);
  const historyRef = useRef({ 
    ts: [], 
    tide: [], 
    wind: [], 
    pollution: [] 
  });
  const blinkIntervalRef = useRef(null);
  const dataIntervalRef = useRef(null);

  // Predefined coastal regions with their data
  const coastalRegions = [
    { name: 'Chennai Coast', lat: 12.9716, lon: 80.22, country: 'India' },
    { name: 'Mumbai Coast', lat: 19.0760, lon: 72.8777, country: 'India' },
    { name: 'Kolkata Coast', lat: 22.5726, lon: 88.3639, country: 'India' },
    { name: 'Kochi Coast', lat: 9.9312, lon: 76.2673, country: 'India' },
    { name: 'Vishakhapatnam Coast', lat: 17.6868, lon: 83.2185, country: 'India' },
    { name: 'Goa Coast', lat: 15.2993, lon: 74.1240, country: 'India' },
    { name: 'Puri Coast', lat: 19.8133, lon: 85.8312, country: 'India' },
    { name: 'Mangalore Coast', lat: 12.9141, lon: 74.8560, country: 'India' },
    { name: 'Tuticorin Coast', lat: 8.7642, lon: 78.1348, country: 'India' },
    { name: 'Paradip Coast', lat: 20.3164, lon: 86.6085, country: 'India' }
  ];

  // Function to generate simulated data for a specific location
  const generateLocationData = (lat, lon) => {
    const baseTide = Math.random() * 2 + 1.5; // 1.5-3.5m
    const baseWind = Math.random() * 30 + 15; // 15-45 km/h
    const basePollution = Math.random() * 60 + 20; // 20-80
    
    // Add some regional variations
    const regionalFactor = Math.sin(lat * Math.PI / 180) * 0.5 + 1;
    
    return {
      timestamp: new Date().toISOString(),
      tide_m: Math.round((baseTide * regionalFactor) * 100) / 100,
      wind_kmh: Math.round((baseWind * regionalFactor) * 10) / 10,
      pollution_index: Math.round((basePollution * regionalFactor) * 10) / 10,
      location: { lat, lon },
      is_model_anomaly: Math.random() < 0.05, // 5% chance of anomaly
      threshold_reasons: [],
      model_score: Math.random() * 0.2
    };
  };

  useEffect(() => {
    // Initialize chart with all three variables
    const ctx = document.getElementById('chart').getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Tide (m)',
            data: [],
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Wind (km/h)',
            data: [],
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Pollution Index',
            data: [],
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.4,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'second',
              displayFormats: {
                second: 'HH:mm:ss'
              }
            },
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Tide (m)'
            },
            min: 0,
            max: 8
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Wind (km/h)'
            },
            min: 0,
            max: 150,
            grid: {
              drawOnChartArea: false,
            },
          },
          y2: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Pollution Index'
            },
            min: 0,
            max: 500,
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Real-time Coastal Sensor Data - ${locationName}`
          }
        }
      }
    });

    // Initialize map
    mapRef.current = L.map('map').setView([selectedLocation.lat, selectedLocation.lon], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    // Add click handler for map
    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      // Find the closest predefined coastal region
      let closestRegion = coastalRegions[0];
      let minDistance = Infinity;
      
      coastalRegions.forEach(region => {
        const distance = Math.sqrt(
          Math.pow(region.lat - lat, 2) + Math.pow(region.lon - lng, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestRegion = region;
        }
      });

      // Update selected location
      setSelectedLocation({ lat: closestRegion.lat, lon: closestRegion.lon });
      setLocationName(closestRegion.name);
      
      // Generate new data for the selected location
      const newData = generateLocationData(closestRegion.lat, closestRegion.lon);
      setReading(newData);
      
      // Clear and restart chart data
      historyRef.current = { ts: [], tide: [], wind: [], pollution: [] };
      
      // Update chart title
      chartRef.current.options.plugins.title.text = `Real-time Coastal Sensor Data - ${closestRegion.name}`;
      chartRef.current.update();
      
      // Update map view
      mapRef.current.setView([closestRegion.lat, closestRegion.lon], 10);
    });

    // Add markers for all coastal regions
    const markers = coastalRegions.map(region => {
      const marker = L.marker([region.lat, region.lon])
        .bindPopup(`
          <div style="text-align: center;">
            <strong>${region.name}</strong><br/>
            ${region.country}<br/>
            <button onclick="window.selectLocation(${region.lat}, ${region.lon}, '${region.name}')" 
                    style="margin-top: 5px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
              Select This Location
            </button>
          </div>
        `)
        .addTo(mapRef.current);
      
      // Add different colors for different regions
      if (region.name === 'Chennai Coast') {
        marker.setIcon(L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #ff453a; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        }));
      }
      
      return marker;
    });
    
    setSensorMarkers(markers);

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
    
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'state') {
        const payload = msg.payload;
        
        // Check for new alerts and trigger blinking
        if (payload.alerts && payload.alerts.length > 0) {
          const latestAlert = payload.alerts[0];
          const currentTime = Date.now();
          const alertTime = new Date(latestAlert.timestamp).getTime();
          
          // If alert is very recent (within last 10 seconds), trigger blinking
          if (currentTime - alertTime < 10000) {
            triggerMapBlinking();
          }
        }
        
        setAlerts(payload.alerts || []);
        
        // Only update reading if it's for the currently selected location
        if (payload.reading) {
          const r = payload.reading;
          
          // Check if this reading is for the currently selected location
          const isCurrentLocation = (
            Math.abs(r.location.lat - selectedLocation.lat) < 0.01 &&
            Math.abs(r.location.lon - selectedLocation.lon) < 0.01
          );
          
          if (isCurrentLocation) {
            setReading(r);
            const h = historyRef.current;
            
            // Add new data point
            const timestamp = new Date(r.timestamp);
            h.ts.push(timestamp);
            h.tide.push(r.tide_m);
            h.wind.push(r.wind_kmh);
            h.pollution.push(r.pollution_index);
            
            // Keep only last 60 data points (2 minutes of data at 2-second intervals)
            const maxPoints = 60;
            if (h.ts.length > maxPoints) {
              h.ts.shift();
              h.tide.shift();
              h.wind.shift();
              h.pollution.shift();
            }
            
            // Update chart only if it exists and has data
            if (chartRef.current && h.ts.length > 0) {
              chartRef.current.data.labels = h.ts;
              chartRef.current.data.datasets[0].data = h.tide;
              chartRef.current.data.datasets[1].data = h.wind;
              chartRef.current.data.datasets[2].data = h.pollution;
              chartRef.current.update('none'); // Use 'none' for better performance
            }
          }
        }
      }
    };
    
    wsRef.current = ws;
    
    // Add global function for popup buttons
    window.selectLocation = (lat, lon, name) => {
      setSelectedLocation({ lat, lon });
      setLocationName(name);
      
      // Generate new data for the selected location
      const newData = generateLocationData(lat, lon);
      setReading(newData);
      
      // Clear and restart chart data
      historyRef.current = { ts: [], tide: [], wind: [], pollution: [] };
      
      // Add initial data point to prevent blank chart
      const timestamp = new Date();
      historyRef.current.ts.push(timestamp);
      historyRef.current.tide.push(newData.tide_m);
      historyRef.current.wind.push(newData.wind_kmh);
      historyRef.current.pollution.push(newData.pollution_index);
      
      // Update chart with initial data
      if (chartRef.current) {
        chartRef.current.data.labels = historyRef.current.ts;
        chartRef.current.data.datasets[0].data = historyRef.current.tide;
        chartRef.current.data.datasets[1].data = historyRef.current.wind;
        chartRef.current.data.datasets[2].data = historyRef.current.pollution;
        chartRef.current.options.plugins.title.text = `Real-time Coastal Sensor Data - ${name}`;
        chartRef.current.update();
      }
      
      // Update map view
      mapRef.current.setView([lat, lon], 10);
    };
    
    // Start data generation for the selected location
    const startDataGeneration = () => {
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
      }
      
      dataIntervalRef.current = setInterval(() => {
        const newData = generateLocationData(selectedLocation.lat, selectedLocation.lon);
        setReading(newData);
        
        const h = historyRef.current;
        const timestamp = new Date();
        h.ts.push(timestamp);
        h.tide.push(newData.tide_m);
        h.wind.push(newData.wind_kmh);
        h.pollution.push(newData.pollution_index);
        
        // Keep only last 60 data points
        const maxPoints = 60;
        if (h.ts.length > maxPoints) {
          h.ts.shift();
          h.tide.shift();
          h.wind.shift();
          h.pollution.shift();
        }
        
        // Update chart
        if (chartRef.current && h.ts.length > 0) {
          chartRef.current.data.labels = h.ts;
          chartRef.current.data.datasets[0].data = h.tide;
          chartRef.current.data.datasets[1].data = h.wind;
          chartRef.current.data.datasets[2].data = h.pollution;
          chartRef.current.update('none');
        }
      }, 2000); // Update every 2 seconds
    };
    
    // Start initial data generation
    startDataGeneration();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (chartRef.current) chartRef.current.destroy();
      if (mapRef.current) mapRef.current.remove();
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
      if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
      delete window.selectLocation;
    };
  }, [selectedLocation, locationName]);

  // Function to trigger map blinking
  const triggerMapBlinking = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    
    setIsAlertBlinking(true);
    
    blinkIntervalRef.current = setInterval(() => {
      setIsAlertBlinking(false);
    }, 5000); // Stop blinking after 5 seconds
  };

  // Function to manually select a location
  const selectLocation = (lat, lon, name) => {
    setSelectedLocation({ lat, lon });
    setLocationName(name);
    
    // Generate new data for the selected location
    const newData = generateLocationData(lat, lon);
    setReading(newData);
    
    // Clear and restart chart data
    historyRef.current = { ts: [], tide: [], wind: [], pollution: [] };
    
    // Add initial data point to prevent blank chart
    const timestamp = new Date();
    historyRef.current.ts.push(timestamp);
    historyRef.current.tide.push(newData.tide_m);
    historyRef.current.wind.push(newData.wind_kmh);
    historyRef.current.pollution.push(newData.pollution_index);
    
    // Update chart with initial data
    if (chartRef.current) {
      chartRef.current.data.labels = historyRef.current.ts;
      chartRef.current.data.datasets[0].data = historyRef.current.tide;
      chartRef.current.data.datasets[1].data = historyRef.current.wind;
      chartRef.current.data.datasets[2].data = historyRef.current.pollution;
      chartRef.current.options.plugins.title.text = `Real-time Coastal Sensor Data - ${name}`;
      chartRef.current.update();
    }
    
    // Update map view
    mapRef.current.setView([lat, lon], 10);
    
    // Restart data generation for new location
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
    }
    
    dataIntervalRef.current = setInterval(() => {
      const newData = generateLocationData(lat, lon);
      setReading(newData);
      
      const h = historyRef.current;
      const timestamp = new Date();
      h.ts.push(timestamp);
      h.tide.push(newData.tide_m);
      h.wind.push(newData.wind_kmh);
      h.pollution.push(newData.pollution_index);
      
      // Keep only last 60 data points
      const maxPoints = 60;
      if (h.ts.length > maxPoints) {
        h.ts.shift();
        h.tide.shift();
        h.wind.shift();
        h.pollution.shift();
      }
      
      // Update chart
      if (chartRef.current && h.ts.length > 0) {
        chartRef.current.data.labels = h.ts;
        chartRef.current.data.datasets[0].data = h.tide;
        chartRef.current.data.datasets[1].data = h.wind;
        chartRef.current.data.datasets[2].data = h.pollution;
        chartRef.current.update('none');
      }
    }, 2000);
  };

  return (
    <div className="container">
      <h2>Coastal Threat Alert — Interactive Dashboard</h2>
      
      {/* Location Selector */}
      <div style={{marginBottom: 20, padding: 12, background: '#f8f9fa', borderRadius: 8}}>
        <h4>Select Coastal Region</h4>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
          {coastalRegions.map((region, index) => (
            <button
              key={index}
              onClick={() => selectLocation(region.lat, region.lon, region.name)}
              style={{
                padding: '8px 16px',
                backgroundColor: locationName === region.name ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {region.name}
            </button>
          ))}
        </div>
        <div style={{marginTop: 10, fontSize: '14px', color: '#666'}}>
          <strong>Current Location:</strong> {locationName} ({selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)})
        </div>
      </div>

      <div style={{display:'flex', gap:20}}>
        <div style={{flex:1}}>
          <div style={{padding:12, background:'#fff', borderRadius:8, boxShadow:'0 2px 6px rgba(0,0,0,0.08)'}}>
            <h4>Live Sensor - {locationName}</h4>
            {reading ? (
              <div>
                <div><strong>{new Date(reading.timestamp).toLocaleString()}</strong></div>
                <div style={{marginTop: 8}}>
                  <div style={{color: '#0d6efd'}}>🌊 Tide: {reading.tide_m} m</div>
                  <div style={{color: '#198754'}}>💨 Wind: {reading.wind_kmh} km/h</div>
                  <div style={{color: '#dc3545'}}>☁️ Pollution: {reading.pollution_index}</div>
                  {reading.is_model_anomaly && (
                    <div style={{color: '#ffc107', fontWeight: 'bold'}}>⚠️ Anomaly Detected</div>
                  )}
                </div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>
          
          <div style={{marginTop:12, padding:12, background:'#fff', borderRadius:8}}>
            <h4>Alerts</h4>
            <div style={{maxHeight:300, overflow:'auto'}}>
              {alerts.length === 0 ? (
                <div>No alerts</div>
              ) : (
                alerts.map(a => (
                  <div 
                    key={a.id} 
                    style={{
                      padding: 8, 
                      borderLeft: `4px solid ${a.severity === 'high' ? '#ff453a' : a.severity === 'medium' ? '#ff9f0a' : '#28a745'}`,
                      marginBottom: 8,
                      borderRadius: '4px',
                      backgroundColor: a.severity === 'high' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 159, 10, 0.1)'
                    }}
                  >
                    <div><strong>{a.severity.toUpperCase()}</strong> - {a.type}</div>
                    <div>{a.message}</div>
                    <div style={{fontSize: '0.8em', color: '#666'}}>
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div style={{flex:2}}>
          <div style={{padding:12, background:'#fff', borderRadius:8}}>
            <h4>Real-time Trends - {locationName}</h4>
            <canvas id="chart" height="200"></canvas>
          </div>
          
          <div style={{marginTop:12, padding:12, background:'#fff', borderRadius:8}}>
            <h4>Interactive Coastal Map</h4>
            <div style={{marginBottom: 10, fontSize: '14px', color: '#666'}}>
              💡 <strong>Tip:</strong> Click on the map or use the buttons above to select different coastal regions
            </div>
            <div 
              id="map" 
              style={{
                height: 300,
                border: isAlertBlinking ? '3px solid #ff453a' : '1px solid #ddd',
                borderRadius: '8px',
                transition: 'border 0.5s ease-in-out'
              }}
            ></div>
            {isAlertBlinking && (
              <div style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: '#ff453a',
                color: 'white',
                borderRadius: 4,
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                🚨 ALERT DETECTED - Sensor Location Highlighted
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

