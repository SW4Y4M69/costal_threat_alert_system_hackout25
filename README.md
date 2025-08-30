# costal_threat_alert_system_hackout25
# Coastal Threat Alert System - Full Stack

A real-time coastal monitoring system with WebSocket-based communication between a FastAPI backend and React frontend.

## 🏗️ Architecture

- **Backend**: FastAPI with WebSocket support, real-time sensor simulation, and anomaly detection
- **Frontend**: React application with real-time charts, maps, and alert display
- **Communication**: WebSocket for real-time data streaming

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server:**
   ```bash
   uvicorn main_ws:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd react_frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Copy build to backend:**
   ```bash
   cp -r build ../backend/react_build
   ```

## 🌐 Access the Application

Once both backend and frontend are set up:

- **Frontend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **WebSocket Endpoint**: ws://localhost:8000/ws

## 📊 Features

### Real-time Monitoring
- Live sensor data (tide levels, wind speed, pollution index)
- Anomaly detection using machine learning
- Real-time alerts and notifications

### API Endpoints
- `GET /api/data` - Get current sensor reading
- `GET /api/alerts` - Get recent alerts
- `POST /api/manual_alert` - Create manual alert
- `GET /api/export_alerts` - Export alerts as JSON
- `WS /ws` - WebSocket for real-time updates

### Frontend Dashboard
- Real-time sensor data display
- Interactive charts using Chart.js
- Interactive map using Leaflet
- Alert history and management
- Responsive design

## 🔧 Configuration

### Environment Variables (Optional)
Create a `.env` file in the backend directory for Twilio SMS notifications:

```env
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_FROM=your_twilio_phone_number
TWILIO_TO=your_destination_phone_number
```

### Sensor Simulation
The system simulates coastal sensor data with:
- **Tide levels**: 0.2-4.0m (normal), up to 7.0m (anomaly)
- **Wind speed**: 0-80 km/h (normal), up to 150 km/h (anomaly)
- **Pollution index**: 5-150 (normal), up to 500 (anomaly)

## 🧪 Testing

### Test WebSocket Connection
```bash
cd backend
python test_websocket.py
```

### Test API Endpoints
```bash
# Get current sensor data
curl http://localhost:8000/api/data

# Get recent alerts
curl http://localhost:8000/api/alerts

# Create manual alert
curl -X POST http://localhost:8000/api/manual_alert \
  -F "message=Test alert" \
  -F "severity=medium"
```

## 📁 Project Structure

```
coastal-alert-fullstack_ws_react/
├── backend/
│   ├── main_ws.py              # FastAPI backend with WebSocket
│   ├── requirements.txt        # Python dependencies
│   ├── react_build/           # Built React frontend
│   ├── test_websocket.py      # WebSocket test script
│   └── venv/                  # Python virtual environment
├── react_frontend/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   └── index.js           # React entry point
│   ├── package.json           # Node.js dependencies
│   └── build/                 # Production build
└── README.md                  # This file
```

## 🔄 Development Workflow

1. **Backend Development:**
   - Edit `backend/main_ws.py`
   - Server auto-reloads on changes
   - Test with `python test_websocket.py`

2. **Frontend Development:**
   - Edit files in `react_frontend/src/`
   - Run `npm start` for development server
   - Run `npm run build` to rebuild for production
   - Copy build to `backend/react_build/`

## 🚨 Alert System

The system automatically generates alerts based on:
- **Threshold-based alerts**: High tide (>4.5m), extreme winds (>100 km/h), severe pollution (>180)
- **ML anomaly detection**: Uses Isolation Forest to detect unusual patterns
- **Manual alerts**: Created via API endpoint

Alert severity levels:
- **Low**: Minor threshold violations
- **Medium**: Moderate threshold violations
- **High**: Severe threshold violations or ML anomalies

## 📈 Real-time Features

- **WebSocket streaming**: Real-time sensor data updates every 2 seconds
- **Live charts**: Tide level trends over time
- **Interactive map**: Sensor location with real-time updates
- **Alert notifications**: Immediate display of new alerts
- **SMS notifications**: Optional Twilio integration for critical alerts

## 🛠️ Troubleshooting

### Common Issues

1. **Port 8000 already in use:**
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

2. **WebSocket connection fails:**
   - Check if backend is running
   - Verify CORS settings
   - Check browser console for errors

3. **Frontend not loading:**
   - Ensure `react_build` directory exists in backend
   - Rebuild frontend: `npm run build && cp -r build ../backend/react_build`

4. **Dependencies issues:**
   - Backend: `pip install -r requirements.txt`
   - Frontend: `npm install`

## 📝 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Status**: ✅ Backend and Frontend successfully connected and operational!
