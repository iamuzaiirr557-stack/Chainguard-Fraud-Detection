# 🔗 Blockchain Fraud Detection System

A real-time blockchain transaction monitoring system powered by **Google Gemini AI** and **FastAPI**. Every live transaction is automatically evaluated for fraud risk and instantly pushed to connected dashboards via WebSocket.

---

## 🚀 Features

- **Real-time transaction monitoring** — continuously fetches live blockchain data
- **AI-powered fraud analysis** — uses Gemini 1.5 Flash to score each transaction
- **Instant WebSocket broadcasting** — pushes results to all connected clients with zero latency
- **Smart idle detection** — pauses fetching when no clients are connected to save resources
- **Graceful fallback mode** — simulates fraud scores in dev/testing when no API key is set
- **CORS-enabled** — ready for multi-origin frontend integration

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| AI Model | Google Gemini 1.5 Flash |
| Real-time | WebSocket |
| Blockchain | Custom `blockchain_api` module |
| Config | python-dotenv |
| Server | Uvicorn |

---

## 📁 Project Structure

```
blockchain-fraud-detector/
├── main.py               # FastAPI app, WebSocket, background loop
├── blockchain/
│   └── blockchain_api.py # Fetches live blockchain transactions
├── .env                  # Environment variables (not uploaded)
├── .gitignore
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/blockchain-fraud-detector.git
cd blockchain-fraud-detector
```

### 2. Install dependencies
```bash
pip install fastapi uvicorn google-generativeai python-dotenv websockets
```

### 3. Create a `.env` file
```
GEMINI_API_KEY=your_gemini_api_key_here
```
> Get your free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

### 4. Run the server
```bash
python main.py
```

The server starts at `http://127.0.0.1:8000`

---

## 🔌 WebSocket API

**Endpoint:** `ws://127.0.0.1:8000/ws/feed`

Connect to this endpoint to receive a live stream of analyzed transactions.

### Payload format
```json
{
  "transaction": {
    "network": "ethereum",
    "from": "0xabc...",
    "to": "0xdef...",
    "value": "2.5 ETH",
    "hash": "0x123..."
  },
  "analysis": {
    "score": 87,
    "risk": "critical",
    "explanation": "Unusually high value transfer to a new address.",
    "flags": ["High volume", "New address"]
  }
}
```

---

## 🧠 How It Works

```
App Startup
    │
    ▼
Spawn background loop (asyncio)
    │
    ▼
Any active WebSocket clients? ──No──► Sleep 2s → retry
    │ Yes
    ▼
Fetch live blockchain transactions
    │
    ▼
For each transaction:
    │
    ├── Gemini API key available?
    │       ├── Yes ──► Send to Gemini 1.5 Flash ──► JSON risk report
    │       └── No  ──► Generate fallback score
    │
    ▼
Broadcast { transaction + analysis } to all clients via WebSocket
    │
    ▼
Sleep 5s → repeat loop
```

---

## 📊 Risk Levels

| Score | Risk Level |
|-------|-----------|
| 0 – 25 | 🟢 Low |
| 26 – 50 | 🟡 Medium |
| 51 – 75 | 🟠 High |
| 76 – 100 | 🔴 Critical |

---

## 🔒 Security Notes

- Never commit your `.env` file — add it to `.gitignore`
- The `allow_origins=["*"]` CORS setting is for development — restrict it in production
- Rate limit your Gemini API calls to avoid quota exhaustion

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙋‍♂️ Author

Built using FastAPI + Gemini AI  
Feel free to fork, star ⭐, and contribute!
