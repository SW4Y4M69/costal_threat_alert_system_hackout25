"""Coastal Threat Alert System - Backend with WebSocket (main_ws.py)

Run:
  pip install -r requirements.txt
  uvicorn main_ws:app --reload --host 0.0.0.0 --port 8000
"""

import os
import time
import threading
import random
import datetime
import json
import asyncio
import math
from typing import List, Dict, Optional, Set
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import numpy as np
from sklearn.ensemble import IsolationForest

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title='Coastal Threat Alert - WebSocket Backend')

# -----------------------------
# Serve static frontend folder
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "react_build"   # Serve the built React app
# -----------------------------

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

# -----------------------------
# Twilio optional
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

TWILIO_SID = os.getenv('TWILIO_SID','')
TWILIO_TOKEN = os.getenv('TWILIO_TOKEN','')
TWILIO_FROM = os.getenv('TWILIO_FROM','')
TWILIO_TO = os.getenv('TWILIO_TO','')

SENSOR_POLL_INTERVAL_SEC = 2.0
ALERT_DEBOUNCE_SEC = 70.0
HISTORY_SIZE = 500
ALERT_KEEP = 200

_latest_reading: Dict = {}
_alerts: List[Dict] = []
_alert_timestamps: Dict[str, float] = {}
_lock = threading.Lock()
# Predefined coastal regions
COASTAL_REGIONS = [
    {'name': 'Chennai Coast', 'lat': 12.9716, 'lon': 80.22, 'country': 'India'},
    {'name': 'Mumbai Coast', 'lat': 19.0760, 'lon': 72.8777, 'country': 'India'},
    {'name': 'Kolkata Coast', 'lat': 22.5726, 'lon': 88.3639, 'country': 'India'},
    {'name': 'Kochi Coast', 'lat': 9.9312, 'lon': 76.2673, 'country': 'India'},
    {'name': 'Vishakhapatnam Coast', 'lat': 17.6868, 'lon': 83.2185, 'country': 'India'},
    {'name': 'Goa Coast', 'lat': 15.2993, 'lon': 74.1240, 'country': 'India'},
    {'name': 'Puri Coast', 'lat': 19.8133, 'lon': 85.8312, 'country': 'India'},
    {'name': 'Mangalore Coast', 'lat': 12.9141, 'lon': 74.8560, 'country': 'India'},
    {'name': 'Tuticorin Coast', 'lat': 8.7642, 'lon': 78.1348, 'country': 'India'},
    {'name': 'Paradip Coast', 'lat': 20.3164, 'lon': 86.6085, 'country': 'India'}
]

SENSOR_LOCATION = {'lat': 12.9716, 'lon': 80.2200}  # Default location

# -----------------------------
# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        to_remove = []
        async with self.lock:
            for ws in list(self.active_connections):
                try:
                    await ws.send_text(message)
                except Exception:
                    to_remove.append(ws)
            for r in to_remove:
                self.active_connections.discard(r)

manager = ConnectionManager()

# -----------------------------
# Async helper
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, loop)
    else:
        loop.run_until_complete(coro)

# -----------------------------
# Sensor simulation + anomaly model
def create_synthetic_history(n=HISTORY_SIZE):
    rng = np.random.default_rng(2024)
    tide = rng.normal(loc=2.2, scale=0.35, size=n).clip(0.5, 4.0)
    wind = rng.normal(loc=25, scale=10, size=n).clip(0, 80)
    pollution = rng.normal(loc=40, scale=14, size=n).clip(5, 150)
    X = np.column_stack([tide, wind, pollution])
    return X

X_hist = create_synthetic_history()
iso_model = IsolationForest(contamination=0.03, random_state=42)
iso_model.fit(X_hist)

