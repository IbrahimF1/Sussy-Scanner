<p align="center">
  <img src="logo.png" alt="Sussy Scanner 🔍" width="250">
</p>

<h3 align="center"><em>Investor protection through suspicious behavior screening</em></h3>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-ES_Modules-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Gemini-AI_Powered-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Yahoo_Finance-Market_Data-6001D2?style=flat-square&logo=yahoo&logoColor=white" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" />
</p>

---

## 📰 Background: The Impact of Market Manipulation

Market manipulation is not a victimless crime. It erodes the foundational trust that financial markets depend on to function efficiently, and its consequences ripple far beyond the trading floor.

### 💰 Real-World Damage

- **Retail investors lose billions annually** to pump-and-dump schemes, where coordinated social media campaigns inflate stock prices before insiders sell off, leaving ordinary investors holding worthless shares. The U.S. Securities and Exchange Commission estimates that microcap fraud alone costs investors **$3–5 billion per year**.

- **The GameStop saga (January 2021)** demonstrated how social media-driven momentum on platforms like Reddit's r/WallStreetBets can create extreme volatility. While some profited, many retail investors who bought at the peak lost **over 80% of their investment** within weeks.

- **Cryptocurrency pump-and-dump schemes** have become rampant, with researchers at the University of Texas finding that **80%+ of ICOs in 2017–2018** showed signs of manipulation, resulting in estimated losses exceeding **$1 billion**.

- **Confidence erosion**: A CFA Institute survey found that **56% of retail investors** believe markets are rigged against them, leading to reduced market participation and a widening wealth gap.

### 🎯 Why Detection Matters

Traditional manipulation detection relies on regulatory bodies with limited resources. By the time enforcement actions are taken, the damage is already done. **Real-time, AI-powered screening tools** like Sussy Scanner aim to give everyday investors the ability to see the same red flags that institutional risk managers monitor, before they become casualties.

> *"Sunlight is said to be the best of disinfectants."* — Louis Brandeis, U.S. Supreme Court Justice

---

## 🚀 What Is Sussy Scanner?

**Sussy Scanner** is a full-stack market manipulation detector that cross-references **real-time stock data** with **social media activity** to flag suspicious behavior patterns. Built for the **Hack Brooklyn** hackathon, it combines multi-source data ingestion, statistical feature engineering, and Google Gemini–powered AI analysis to produce an explainable, composite risk score for any publicly traded stock.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📊 **Multi-Score Risk Engine** | Five independent sub-scores (Pump Risk, Social Hype, Liquidity Stress, Technical Fragility, Squeeze Pressure) combined into a weighted composite |
| 🤖 **AI-Powered Analysis** | Google Gemini analyzes social media posts for promotional language, hype signals, and coordinated campaigns |
| 📈 **Interactive Charts** | TradingView lightweight charts for candlestick/line visualization + Recharts for risk signals and narrative breakdowns |
| 🔍 **Similarity Engine** | Compares current stock behavior against a database of known historical pump events (GME, AMC, DWAC, BBBY, SMCI) |
| 🧠 **Explainable Scoring** | Every score includes top contributing features and AI-generated natural language narratives |
| 📰 **News Cross-Referencing** | Checks whether price moves are backed by credible news or appear "unexplained" |
| 💬 **Social Media Aggregation** | Aggregates posts from multiple sources (Tavily search, Reddit) with sentiment and hype classification |
| ⏱️ **Smart Caching** | SQLite-backed caching layer with TTL to avoid redundant API calls and speed up repeat analyses |
| 🗂️ **Preset Historical Events** | One-click analysis of famous manipulation events (GameStop squeeze, AMC rally, Trump SPAC, etc.) |

---

## 🏗️ Architecture

The following diagram traces the complete data flow from the moment a user enters a stock ticker to the final rendered analysis dashboard:

