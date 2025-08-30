/*
const API_URL = "http://127.0.0.1:8000"; // backend

async function testBackend() {
  try {
    const res = await fetch(`${API_URL}/alerts`);  // assuming /alerts route exists
    const data = await res.json();
    console.log("✅ Connected to backend! Alerts:", data);
    document.body.innerHTML += "<p style='color:green'>Connected to backend! Check console.</p>";
  } catch (err) {
    console.error("❌ Could not reach backend:", err);
    document.body.innerHTML += "<p style='color:red'>Failed to connect to backend.</p>";
  }
}

// run on page load
window.onload = testBackend;

/*const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';*/
/*const API_URL = "http://127.0.0.1:8000";*/
/*
const WS_URL = "ws://127.0.0.1:8000/ws";


let ws = null;
let chart = null;
let history = { ts: [], tide: [], wind: [], pollution: [] };
let marker = null;

function initChart() {
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.ts,
      datasets: [
        { label: 'Tide (m)', data: history.tide, yAxisID:'y', tension:0.3, borderColor:'#0d6efd' },
        { label: 'Wind (km/h)', data: history.wind, yAxisID:'y2', tension:0.3, borderColor:'#20c997' },
        { label: 'Pollution', data: history.pollution, yAxisID:'y3', tension:0.3, borderColor:'#ff7b00' },
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      stacked: false,
      scales: {
        y: { type: 'linear', position: 'left' },
        y2: { type: 'linear', position: 'right', grid: { drawOnChartArea:false } },
        y3: { type: 'linear', position: 'right', grid: { drawOnChartArea:false }, offset: true }
      }
    }
  });
}

function initMap(lat=12.9716, lon=80.22) {
  const map = L.map('map').setView([lat, lon], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap'
  }).addTo(map);
  marker = L.marker([lat, lon]).addTo(map).bindPopup('Sensor Location').openPopup();
}

function renderReading(r) {
  if (!r) {
    document.getElementById('reading').innerText = 'No data yet';
    return;
  }
  const html = `
    <div><strong>${new Date(r.timestamp).toLocaleString()}</strong></div>
    <div>Tide: <span class="badge bg-primary">${r.tide_m} m</span></div>
    <div>Wind: <span class="badge bg-info text-dark">${r.wind_kmh} km/h</span></div>
    <div>Pollution: <span class="badge bg-warning text-dark">${r.pollution_index}</span></div>
    <div class="mt-2">Model anomaly: <b>${r.is_model_anomaly}</b></div>
    <div>Threshold reasons: ${r.threshold_reasons && r.threshold_reasons.length ? r.threshold_reasons.join(', ') : 'None'}</div>
  `;
  document.getElementById('reading').innerHTML = html;
}

function renderAlerts(list) {
  const container = document.getElementById('alertsFeed');
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="text-muted">No alerts</div>';
    return;
  }
  container.innerHTML = list.map(a => {
    const cls = a.severity === 'high' ? 'alert-high' : (a.severity === 'medium' ? 'alert-med' : 'alert-low');
    return `<div class="alert-pill ${cls}">
      <div><strong>${a.severity.toUpperCase()}</strong> • ${a.type}</div>
      <div style="font-size:0.95rem">${a.message}</div>
      <div style="font-size:0.8rem;color:#666">${new Date(a.timestamp).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function updateChart(ts, tide, wind, pollution) {
  history.ts.push(ts);
  history.tide.push(tide);
  history.wind.push(wind);
  history.pollution.push(pollution);
  if (history.ts.length > 50) {
    history.ts.shift(); history.tide.shift(); history.wind.shift(); history.pollution.shift();
  }
  chart.data.labels = history.ts.map(t => new Date(t).toLocaleTimeString());
  chart.data.datasets[0].data = history.tide;
  chart.data.datasets[1].data = history.wind;
  chart.data.datasets[2].data = history.pollution;
  chart.update();
}

function connectWS() {
  ws = new WebSocket(WS_URL);
  ws.onopen = () => { console.log('WS open'); ws.send('ping'); };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'state') {
        const payload = msg.payload;
        const r = payload.reading;
        const a = payload.alerts;
        renderReading(r);
        renderAlerts(a);
        if (r) {
          updateChart(r.timestamp, r.tide_m, r.wind_kmh, r.pollution_index);
          if (marker) marker.setLatLng([r.location.lat, r.location.lon]).bindPopup(`Tide ${r.tide_m}m`).openPopup();
        }
      }
    } catch(e) { console.error('WS parse', e); }
  };
  ws.onclose = () => { console.log('WS closed, reconnecting in 2s'); setTimeout(connectWS, 2000); };
  ws.onerror = (e) => { console.error('WS error', e); ws.close(); };
}

document.addEventListener('DOMContentLoaded', () => {
  initChart();
  initMap();
  connectWS();
  document.getElementById('btn-manual').addEventListener('click', async () => {
    const msg = prompt('Manual alert message', 'Test manual alert - please ignore');
    if (!msg) return;
    const form = new FormData();
    form.append('message', msg);
    form.append('severity', 'medium');
    await fetch('/api/manual_alert', { method: 'POST', body: form });
    alert('Manual alert submitted.');
  });
  document.getElementById('btn-export').addEventListener('click', () => { window.location = '/api/export_alerts'; });
});
*/
// Backend API URL
const API_URL = "http://127.0.0.1:8000"; // backend
const WS_URL = "ws://127.0.0.1:8000/ws"; // WebSocket URL

