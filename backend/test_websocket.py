#!/usr/bin/env python3
"""
Simple WebSocket test script for the Coastal Alert System
"""

import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket server")
            
            # Wait for initial state
            message = await websocket.recv()
            data = json.loads(message)
            print(f"📡 Received initial state: {data['type']}")
            
            if data['type'] == 'state':
                payload = data['payload']
                if payload['reading']:
                    reading = payload['reading']
                    print(f"🌊 Current reading:")
                    print(f"   Tide: {reading['tide_m']}m")
                    print(f"   Wind: {reading['wind_kmh']} km/h")
                    print(f"   Pollution: {reading['pollution_index']}")
                    print(f"   Anomaly: {reading['is_model_anomaly']}")
                
                print(f"🚨 Alerts: {len(payload['alerts'])}")
            
            # Send ping
            await websocket.send("ping")
            pong = await websocket.recv()
            print(f"🏓 Ping-pong test: {pong}")
            
            # Wait for a few more updates
            for i in range(3):
                message = await websocket.recv()
                data = json.loads(message)
                if data['type'] == 'state' and data['payload']['reading']:
                    reading = data['payload']['reading']
                    print(f"📊 Update {i+1}: Tide={reading['tide_m']}m, Wind={reading['wind_kmh']}km/h")
            
            print("✅ WebSocket test completed successfully!")
            
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
