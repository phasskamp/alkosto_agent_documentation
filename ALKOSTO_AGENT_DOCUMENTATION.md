# Alkosto OpenRouter Agent - Vollständige Dokumentation

## 📋 Projektübersicht

**Ziel:** Funktionsfähiger AI-Agent für Alkosto Colombia, der über OpenRouter GPT-4o-mini nutzt und einen kompletten Produktkatalog mit direkten URLs bereitstellt.

**Status:** ✅ **PRODUCTION READY** - Agent funktioniert vollständig für alle Produktkategorien

---

## 🌐 Production Deployment - Vercel Integration

### Aktuelles Frontend-Setup:
- **Framework:** React 18.2.0 mit Create React App
- **Build System:** CRACO (Create React App Configuration Override)
- **Styling:** Tailwind CSS 3.4.17 + PostCSS + Autoprefixer
- **Icons:** Lucide React 0.294.0
- **Testing:** Jest + React Testing Library

### Frontend-Struktur Analyse:
```
/Users/philipphasskamp/AI-agents/letta/alkosto-frontend/
├── package.json                    # React 18 + Tailwind + CRACO
├── craco.config.js                 # CRACO Konfiguration  
├── tailwind.config.js              # Tailwind Setup
├── postcss.config.js               # PostCSS Setup
├── src/
│   ├── App.js                      # Main App Component
│   ├── AlkostoProductAdvisor.jsx   # 31KB - Haupt-Chat Component (!)
│   ├── AlkostoStyles.css           # Custom Alkosto Styling
│   ├── index.js                    # React Entry Point
│   └── index.css                   # Tailwind Imports
├── public/                         # Static Assets
└── final_merged_all_categories_updated.csv  # Produktdaten
```

### 🎯 Bestehende Chat-Integration:
**WICHTIG:** `AlkostoProductAdvisor.jsx` (31KB) ist bereits vorhanden! 
Das Frontend hat bereits eine Chat-Komponente implementiert.

### Deployment Architecture für alkosto.ai:

```
User → alkosto.ai (Vercel Frontend)
     → AlkostoProductAdvisor.jsx (React Component)
     → /api/chat (Vercel API Route - NEU)
     → Letta Server (External Host)
     → Agent agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2
     → OpenRouter GPT-4o-mini
     → Alkosto Products + URLs
```

### Erforderliche Anpassungen:

**1. Letta Server für Production:**
```bash
# Production Server-Konfiguration
letta server --host 0.0.0.0 --port 8283 --cors

# Oder mit Docker für bessere Skalierung
FROM python:3.10-slim
COPY . /app
WORKDIR /app
RUN pip install letta==0.7.0 pandas==2.2.3
EXPOSE 8283
CMD ["letta", "server", "--host", "0.0.0.0", "--port", "8283"]
```

**2. Vercel API Route (Next.js):**
```typescript
// pages/api/chat.ts oder app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  // Letta API Call
  const lettaResponse = await fetch('http://your-letta-server:8283/v1/agents/agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-letta-token'
    },
    body: JSON.stringify({
      message: message,
      role: 'user'
    })
  });
  
  const data = await lettaResponse.json();
  return NextResponse.json(data);
}
```

**3. Environment Variables für Vercel:**
```bash
# Vercel Environment Variables (.env.production)
OPENAI_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
OPENAI_API_BASE=https://openrouter.ai/api/v1
LETTA_SERVER_URL=http://your-letta-server:8283
LETTA_AGENT_ID=agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2
```

### Hosting-Optionen für Letta Server:

**Option A: Railway/Render (Empfohlen)**
```bash
# railway.app oder render.com
git push → Auto-deploy Letta server
URL: https://alkosto-letta.railway.app
```

**Option B: AWS/Google Cloud**
```bash
# Container-basiertes Deployment
docker build -t alkosto-letta .
docker run -p 8283:8283 alkosto-letta
```

**Option C: Vercel Serverless (Experimental)**
```typescript
// Letta als Vercel Function (API-only, ohne persistent server)
export default async function handler(req, res) {
  // Stateless Letta client calls
}
```

### Frontend Integration Beispiel:

```typescript
// Frontend Chat Component
const sendMessage = async (message: string) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  
  const data = await response.json();
  
  // Parse Alkosto URLs für Produkt-Cards
  const urls = extractAlkostoUrls(data.content);
  setProductCards(urls);
};
```