let ws = null;
let chart = null;
let marker = null;
let history = { ts: [], tide: [], wind: [], pollution: [] };

// ================= Backend Test =================
async function testBackend() {
  try {
    const res = await fetch(`${API_URL}/alerts`);
    const data = await res.json();
    console.log("✅ Connected to backend! Alerts:", data);
    document.body.innerHTML += "<p style='color:green'>Connected to backend! Check console.</p>";
  } catch (err) {
    console.error("❌ Could not reach backend:", err);
    document.body.innerHTML += "<p style='color:red'>Failed to connect to backend.</p>";
  }
}

window.onload = testBackend;

// ================= Chart =================
function initChart() {
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.ts,
      datasets: [
        { label: 'Tide (m)', data: history.tide, yAxisID:'y', tension:0.3, borderColor:'#0d6efd' },
        { label: 'Wind (km/h)', data: history.wind, yAxisID:'y2', tension:0.3, borderColor:'#20c997' },
        { label: 'Pollution', data: history.pollution, yAxisID:'y3', tension:0.3, borderColor:'#ff7b00' },
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      stacked: false,
      scales: {
        y: { type: 'linear', position: 'left' },
        y2: { type: 'linear', position: 'right', grid: { drawOnChartArea:false } },
        y3: { type: 'linear', position: 'right', grid: { drawOnChartArea:false }, offset: true }
      }
    }
  });
}

function updateChart(ts, tide, wind, pollution) {
  history.ts.push(ts);
  history.tide.push(tide);
  history.wind.push(wind);
  history.pollution.push(pollution);

  if (history.ts.length > 50) {
    history.ts.shift(); history.tide.shift(); history.wind.shift(); history.pollution.shift();
  }

  chart.data.labels = history.ts.map(t => new Date(t).toLocaleTimeString());
  chart.data.datasets[0].data = history.tide;
  chart.data.datasets[1].data = history.wind;
  chart.data.datasets[2].data = history.pollution;
  chart.update();
}

// ================= Map =================
function initMap(lat=12.9716, lon=80.22) {
  const map = L.map('map').setView([lat, lon], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap'
  }).addTo(map);
  marker = L.marker([lat, lon]).addTo(map).bindPopup('Sensor Location').openPopup();
}

// ================= Render Functions =================
function renderReading(r) {
  if (!r) return document.getElementById('reading').innerText = 'No data yet';

  const html = `
    <div><strong>${new Date(r.timestamp).toLocaleString()}</strong></div>
    <div>Tide: <span class="badge bg-primary">${r.tide_m} m</span></div>
    <div>Wind: <span class="badge bg-info text-dark">${r.wind_kmh} km/h</span></div>
    <div>Pollution: <span class="badge bg-warning text-dark">${r.pollution_index}</span></div>
    <div class="mt-2">Model anomaly: <b>${r.is_model_anomaly}</b></div>
    <div>Threshold reasons: ${r.threshold_reasons?.length ? r.threshold_reasons.join(', ') : 'None'}</div>
  `;
  document.getElementById('reading').innerHTML = html;
}

function renderAlerts(list) {
  const container = document.getElementById('alertsFeed');
  if (!list?.length) return container.innerHTML = '<div class="text-muted">No alerts</div>';

  container.innerHTML = list.map(a => {
    const cls = a.severity === 'high' ? 'alert-high' : (a.severity === 'medium' ? 'alert-med' : 'alert-low');
    return `<div class="alert-pill ${cls}">
      <div><strong>${a.severity.toUpperCase()}</strong> • ${a.type}</div>
      <div style="font-size:0.95rem">${a.message}</div>
      <div style="font-size:0.8rem;color:#666">${new Date(a.timestamp).toLocaleString()}</div>
    </div>`;
  }).join('');
}

// ================= WebSocket =================
function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => { 
    console.log('✅ WS connected'); 
    ws.send('ping'); 
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'state') {
        const { reading, alerts } = msg.payload;
        renderReading(reading);
        renderAlerts(alerts);
        if (reading && marker) {
          marker.setLatLng([reading.location.lat, reading.location.lon])
                .bindPopup(`Tide ${reading.tide_m}m`).openPopup();
          updateChart(reading.timestamp, reading.tide_m, reading.wind_kmh, reading.pollution_index);
        }
      }
    } catch(e) { console.error('WS parse error', e); }
  };

  ws.onclose = () => { 
    console.log('⚠️ WS closed, reconnecting in 2s'); 
    setTimeout(connectWS, 2000); 
  };

  ws.onerror = (e) => { 
    console.error('WS error', e); 
    ws.close(); 
  };
}

// ================= DOM Events =================
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  initMap();
  connectWS();

  document.getElementById('btn-manual').addEventListener('click', async () => {
    const msg = prompt('Manual alert message', 'Test manual alert - please ignore');
    if (!msg) return;
    const form = new FormData();
    form.append('message', msg);
    form.append('severity', 'medium');
    await fetch('/api/manual_alert', { method: 'POST', body: form });
    alert('Manual alert submitted.');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    window.location = '/api/export_alerts';
  });
});
