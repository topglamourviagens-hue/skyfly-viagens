const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── CREDENCIAIS AMADEUS ──
const AMADEUS_KEY    = 'wglUqHoyBZDbAh03oSSqdGrZTT4kgUGf';
const AMADEUS_SECRET = 'DvJZGHAb3oeMbClf';
const AMADEUS_BASE   = 'https://test.api.amadeus.com';

// ── AEROPORTOS BRASILEIROS E INTERNACIONAIS ──
const AIRPORTS = {
  // Brasil
  GRU: { name: 'São Paulo (Guarulhos)', city: 'São Paulo', country: 'Brasil' },
  CGH: { name: 'São Paulo (Congonhas)', city: 'São Paulo', country: 'Brasil' },
  VCP: { name: 'Campinas (Viracopos)', city: 'Campinas', country: 'Brasil' },
  GIG: { name: 'Rio de Janeiro (Galeão)', city: 'Rio de Janeiro', country: 'Brasil' },
  SDU: { name: 'Rio de Janeiro (Santos Dumont)', city: 'Rio de Janeiro', country: 'Brasil' },
  BSB: { name: 'Brasília', city: 'Brasília', country: 'Brasil' },
  SSA: { name: 'Salvador', city: 'Salvador', country: 'Brasil' },
  FOR: { name: 'Fortaleza', city: 'Fortaleza', country: 'Brasil' },
  REC: { name: 'Recife', city: 'Recife', country: 'Brasil' },
  CNF: { name: 'Belo Horizonte (Confins)', city: 'Belo Horizonte', country: 'Brasil' },
  CWB: { name: 'Curitiba', city: 'Curitiba', country: 'Brasil' },
  POA: { name: 'Porto Alegre', city: 'Porto Alegre', country: 'Brasil' },
  MAO: { name: 'Manaus', city: 'Manaus', country: 'Brasil' },
  BEL: { name: 'Belém', city: 'Belém', country: 'Brasil' },
  FLN: { name: 'Florianópolis', city: 'Florianópolis', country: 'Brasil' },
  NAT: { name: 'Natal', city: 'Natal', country: 'Brasil' },
  MCZ: { name: 'Maceió', city: 'Maceió', country: 'Brasil' },
  THE: { name: 'Teresina', city: 'Teresina', country: 'Brasil' },
  AJU: { name: 'Aracaju', city: 'Aracaju', country: 'Brasil' },
  VIX: { name: 'Vitória', city: 'Vitória', country: 'Brasil' },
  CGB: { name: 'Cuiabá', city: 'Cuiabá', country: 'Brasil' },
  CGR: { name: 'Campo Grande', city: 'Campo Grande', country: 'Brasil' },
  PMW: { name: 'Palmas', city: 'Palmas', country: 'Brasil' },
  PVH: { name: 'Porto Velho', city: 'Porto Velho', country: 'Brasil' },
  // Internacional
  LIS: { name: 'Lisboa', city: 'Lisboa', country: 'Portugal' },
  OPO: { name: 'Porto', city: 'Porto', country: 'Portugal' },
  MAD: { name: 'Madrid', city: 'Madrid', country: 'Espanha' },
  BCN: { name: 'Barcelona', city: 'Barcelona', country: 'Espanha' },
  CDG: { name: 'Paris (Charles de Gaulle)', city: 'Paris', country: 'França' },
  LHR: { name: 'Londres (Heathrow)', city: 'Londres', country: 'Reino Unido' },
  FRA: { name: 'Frankfurt', city: 'Frankfurt', country: 'Alemanha' },
  MXP: { name: 'Milão', city: 'Milão', country: 'Itália' },
  FCO: { name: 'Roma (Fiumicino)', city: 'Roma', country: 'Itália' },
  MIA: { name: 'Miami', city: 'Miami', country: 'EUA' },
  JFK: { name: 'Nova York (JFK)', city: 'Nova York', country: 'EUA' },
  MCO: { name: 'Orlando', city: 'Orlando', country: 'EUA' },
  LAX: { name: 'Los Angeles', city: 'Los Angeles', country: 'EUA' },
  ORD: { name: 'Chicago', city: 'Chicago', country: 'EUA' },
  CUN: { name: 'Cancún', city: 'Cancún', country: 'México' },
  MEX: { name: 'Cidade do México', city: 'Cidade do México', country: 'México' },
  EZE: { name: 'Buenos Aires', city: 'Buenos Aires', country: 'Argentina' },
  SCL: { name: 'Santiago', city: 'Santiago', country: 'Chile' },
  BOG: { name: 'Bogotá', city: 'Bogotá', country: 'Colômbia' },
  LIM: { name: 'Lima', city: 'Lima', country: 'Peru' },
  DXB: { name: 'Dubai', city: 'Dubai', country: 'Emirados Árabes' },
  DOH: { name: 'Doha', city: 'Doha', country: 'Catar' },
  NRT: { name: 'Tóquio (Narita)', city: 'Tóquio', country: 'Japão' },
  PUJ: { name: 'Punta Cana', city: 'Punta Cana', country: 'Rep. Dominicana' },
};