def send_sms_via_twilio(message: str) -> bool:
    if not TWILIO_AVAILABLE:
        print('[SMS] Twilio not installed; skipping.')
        return False
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM and TWILIO_TO):
        print('[SMS] Twilio env not set; skipping.')
        return False
    try:
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        msg = client.messages.create(body=message, from_=TWILIO_FROM, to=TWILIO_TO)
        print('[SMS] Sent sid:', msg.sid)
        return True
    except Exception as e:
        print('[SMS] Error:', e)
        return False

def simulate_sensor_reading():
    base_tide = random.gauss(2.2, 0.35)
    base_wind = random.gauss(25, 9)
    base_pollution = random.gauss(40, 12)
    if random.random() < 1/140:
        tide = round(max(0.5, base_tide + random.uniform(2.8, 4.0)), 2)
        wind = round(max(0, base_wind + random.uniform(60, 130)), 1)
        pollution = round(min(500, base_pollution + random.uniform(100, 300)), 1)
    else:
        tide = round(max(0.2, base_tide + random.uniform(-0.2, 0.45)), 2)
        wind = round(max(0, base_wind + random.uniform(-7, 7)), 1)
        pollution = round(max(0, base_pollution + random.uniform(-12, 12)), 1)
    return {
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
        'tide_m': tide,
        'wind_kmh': wind,
        'pollution_index': pollution,
        'location': SENSOR_LOCATION
    }

async def broadcast_state():
    payload = {}
    with _lock:
        payload['reading'] = _latest_reading if _latest_reading else None
        payload['alerts'] = _alerts[:10]
    try:
        await manager.broadcast(json.dumps({'type':'state','payload': payload}))
    except Exception as e:
        print('[WS] broadcast error', e)

def sensor_loop():
    global _latest_reading, _alerts, _alert_timestamps
    while True:
        reading = simulate_sensor_reading()
        features = np.array([[reading['tide_m'], reading['wind_kmh'], reading['pollution_index']]])
        pred = iso_model.predict(features)
        is_anomaly = (pred[0] == -1)
        model_score = float(iso_model.decision_function(features)[0])

        thr_reasons = []
        if reading['tide_m'] > 4.5: thr_reasons.append('High tide (>4.5m)')
        if reading['wind_kmh'] > 100: thr_reasons.append('Extreme winds (>100 km/h)')
        if reading['pollution_index'] > 180: thr_reasons.append('Severe pollution index')

        with _lock:
            _latest_reading = reading
            _latest_reading['is_model_anomaly'] = bool(is_anomaly)
            _latest_reading['threshold_reasons'] = thr_reasons
            _latest_reading['model_score'] = model_score

        alert_triggered = is_anomaly or len(thr_reasons) > 0
        if alert_triggered:
            severity = 'low'
            if reading['tide_m'] > 5.0 or reading['wind_kmh'] > 115 or reading['pollution_index'] > 260:
                severity = 'high'
            elif reading['tide_m'] > 4.5 or reading['wind_kmh'] > 95:
                severity = 'medium'
            alert_type = 'coastal_threat'
            now_ts = time.time()
            last_ts = _alert_timestamps.get(alert_type, 0)
            if now_ts - last_ts > ALERT_DEBOUNCE_SEC:
                msg = f"Alert: {', '.join(set(thr_reasons + (['Model anomaly'] if is_anomaly else [])))} | tide={reading['tide_m']}m wind={reading['wind_kmh']}km/h pollution={reading['pollution_index']}"
                alert = {
                    'id': int(now_ts),
                    'type': alert_type,
                    'severity': severity,
                    'message': msg,
                    'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
                    'location': reading['location']
                }
                with _lock:
                    _alerts.insert(0, alert)
                    _alerts[:] = _alerts[:ALERT_KEEP]
                    _alert_timestamps[alert_type] = now_ts
                threading.Thread(target=send_sms_via_twilio, args=(f"[CoastalAlert][{severity.upper()}] {msg}",), daemon=True).start()
                print('[ALERT CREATED]', alert['message'])
                run_async(broadcast_state())
            else:
                print('[ALERT SUPPRESSED - debounce]')
        else:
            run_async(broadcast_state())
            print('[INFO] Normal:', reading)

        time.sleep(SENSOR_POLL_INTERVAL_SEC)