```mermaid
flowchart TB
    subgraph Browser ["🌐 Browser — React SPA"]
        A["🔍 User enters ticker<br/>e.g. GME"]
        B["Landing.jsx / Analysis.jsx"]
        C["api.js — Axios client"]
        D["DashboardGrid.jsx"]
        D1["TradingViewChart"]
        D2["SignalsPanel"]
        D3["NarrativeMixChart"]
        D4["NewsPanel"]
        D5["SocialPanel"]
        D6["KeyStatsPanel"]
    end

    subgraph Server ["🖥️ Express Server — port 3001"]
        E["index.js — Router"]
        F["cache.js — SQLite TTL Cache"]
        G["explainability.js — Orchestrator"]
    end

    subgraph Ingestion ["📡 Data Ingestion Layer"]
        H["marketData.js"]
        H1["yahooFinance.js<br/>yahoo-finance2"]
        H2["yahooChart.js"]
        H3["finnhub.js<br/>optional"]
        H4["newsService.js"]
        I["tavilySearch.js<br/>Tavily REST API"]
        J["redditSearch.js"]
        K["timestampEnricher.js"]
    end

    subgraph Features ["🧮 Feature Engineering"]
        L["priceVolumeFeatures.js"]
        M["technicalFeatures.js"]
        N["liquidityFeatures.js"]
        O["squeezeFeatures.js"]
        P["socialFeatures.js"]
        Q["featureVector.js"]
    end

    subgraph Scoring ["🎯 Scoring Engine"]
        R["pumpRiskScore.js<br/>weight: 0.30"]
        S["socialHypeScore.js<br/>weight: 0.25"]
        T["liquidityScore.js<br/>weight: 0.20"]
        U["techFragilityScore.js<br/>weight: 0.15"]
        V["squeezeScore.js<br/>weight: 0.10"]
        W["compositeScore.js"]
    end

    subgraph AI ["🤖 AI / Gemini Layer"]
        X["geminiAnalyzer.js<br/>Post-level classification"]
        Y["geminiNarrator.js<br/>Score narratives"]
        Z["similarityEngine.js<br/>Historical matching"]
    end

    subgraph External ["🌍 External APIs"]
        YF["Yahoo Finance API<br/>Price · Volume · Stats · Options"]
        TV["Tavily Search API<br/>Social media posts"]
        RD["Reddit<br/>r/wallstreetbets etc."]
        FH["Finnhub API<br/>Quote · News (optional)"]
        GM["Google Gemini API<br/>Gemma model"]
    end

    %% User → Frontend
    A --> B
    B -->|"GET /api/analysis/:symbol"| C
    C -->|"JSON response"| D
    D --> D1 & D2 & D3 & D4 & D5 & D6

    %% Frontend → Server
    C -->|"HTTP request"| E
    E --> F
    E -->|"analyze(symbol)"| G

    %% Server → Ingestion
    G -->|"Promise.all"| H
    H --> H1 & H2 & H3 & H4
    G --> I
    G --> J
    I & J --> K

    %% Ingestion → External
    H1 & H2 -->|"REST"| YF
    H3 -->|"REST"| FH
    H4 -->|"REST"| YF
    I -->|"REST"| TV
    J -->|"JSON API"| RD

    %% Ingestion → Features
    H --> L & M & N & O
    K --> P
    L & M & N & O & P --> Q

    %% Features → Scoring
    Q --> R & S & T & U & V
    R & S & T & U & V --> W

    %% Scoring → AI
    K --> X
    W --> Y
    Q --> Z
    X & Y -->|"prompt"| GM

    %% AI → Response
    W -->|"composite + sub-scores"| G
    X -->|"post analysis"| G
    Y -->|"narratives"| G
    Z -->|"similarity match"| G

    %% Response → Frontend
    G -->|"JSON analysis"| E
    E -->|"HTTP response"| C

    %% Styling
    style Browser fill:#1a1b26,color:#c0caf5,stroke:#7aa2f7
    style Server fill:#1e1e2e,color:#cdd6f4,stroke:#89b4fa
    style Ingestion fill:#1e1e2e,color:#cdd6f4,stroke:#a6e3a1
    style Features fill:#1e1e2e,color:#cdd6f4,stroke:#f9e2af
    style Scoring fill:#1e1e2e,color:#cdd6f4,stroke:#fab387
    style AI fill:#1e1e2e,color:#cdd6f4,stroke:#cba6f7
    style External fill:#2d2d3d,color:#cdd6f4,stroke:#f38ba8
```

---

## 📐 Scoring Methodology

The composite manipulation risk score is a **weighted average of five independent sub-scores**, each ranging from 0–100:

```
┌──────────────────────┬────────┬───────────────────────────────────────────┐
│ Sub-Score            │ Weight │ Key Features                              │
├──────────────────────┼────────┼───────────────────────────────────────────┤
│ 🔴 Pump Risk         │  30%   │ Volume z-scores, price gaps, ROC accel.   │
│ 🟠 Social Hype       │  25%   │ Mention velocity, hype score, spam ratio  │
│ 🔵 Liquidity Stress  │  20%   │ Float, ADV, market cap, inst. ownership   │
│ 🟡 Technical Fragility│  15%   │ RSI, SMA distance, Bollinger breaches     │
│ 🟣 Squeeze Pressure  │  10%   │ Short % float, days-to-cover, P/C ratio   │
└──────────────────────┴────────┴───────────────────────────────────────────┘
```