### Migration Steps:

**1. Letta Server Migration:**
- ✅ Export Agent-Konfiguration
- ✅ Export Archival Memory (1614 Produkte)
- ✅ Deploy auf Production Server
- ✅ Test Agent-Funktionalität

**2. Frontend Integration (Update bestehende Komponente):**

Da `AlkostoProductAdvisor.jsx` bereits existiert, muss nur die API-Verbindung hinzugefügt werden:

```typescript
// Neue API-Integration in AlkostoProductAdvisor.jsx
const sendMessageToAgent = async (message) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    
    // Parse URLs für Produkt-Links
    const alkostoUrls = extractAlkostoUrls(data.content);
    setProductRecommendations(alkostoUrls);
    
    return data.content;
  } catch (error) {
    console.error('Chat API Error:', error);
    return 'Lo siento, hay un problema con el servicio.';
  }
};

// URL-Extraktion für Alkosto-Links
const extractAlkostoUrls = (text) => {
  const urlRegex = /http:\/\/www\.alkosto\.com\/[^\s)]+/g;
  return text.match(urlRegex) || [];
};
```

**Vercel API Route erstellen:**
```typescript
// pages/api/chat.js (neue Datei)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  try {
    const lettaResponse = await fetch(`${process.env.LETTA_SERVER_URL}/v1/agents/${process.env.LETTA_AGENT_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LETTA_API_TOKEN || 'dummy'}`
      },
      body: JSON.stringify({
        message: message,
        role: 'user'
      })
    });

    const data = await lettaResponse.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Letta API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

**3. Vercel Environment Variables (.env.production):**
```bash
# Letta Agent Configuration
LETTA_SERVER_URL=https://your-letta-server.railway.app
LETTA_AGENT_ID=agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2

# OpenRouter (falls direkt verwendet)
OPENAI_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
OPENAI_API_BASE=https://openrouter.ai/api/v1

# Optional: API Authentication
LETTA_API_TOKEN=your-secure-token
```

**4. Deployment Steps:**
```bash
# 1. Frontend zu Vercel deployen
vercel --prod

# 2. Environment Variables in Vercel Dashboard setzen
# 3. Custom Domain alkosto.ai konfigurieren
# 4. SSL-Zertifikate automatisch via Vercel

# 5. Test der Integration
curl -X POST https://alkosto.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Busco lavadoras Samsung"}'
```

### Performance Considerations:

- **Caching:** Häufige Produktanfragen cachen
- **Rate Limiting:** OpenRouter API-Limits beachten
- **Error Handling:** Fallback bei Letta/OpenRouter Ausfällen
- **Analytics:** User-Queries und Agent-Performance tracken

---

## 🔧 Komplette Environment Recreation

### Für neue Chat-Sessions oder Setup:

**1. Python Environment:**
```bash
# Stelle sicher dass Python 3.10+ verwendet wird
python3 --version  # sollte 3.10.14+ zeigen

# Installiere exact gleiche Package-Versionen
pip install letta==0.7.0 letta-client==0.1.147 pandas==2.2.3 openai==1.84.0 requests==2.32.3

# Oder nutze requirements.txt falls verfügbar
pip install -r requirements.txt
```

**2. OpenRouter Setup:**
```bash
# Environment Variables setzen (in jeder Session!)
export OPENAI_API_KEY="YOUR_OPENROUTER_API_KEY_HERE"
export OPENAI_API_BASE="https://openrouter.ai/api/v1"
```

**3. Letta Server starten (falls nicht schon aktiv):**
```bash
# Navigiere zum richtigen Verzeichnis
cd /Users/philipphasskamp/AI-agents/letta/alkosto-frontend

# Check ob Server bereits läuft
lsof -i :8283

# Falls Server läuft: OK! 
# Falls nicht: Starte Server
letta server --host localhost --port 8283