// ── COMPANHIAS POR ROTA ──
const AIRLINES_NATIONAL  = ['LATAM','GOL','Azul'];
const AIRLINES_INTERNATIONAL = ['LATAM','GOL','TAP','American Airlines','Air France','Iberia'];

// ── FAIXAS DE PREÇO BASE (BRL) por tipo de rota ──
function getBasePriceRange(origin, dest) {
  const national = ['GRU','CGH','VCP','GIG','SDU','BSB','SSA','FOR','REC','CNF','CWB','POA','MAO','BEL','FLN','NAT','MCZ','THE','AJU','VIX','CGB','CGR','PMW','PVH'];
  const isNational = national.includes(origin) && national.includes(dest);

  if (isNational) {
    // Curta distância (mesma região)
    const shortRoutes = [['GRU','CGH'],['GRU','VCP'],['GIG','SDU'],['CNF','VIX']];
    const isShort = shortRoutes.some(r => (r[0]===origin&&r[1]===dest)||(r[1]===origin&&r[0]===dest));
    if (isShort) return { min: 180, max: 420 };
    return { min: 350, max: 1200 };
  }

  // Internacional — por região
  const southAmerica = ['EZE','SCL','BOG','LIM'];
  const nearIntl = ['CUN','MEX','PUJ','LIS','OPO','MAD','BCN'];
  const longHaul = ['CDG','LHR','FRA','MXP','FCO','JFK','MIA','MCO','LAX','ORD','DXB','DOH','NRT'];

  if (southAmerica.includes(dest) || southAmerica.includes(origin)) return { min: 1800, max: 4500 };
  if (nearIntl.includes(dest) || nearIntl.includes(origin)) return { min: 2500, max: 6500 };
  if (longHaul.includes(dest) || longHaul.includes(origin)) return { min: 3500, max: 12000 };
  return { min: 2000, max: 8000 };
}