# Start sensor thread
_thread = threading.Thread(target=sensor_loop, daemon=True)
_thread.start()

# -----------------------------
# API Endpoints
@app.get('/api/data')
def api_data():
    with _lock:
        if not _latest_reading:
            return JSONResponse({'message': 'No reading yet'}, status_code=204)
        return _latest_reading

@app.get('/api/alerts')
def api_alerts(limit: Optional[int] = 50):
    with _lock:
        return _alerts[:limit]

@app.post('/api/manual_alert')
def api_manual_alert(message: str = Form(...), severity: str = Form('low')):
    now_ts = int(time.time())
    alert = {
        'id': now_ts,
        'type': 'manual',
        'severity': severity,
        'message': message,
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
        'location': SENSOR_LOCATION
    }
    with _lock:
        _alerts.insert(0, alert)
        _alerts[:] = _alerts[:ALERT_KEEP]
    threading.Thread(target=send_sms_via_twilio, args=(f"[ManualAlert][{severity.upper()}] {message}",), daemon=True).start()
    run_async(broadcast_state())
    return {'ok': True, 'alert': alert}

@app.get('/api/export_alerts')
def export_alerts():
    with _lock:
        data = json.dumps(_alerts, indent=2)
    fname = 'alerts_export.json'
    p = BASE_DIR / fname
    p.write_text(data, encoding='utf-8')
    return FileResponse(str(p), media_type='application/json', filename=fname)

@app.get('/api/regions')
def get_regions():
    """Get all available coastal regions"""
    return COASTAL_REGIONS

@app.get('/api/location/{region_name}')
def get_location_data(region_name: str):
    """Get simulated data for a specific coastal region"""
    # Find the region
    region = None
    for r in COASTAL_REGIONS:
        if r['name'].lower().replace(' ', '_') == region_name.lower().replace(' ', '_'):
            region = r
            break
    
    if not region:
        return JSONResponse({'error': 'Region not found'}, status_code=404)
    
    # Generate location-specific data
    base_tide = random.gauss(2.2, 0.35)
    base_wind = random.gauss(25, 9)
    base_pollution = random.gauss(40, 12)
    
    # Add regional variations based on latitude
    regional_factor = math.sin(region['lat'] * math.pi / 180) * 0.5 + 1
    
    tide = round(max(0.2, base_tide * regional_factor + random.uniform(-0.2, 0.45)), 2)
    wind = round(max(0, base_wind * regional_factor + random.uniform(-7, 7)), 1)
    pollution = round(max(0, base_pollution * regional_factor + random.uniform(-12, 12)), 1)
    
    # Check for anomalies
    features = np.array([[tide, wind, pollution]])
    pred = iso_model.predict(features)
    is_anomaly = (pred[0] == -1)
    model_score = float(iso_model.decision_function(features)[0])
    
    thr_reasons = []
    if tide > 4.5: thr_reasons.append('High tide (>4.5m)')
    if wind > 100: thr_reasons.append('Extreme winds (>100 km/h)')
    if pollution > 180: thr_reasons.append('Severe pollution index')
    
    return {
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
        'tide_m': tide,
        'wind_kmh': wind,
        'pollution_index': pollution,
        'location': {'lat': region['lat'], 'lon': region['lon']},
        'region_name': region['name'],
        'country': region['country'],
        'is_model_anomaly': bool(is_anomaly),
        'threshold_reasons': thr_reasons,
        'model_score': model_score
    }

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await broadcast_state()
        while True:
            data = await websocket.receive_text()
            if data == 'ping':
                await websocket.send_text(json.dumps({'type':'pong'}))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print('[WS] error', e)
        await manager.disconnect(websocket)

# Mount static files at the end to avoid interfering with API routes
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