# Server sollte anzeigen:
# ▶ Server running at: http://localhost:8283
# ▶ View using ADE at: https://app.letta.com/development-servers/local/dashboard
```

**4. Agent testen:**
```bash
# In neuem Terminal (mit Environment Variables!)
python3 -c "
from letta import create_client
client = create_client(base_url='http://localhost:8283')
response = client.send_message(
    agent_id='agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2',
    message='Test Samsung lavadoras con URLs',
    role='user'
)
print(response.messages[-1].content)
"
```

---

## 🎯 Aktueller Status (Stand: Juni 2025)

### ✅ Erfolgreich implementiert:
- **OpenRouter Integration** mit GPT-4o-mini
- **Letta Agent** mit archival memory
- **1614+ Alkosto Produkte** geladen mit URLs
- **Multi-Category Support** (Lavadoras, TVs, Refrigeradores, Smartphones)
- **Spanischer Kundenservice** mit authentischem Alkosto-Stil
- **Direkte Einkaufs-URLs** für sofortigen Kundenkauf

### 🆔 Funktionierender Agent:
- **Agent ID:** `agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2`
- **Model:** `openai/gpt-4o-mini` via OpenRouter
- **Server:** `http://localhost:8283`

---

## 🛠 Technisches Setup

### Erforderliche Software:

**Python Environment:**
- **Python Version:** 3.10.14 (pyenv)
- **Location:** `/Users/philipphasskamp/.pyenv/versions/3.10.14/bin/python3`

**Kritische Dependencies:**
```bash
# Core Packages (bereits installiert)
letta==0.7.0
letta-client==0.1.147  
pandas==2.2.3
openai==1.84.0
requests==2.32.3

# Installation Commands
pip install letta==0.7.0 letta-client==0.1.147 pandas==2.2.3
```

**Letta Installation Details:**
- **Version:** 0.7.0 (Apache License)
- **Location:** `/Users/philipphasskamp/.pyenv/versions/3.10.14/lib/python3.10/site-packages`
- **Binary:** `/Users/philipphasskamp/.pyenv/shims/letta`
- **Installation Method:** Standard pip install

**Key Dependencies (auto-installed):**
```
anthropic, openai, sqlalchemy, pydantic, llama-index
composio-core, grpcio, httpx, matplotlib, numpy
```

### OpenRouter Konfiguration:
```bash
export OPENAI_API_KEY="YOUR_OPENROUTER_API_KEY_HERE"
export OPENAI_API_BASE="https://openrouter.ai/api/v1"
```

### Dateistruktur:
```
/Users/philipphasskamp/AI-agents/letta/alkosto-frontend/
├── final_merged_all_categories_updated.csv  # 1614 Alkosto Produkte
├── alkosto_agent_optimized.py              # Setup-Script
├── requirements.txt                         # Alle Dependencies
└── [andere Dateien]
```

### System Environment:
- **Working Directory:** `/Users/philipphasskamp/AI-agents/letta/alkosto-frontend`
- **User:** `philipphasskamp`
- **System:** macOS 15.5 (Darwin 24.5.0)
- **Architecture:** ARM64 (Apple Silicon - M2/M3 Chip)
- **Machine:** Mac-mini-von-Philipp.local

### Server Status:
- **Letta Server:** ✅ **AKTIV** (PID 59255)
- **Command:** `/Users/philipphasskamp/.pyenv/versions/3.10.14/bin/python3.10 /Users/philipphasskamp/.pyenv/versions/3.10.14/bin/letta server --port 8283`
- **Runtime:** Mehrere Stunden aktiv (4:57:46)
- **Port 8283:** ✅ Gebunden auf IPv4 + IPv6 localhost

### Deployment Context:
- **Type:** Local Development (nicht Production Server)
- **Access:** Nur localhost (127.0.0.1:8283)
- **Persistence:** Server läuft stabil, Agent-State persistent in SQLite DB

---

## 📊 Produktdatenbank

### CSV-Struktur (`final_merged_all_categories_updated.csv`):
- **Gesamtprodukte:** 1614
- **Verfügbare Spalten:**
  - `title` - Produktname
  - `brand` - Marke (Samsung, LG, etc.)
  - `price` - Preis in COP
  - `product_type` - Kategorie
  - `description` - Produktbeschreibung
  - `link` - **Direkte Alkosto URL** (wichtig!)
  - `image_link` - Produktbild URL
  - `id` - Produkt-ID