### Risk Bands

| Band | Score Range | Color |
|------|------------|-------|
| 🟢 LOW | 0–25 | Green |
| 🟡 MEDIUM | 25–50 | Yellow |
| 🟠 HIGH | 50–75 | Orange |
| 🔴 CRITICAL | 75–100 | Red |

The composite applies a **stacking floor** (when 2+ sub-scores are HIGH, the composite can't fall below their average) and a **correlation cap** (no single outlier can push the composite more than 15 points above the max sub-score) to prevent dilution or exaggeration.

---

## 🛠️ Tech Stack

### Frontend
<p>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/React_Router-6.27-CA4245?style=flat-square" />
  <img src="https://img.shields.io/badge/Recharts-2.13-8884D8?style=flat-square" />
  <img src="https://img.shields.io/badge/Lightweight_Charts-5.1-131722?style=flat-square" />
  <img src="https://img.shields.io/badge/Axios-1.7-5A29E4?style=flat-square" />
</p>

### Backend
<p>
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express" />
  <img src="https://img.shields.io/badge/Node.js-ES_Modules-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/better--sqlite3-11.3-003B57?style=flat-square" />
  <img src="https://img.shields.io/badge/simple--statistics-7.8-FF6F00?style=flat-square" />
  <img src="https://img.shields.io/badge/date--fns-4.1-7B46BE?style=flat-square" />
</p>

### Data Sources & AI
<p>
  <img src="https://img.shields.io/badge/Yahoo_Finance-2.13-6001D2?style=flat-square" />
  <img src="https://img.shields.io/badge/Tavily-Search_API-00C4B4?style=flat-square" />
  <img src="https://img.shields.io/badge/Finnhub-REST_API-6349F0?style=flat-square" />
  <img src="https://img.shields.io/badge/Google_Gemini-Gemma_Model-4285F4?style=flat-square&logo=google" />
</p>

---

## 📁 Project Structure

```
sussy-scanner/
├── 📂 client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisHeader.jsx      # Symbol, date, score badge
│   │   │   ├── DashboardGrid.jsx       # Main analysis layout
│   │   │   ├── TradingViewChart.jsx    # Candlestick / line chart
│   │   │   ├── SignalsPanel.jsx        # Expandable risk scores
│   │   │   ├── NarrativeMixChart.jsx   # Social narrative donut
│   │   │   ├── SocialPanel.jsx         # Social media posts feed
│   │   │   ├── NewsPanel.jsx           # News articles panel
│   │   │   ├── KeyStatsPanel.jsx       # Feature value table
│   │   │   ├── ScoreCard.jsx           # Individual score display
│   │   │   ├── SimilarityCallout.jsx   # Historical match display
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── Landing.jsx             # Home page with search
│   │   │   └── Analysis.jsx            # Analysis dashboard
│   │   ├── services/
│   │   │   └── api.js                  # Axios API client
│   │   └── styles/
│   │       └── tokens.css              # Design tokens
│   └── package.json
│
├── 📂 server/                          # Express backend
│   ├── index.js                        # App entry + route definitions
│   ├── db.js                           # SQLite connection
│   │
│   ├── 📂 ingestion/                   # Data source adapters
│   │   ├── marketData.js               # Unified market data facade
│   │   ├── yahooFinance.js             # Yahoo Finance quote/stats
│   │   ├── yahooChart.js               # Yahoo Finance OHLCV history
│   │   ├── finnhub.js                  # Finnhub quote/news adapter
│   │   ├── newsService.js              # News aggregation
│   │   ├── tavilySearch.js             # Tavily social media search
│   │   ├── redditSearch.js             # Reddit post search
│   │   └── timestampEnricher.js        # Post timestamp normalization
│   │
│   ├── 📂 features/                    # Feature engineering modules
│   │   ├── featureVector.js            # Feature assembly + ordering
│   │   ├── priceVolumeFeatures.js      # Volume z-scores, returns
│   │   ├── technicalFeatures.js        # RSI, SMA, Bollinger Bands
│   │   ├── liquidityFeatures.js        # Float, ADV, market cap
│   │   ├── squeezeFeatures.js          # Short interest, options
│   │   ├── socialFeatures.js           # Mentions, hype, sentiment
│   │   └── stats.js                    # Statistical helpers
│   │
│   ├── 📂 services/                    # Business logic
│   │   ├── explainability.js           # Main analysis orchestrator
│   │   ├── compositeScore.js           # Weighted score aggregation
│   │   ├── pumpRiskScore.js            # Pump & dump detection
│   │   ├── socialHypeScore.js          # Social media hype scoring
│   │   ├── liquidityScore.js           # Liquidity stress scoring
│   │   ├── techFragilityScore.js       # Technical fragility scoring
│   │   ├── squeezeScore.js             # Short squeeze scoring
│   │   ├── scoringHelpers.js           # Severity + band utilities
│   │   ├── geminiClient.js             # Gemini API client
│   │   ├── geminiAnalyzer.js           # AI post classification
│   │   ├── geminiNarrator.js           # AI narrative generation
│   │   ├── similarityEngine.js         # Historical event matching
│   │   └── cache.js                    # SQLite TTL cache
│   │
│   ├── 📂 data/                        # Reference datasets
│   │   ├── pump_anchors.json           # Known pump event features
│   │   └── preset_squeeze.json         # Preset analysis events
│   │
│   └── package.json
│
├── .env.example                        # Environment template
└── package.json                        # Root workspace config
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- API keys for:
  - [Tavily](https://tavily.com/) (required — social media search)
  - [Google AI Studio](https://aistudio.google.com/) (required — Gemini API)
  - [Finnhub](https://finnhub.io/) (optional — enhanced market data)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd "Hack Brooklyn"

# 2. Install all dependencies (root + server + client)
npm run install:all

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start development servers (both client + server)
npm run dev
```

The app will be available at:
- 🖥️ **Frontend**: `http://localhost:5173` (Vite dev server)
- ⚙️ **Backend**: `http://localhost:3001` (Express API)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TAVILY_API_KEY` | ✅ | Tavily search API key for social media ingestion |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key for Gemini/Gemma model |
| `GEMINI_MODEL` | ❌ | Model ID (default: `gemma-3-27b-it`) |
| `FINNHUB_API_KEY` | ❌ | Finnhub API key for enhanced market data |
| `PORT` | ❌ | Server port (default: `3001`) |
| `CACHE_DB_PATH` | ❌ | SQLite cache path (default: `./cache.sqlite`) |

---

## 🔌 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + model info |
| `GET` | `/api/analysis/:symbol` | 🔥 **Full analysis** — scores, features, AI narratives, similarity |
| `GET` | `/api/similarity/:symbol` | Historical pump event similarity match |
| `GET` | `/api/timeline/:symbol` | Price + volume + social velocity time series |
| `GET` | `/api/presets` | List of preset historical events |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stock/quote/:symbol` | Real-time quote |
| `GET` | `/api/stock/history/:symbol` | OHLCV history (`?period1=&period2=&interval=1d`) |
| `GET` | `/api/stock/stats/:symbol` | Key statistics (market cap, float, etc.) |
| `GET` | `/api/stock/search?q=` | Symbol search / autocomplete |

### Social & News

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/social/:symbol` | Social media posts (`?date=&window=7`) |
| `GET` | `/api/news/:symbol` | News articles (`?date=&window=7`) |

All endpoints support an optional `date` query parameter for historical analysis (e.g., `?date=2021-01-27`).

---

## 🧪 Preset Historical Events

The app ships with pre-configured famous market events for instant analysis:

| Ticker | Date | Event |
|--------|------|-------|
| 🎮 **GME** | 2021-01-27 | GameStop short squeeze |
| 🎬 **AMC** | 2021-06-02 | AMC ape rally |
| 🏛️ **DWAC** | 2021-10-22 | Trump SPAC pump |
| 🛏️ **BBBY** | 2022-08-16 | Bed Bath & Beyond meme revival |
| 💻 **SMCI** | 2024-03-08 | Super Micro AI spike |

---

## 🧠 How the AI Analysis Works

1. **Social Post Collection** — Tavily and Reddit APIs gather recent social media posts mentioning the stock
2. **Pre-filtering** — Posts are pre-screened using regex patterns for clearly benign (earnings, SEC filings) or clearly suspicious ("to the moon", "diamond hands") language
3. **Gemini Batch Analysis** — Remaining posts are sent to Google Gemini in batches of 5, classified for:
   - Promotional language detection
   - Hype score (0–1)
   - Urgency signals
   - Sentiment (bullish/bearish/neutral)
   - Narrative categorization (meme_hype, short_squeeze, coordination_signal, etc.)
4. **Narrative Generation** — Gemini generates one-line explanations for each risk sub-score
5. **Similarity Matching** — The assembled feature vector is compared against known historical pump events using cosine similarity

---

This project was built for **Hack Brooklyn** and is intended for educational and research purposes. Market data is sourced from public APIs; this tool does not constitute financial advice.

---

<p align="center">
  <strong>Built with 🔍 by the Sussy Scanner team @ Hack Brooklyn</strong>
</p>