// ── GERADOR DE VOOS SIMULADOS REALISTAS ──
function generateFlights(origin, dest, date, adults, children, infants) {
  const national = ['GRU','CGH','VCP','GIG','SDU','BSB','SSA','FOR','REC','CNF','CWB','POA','MAO','BEL','FLN','NAT','MCZ','THE','AJU','VIX','CGB','CGR','PMW','PVH'];
  const isNational = national.includes(origin.toUpperCase()) && national.includes(dest.toUpperCase());
  const airlines = isNational ? AIRLINES_NATIONAL : AIRLINES_INTERNATIONAL;
  const { min, max } = getBasePriceRange(origin.toUpperCase(), dest.toUpperCase());

  const totalPax = (parseInt(adults)||1) + (parseInt(children)||0);
  const AGENCY_FEE = 0.10;

  const schedules = isNational
    ? ['06:00','07:30','09:15','11:00','13:45','15:30','17:00','19:20','21:00']
    : ['00:30','08:15','10:40','14:20','18:50','22:10'];

  const durations = isNational
    ? { min: 1, max: 5 }
    : { min: 6, max: 16 };

  const cabins = ['Econômica','Econômica','Econômica','Econômica Flex','Premium Econômica'];

  const flights = [];
  const usedTimes = new Set();

  airlines.forEach((airline, i) => {
    // Gera 1-3 opções por companhia
    const qty = isNational ? 2 : 1;
    for (let q = 0; q < qty; q++) {
      let depTime;
      do { depTime = schedules[Math.floor(Math.random() * schedules.length)]; }
      while (usedTimes.has(depTime) && usedTimes.size < schedules.length);
      usedTimes.add(depTime);

      const durH = durations.min + Math.floor(Math.random() * (durations.max - durations.min + 1));
      const durM = Math.random() < 0.5 ? 0 : 30;
      const [depH, depM] = depTime.split(':').map(Number);
      const arrTotalMin = depH * 60 + depM + durH * 60 + durM;
      const arrH = Math.floor(arrTotalMin / 60) % 24;
      const arrM = arrTotalMin % 60;
      const arrTime = `${String(arrH).padStart(2,'0')}:${String(arrM).padStart(2,'0')}`;

      const basePerPax = Math.round(min + Math.random() * (max - min));
      const withFeePerPax = Math.round(basePerPax * (1 + AGENCY_FEE));
      const stops = isNational
        ? (Math.random() < 0.65 ? 'Direto' : '1 conexão')
        : (Math.random() < 0.4 ? 'Direto' : '1 conexão');
      const cabin = cabins[Math.floor(Math.random() * cabins.length)];

      flights.push({
        id: `${airline.replace(/\s/g,'')}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        airline,
        origin: origin.toUpperCase(),
        dest: dest.toUpperCase(),
        date,
        hour: depTime,
        arrTime,
        dur: `${durH}h${durM > 0 ? durM+'m' : ''}`,
        stops,
        cabin,
        base: basePerPax,
        withFee: withFeePerPax,
        totalBase: basePerPax * totalPax,
        totalWithFee: withFeePerPax * totalPax,
        pax: totalPax,
        source: 'simulated'
      });
    }
  });

  // Ordena por preço
  return flights.sort((a, b) => a.withFee - b.withFee);
}

// ── GERA TOKEN AMADEUS ──
async function getToken() {
  try {
    const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`
    });
    const data = await res.json();
    return data.access_token;
  } catch { return null; }
}

// ── API: BUSCA VOOS ──
app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date, adults = '1', children = '0', infants = '0' } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: origin, destination, date' });
    }

    // Tenta Amadeus primeiro
    let amadeusFlights = [];
    try {
      const token = await getToken();
      if (token) {
        const params = new URLSearchParams({
          originLocationCode: origin.toUpperCase(),
          destinationLocationCode: destination.toUpperCase(),
          departureDate: date,
          adults,
          ...(parseInt(children) > 0 ? { children } : {}),
          ...(parseInt(infants)  > 0 ? { infants  } : {}),
          currencyCode: 'BRL',
          max: 10
        });
        const response = await fetch(
          `${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          amadeusFlights = data.data;
        }
      }
    } catch (e) { /* fallback para simulado */ }

    // Se Amadeus retornou dados, usa eles
    if (amadeusFlights.length > 0) {
      return res.json({ source: 'amadeus', data: amadeusFlights });
    }

    // Fallback: gera voos simulados realistas
    const flights = generateFlights(origin, destination, date, adults, children, infants);
    res.json({ source: 'simulated', flights });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// ── API: AEROPORTOS (autocomplete) ──
app.get('/api/airports', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) return res.json({ data: [] });

    const kw = keyword.toUpperCase().trim();

    // Busca local primeiro (instantâneo)
    const localMatches = Object.entries(AIRPORTS)
      .filter(([code, info]) =>
        code.includes(kw) ||
        info.name.toUpperCase().includes(keyword.toUpperCase()) ||
        info.city.toUpperCase().includes(keyword.toUpperCase()) ||
        info.country.toUpperCase().includes(keyword.toUpperCase())
      )
      .slice(0, 8)
      .map(([code, info]) => ({
        iataCode: code,
        name: info.name,
        address: { cityName: info.city, countryName: info.country }
      }));

    if (localMatches.length > 0) {
      return res.json({ data: localMatches });
    }

    // Tenta Amadeus como fallback
    try {
      const token = await getToken();
      if (token) {
        const response = await fetch(
          `${AMADEUS_BASE}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=8&view=LIGHT`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        return res.json(data);
      }
    } catch (e) { /* ignora */ }

    res.json({ data: [] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar aeroportos' });
  }
});

// ── ROTA PRINCIPAL ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor SkyFly rodando na porta ${PORT}`));