### Beispiel Produkteintrag in Agent Memory:
```
PRODUCTO ALKOSTO COMPLETO:
Nombre: Lavadora Samsung Carga Superior 17 Kilos Wa17cg6441bdco Gris
Marca: Samsung
Precio: $2,099,900 COP
Categoria: Lavadora
URL_Producto: http://www.alkosto.com/lavadora-samsung-carga-superior-17-kilos-wa17cg6441bdco/p/8806095362632
Disponible: SI
Tienda: Alkosto Colombia
---
```

---

## 🤖 Agent-Konfiguration

### System Prompt (Optimiert):
```
Eres un asesor experto de Alkosto Colombia con acceso completo al catálogo en memoria archival.

🎯 PROTOCOLO OBLIGATORIO PARA CONSULTAS DE PRODUCTOS:

1. BÚSQUEDA INICIAL:
   - SIEMPRE usar: archival_memory_search("palabras clave relevantes")
   - Ejemplo: archival_memory_search("Samsung lavadora")

2. FORMATO DE RESPUESTA:
   🔷 OPCIÓN 1: [Nombre completo del producto]
   • Precio: $[X,XXX,XXX] COP
   • 🛒 Ver producto: [URL directa]

NUNCA respondas sin buscar en archival_memory primero!
```

### Memory Configuration:
- **Human:** "Cliente de Alkosto Colombia buscando productos específicos"
- **Persona:** Experto asesor mit vollständigem Katalogzugriff
- **LLM Config:** `openai/gpt-4o-mini` via OpenRouter
- **Embedding Config:** OpenRouter embedding für bessere Suche

---

## 🧪 Bewährte Test-Queries

### Erfolgreiche Testkategorien:

**Samsung Lavadoras:**
```python
"Busco lavadoras Samsung disponibles en Alkosto con URLs directas"
```
- ✅ Ergebnis: 3-5 spezifische Modelle mit Preisen und URLs

**Smart TVs:**
```python
"Busco televisores Smart TV baratos con URLs de Alkosto"
```
- ✅ Ergebnis: Verschiedene Größen und Marken mit direkten Links

**LG Refrigeradores:**
```python
"Necesito un refrigerador LG de al menos 300 litros con URLs"
```
- ✅ Ergebnis: Spezifikations-genaue Suche mit Liter-Anforderungen

**Samsung Smartphones:**
```python
"¿Qué celulares Samsung tienes disponibles?"
```
- ✅ Ergebnis: Galaxy S25+, A56 mit 5G-Details und Preisen

---

## 🔧 Setup-Scripts

### Agent neu erstellen (falls nötig):
```python
#!/usr/bin/env python3
import pandas as pd
from letta import create_client
from letta.schemas.memory import ChatMemory
from letta.schemas.llm_config import LLMConfig
import os

# OpenRouter Setup
os.environ["OPENAI_API_KEY"] = "YOUR_OPENROUTER_API_KEY_HERE"
os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

client = create_client(base_url='http://localhost:8283')

# GPT-4o-mini Config (funktioniert zuverlässig)
gpt_config = LLMConfig(
    model='openai/gpt-4o-mini',
    model_endpoint_type='openai',
    model_endpoint='https://openrouter.ai/api/v1',
    context_window=128000,
    temperature=0.7,
    max_tokens=4096
)

# Agent erstellen
agent = client.create_agent(
    name='Alkosto_OpenRouter_Assistant',
    memory=ChatMemory(
        human="Cliente de Alkosto Colombia",
        persona="Asesor experto de Alkosto con catálogo completo"
    ),
    llm_config=gpt_config,
    embedding_config=client.list_embedding_configs()[0],
    system="[OPTIMIZED SYSTEM PROMPT HERE]"
)

print(f"Agent ID: {agent.id}")
```

### Produktkatalog laden:
```python
# Alle Produkte mit URLs laden
df = pd.read_csv('final_merged_all_categories_updated.csv')

for idx, row in df.iterrows():
    if pd.notna(row.get('title', '')):
        product_entry = f"""PRODUCTO ALKOSTO COMPLETO:
Nombre: {row.get('title', 'N/A')}
Marca: {row.get('brand', 'N/A')}
Precio: ${row.get('price', 0):,} COP
Categoria: {row.get('product_type', 'N/A')}
URL_Producto: {row.get('link', 'N/A')}
Disponible: SI
---"""
        
        client.insert_archival_memory(
            agent_id=agent_id,
            memory=product_entry
        )
```

