const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── SERVE ARQUIVOS ESTÁTICOS (pasta public/) ──
app.use(express.static(path.join(__dirname, 'public')));

// ── CREDENCIAIS AMADEUS ──
const AMADEUS_KEY    = 'wglUqHoyBZDbAh03oSSqdGrZTT4kgUGf';
const AMADEUS_SECRET = 'DvJZGHAb3oeMbClf';
const AMADEUS_BASE   = 'https://test.api.amadeus.com';

// ── GERA TOKEN ──
async function getToken() {
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`
  });
  const data = await res.json();
  return data.access_token;
}

// ── BUSCA VOOS ──
app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date, adults, children, infants } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: origin, destination, date' });
    }

    const token = await getToken();

    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: adults || '1',
      ...(children && parseInt(children) > 0 ? { children } : {}),
      ...(infants  && parseInt(infants)  > 0 ? { infants  } : {}),
      currencyCode: 'BRL',
      max: 10
    });

    const response = await fetch(
      `${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.detail || 'Erro na busca' });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// ── BUSCA AEROPORTOS (autocomplete) ──
app.get('/api/airports', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) return res.json({ data: [] });

    const token = await getToken();
    const response = await fetch(
      `${AMADEUS_BASE}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=8&view=LIGHT`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar aeroportos' });
  }
});

// ── ROTA PRINCIPAL — entrega o site ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor SkyFly rodando na porta ${PORT}`));
