import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

from blockchain import blockchain_api

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "dummy_key")
if GEMINI_API_KEY != "dummy_key":
    genai.configure(api_key=GEMINI_API_KEY)
    
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending message to client: {e}")

manager = ConnectionManager()

def evaluate_transaction_with_gemini(tx: dict) -> dict:
    """Uses Gemini to evaluate transaction fraudulency."""
    if GEMINI_API_KEY == "dummy_key":
        # Fallback if no API key
        import random
        score = random.randint(10, 95)
        risk = "critical" if score > 75 else "high" if score > 50 else "medium" if score > 25 else "low"
        return {
            "score": score,
            "risk": risk,
            "explanation": f"Fallback mode. Simulated risk analysis for {tx.get('hash', 'tx')}.",
            "flags": ["High volume", "New address"] if score > 50 else []
        }

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        You are a highly advanced Blockchain Fraud Detection AI.
        Analyze this transaction and detect if it is fraudulent.
        Return ONLY a JSON response, with the following format:
        {{
            "score": <int 0-100 risk score>,
            "risk": "<critical|high|medium|low>",
            "explanation": "<short explanation why>",
            "flags": ["<flag1>", "<flag2>"]
        }}

        Transaction Data:
        Network: {tx.get('network')}
        From: {tx.get('from')}
        To: {tx.get('to')}
        Value: {tx.get('value')}
        Hash: {tx.get('hash')}
        """
        response = model.generate_content(prompt)
        # Parse the JSON response
        text_response = response.text
        # Clean up any markdown blocks
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0]
        elif "```" in text_response:
            text_response = text_response.split("```")[1].split("```")[0]
            
        result = json.loads(text_response.strip())
        return result
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {
            "score": 50,
            "risk": "medium",
            "explanation": "Failed to analyze transaction due to an API error.",
            "flags": ["API Error"]
        }

async def fetch_and_broadcast():
    """Background task to fetch transactions, evaluate, and push to WebSockets."""
    while True:
        try:
            if not manager.active_connections:
                await asyncio.sleep(2)
                continue
                
            transactions = await blockchain_api.fetch_live_data()
            for tx in transactions:
                # To prevent overwhelming the API, we only evaluate a few
                analysis = evaluate_transaction_with_gemini(tx)
                
                payload = {
                    "transaction": tx,
                    "analysis": analysis
                }
                await manager.broadcast(payload)
                await asyncio.sleep(1) # delay between sends
        except Exception as e:
            print(f"Error in fetch_and_broadcast: {e}")
        await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(fetch_and_broadcast())

@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