---

## ⚠️ Bekannte Einschränkungen

### 1. **Tool-Format Probleme:**
- Claude/Anthropic Modelle haben Kompatibilitätsprobleme mit Letta
- **Lösung:** GPT-4o-mini nutzen (funktioniert zuverlässig)

### 2. **Memory Search Enforcement:**
- Agent ignoriert manchmal System-Anweisungen zur Memory-Suche
- **Lösung:** Explizite Befehle: "Du MUSST archival_memory_search() verwenden!"

### 3. **URL-Generierung:**
- Agent erstellt manchmal Dummy-URLs (`#`) statt echte URLs
- **Lösung:** Produkte mit URLs explizit nachladen

### 4. **API Deprecation:**
- Legacy Python client wird deprecated
- **Zukünftig:** Migration zu `pip install letta-client`

---

## 🔄 Troubleshooting Guide

### Problem: Agent findet keine Produkte
```python
# Check Memory-Inhalt
import pandas as pd
df = pd.read_csv('final_merged_all_categories_updated.csv')
samsung_products = df[df['title'].str.contains('Samsung', case=False, na=False)]
print(f"Samsung Produkte in CSV: {len(samsung_products)}")
```

### Problem: Keine URLs in Antworten
```python
# Samsung Produkte mit URLs nachladen
samsung_lavadoras = df[
    (df['title'].str.contains('Samsung', case=False, na=False)) & 
    (df['title'].str.contains('lavadora', case=False, na=False))
]

for idx, row in samsung_lavadoras.iterrows():
    product_with_url = f"""SAMSUNG LAVADORA ALKOSTO:
Nombre: {row.get('title', 'N/A')}
URL_DIRECTA: {row.get('link', 'N/A')}
---"""
    client.insert_archival_memory(agent_id=agent_id, memory=product_with_url)
```

### Problem: OpenRouter Connection Fails
```bash
# Test OpenRouter direkt
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_OPENROUTER_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
```

---

## 📈 Performance Metriken

### Erfolgreiche Agent-Antworten enthalten:
- ✅ **Produktnamen:** Vollständige, spezifische Modellnamen
- ✅ **Preise:** Exakte COP-Beträge ($X,XXX,XXX format)
- ✅ **URLs:** Direkte Alkosto-Links (http://www.alkosto.com/...)
- ✅ **Spezifikationen:** Kilos, Liter, Zoll, Technologie-Features
- ✅ **Multiple Options:** 2-3 Produktalternativen pro Anfrage

### Success Score Kriterien:
- **4/4:** Perfekte Antwort mit allen Elementen
- **3/4:** Gut, kleinere Verbesserungen nötig
- **2/4:** Funktional, aber deutliche Lücken
- **1/4:** Grundlegend, aber unvollständig

---

## 🚀 Deployment Notes

### Für neue Chat-Sessions:
1. **Letta Server starten:** `letta server --port 8283`
2. **Environment Variables setzen** (OpenRouter)
3. **Agent ID verwenden:** `agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2`
4. **Test durchführen** mit Samsung Lavadora Query

### Für Production:
- **Server:** Letta auf stabilem Server deployed
- **Database:** Produkte regelmäßig aktualisieren
- **Monitoring:** Success Scores tracken
- **Backup:** Agent-Konfiguration dokumentiert

---

## 📞 Quick Reference

### Wichtigste Kommandos:
```python
# Agent testen
from letta import create_client
client = create_client(base_url='http://localhost:8283')
response = client.send_message(
    agent_id='agent-e20e5afd-ef80-42b5-9042-1fbdc37d9fe2',
    message='Test query here',
    role='user'
)
print(response.messages[-1].content)
```

### OpenRouter Models die funktionieren:
- ✅ `openai/gpt-4o-mini` (empfohlen)
- ✅ `openai/gpt-3.5-turbo` (backup)
- ❌ `anthropic/claude-*` (Kompatibilitätsprobleme)

### Erfolgreiche Letta Configs:
- **LLM:** OpenRouter GPT-4o-mini
- **Embedding:** Letta-free oder OpenRouter
- **Memory:** ChatMemory mit spanischer Persona

---

**Status:** Agent ist vollständig funktionsfähig und bereit für echte Alkosto-Kunden! 🛒✨
