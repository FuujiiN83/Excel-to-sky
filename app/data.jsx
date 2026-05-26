// Datasets de ejemplo + utilidades de análisis

const DATASETS = {
  personas: {
    id: 'personas',
    name: 'plantilla_empleados_2026.xlsx',
    label: 'Personas',
    icon: '👤',
    sheetName: 'Hoja 1 — Personas',
    columns: [
      { key: 'nombre',     name: 'Nombre',     type: 'text',     color: 'sky'   },
      { key: 'sexo',       name: 'Sexo',       type: 'category', color: 'plum'  },
      { key: 'edad',       name: 'Edad',       type: 'number',   color: 'mint',  unit: 'años' },
      { key: 'ciudad',     name: 'Ciudad',     type: 'category', color: 'coral' },
      { key: 'profesion',  name: 'Profesión',  type: 'category', color: 'amber' },
      { key: 'salario',    name: 'Salario',    type: 'number',   color: 'rose',  unit: '€' },
      { key: 'antiguedad', name: 'Antigüedad', type: 'number',   color: 'lime',  unit: 'años' },
      { key: 'fecha_alta', name: 'Fecha alta', type: 'date',     color: 'sky'   },
    ],
    rows: generatePersonas(184),
  },
  viajes: {
    id: 'viajes',
    name: 'reservas_viajes_Q2.xlsx',
    label: 'Viajes',
    icon: '✈',
    sheetName: 'Hoja 1 — Reservas',
    columns: [
      { key: 'destino',   name: 'Destino',    type: 'category', color: 'sky'   },
      { key: 'pais',      name: 'País',       type: 'category', color: 'plum'  },
      { key: 'precio',    name: 'Precio',     type: 'number',   color: 'amber', unit: '€' },
      { key: 'duracion',  name: 'Duración',   type: 'number',   color: 'mint',  unit: 'noches' },
      { key: 'fecha',     name: 'Fecha',      type: 'date',     color: 'rose'  },
      { key: 'pasajeros', name: 'Pasajeros',  type: 'number',   color: 'coral' },
      { key: 'aerolinea', name: 'Aerolínea',  type: 'category', color: 'lime'  },
    ],
    rows: generateViajes(212),
  },
  ventas: {
    id: 'ventas',
    name: 'ventas_marzo_2026.xlsx',
    label: 'Ventas',
    icon: '$',
    sheetName: 'Hoja 1 — Pedidos',
    columns: [
      { key: 'producto', name: 'Producto', type: 'category', color: 'sky'  },
      { key: 'cliente',  name: 'Cliente',  type: 'text',     color: 'plum' },
      { key: 'importe',  name: 'Importe',  type: 'number',   color: 'mint',  unit: '€' },
      { key: 'unidades', name: 'Unidades', type: 'number',   color: 'coral' },
      { key: 'fecha',    name: 'Fecha',    type: 'date',     color: 'amber' },
      { key: 'canal',    name: 'Canal',    type: 'category', color: 'rose'  },
    ],
    rows: generateVentas(297),
  },
};

// ---------- Generadores ----------

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }
function pickWeighted(arr, weights, r) {
  const total = weights.reduce((a, b) => a + b, 0);
  let n = r() * total;
  for (let i = 0; i < arr.length; i++) { n -= weights[i]; if (n <= 0) return arr[i]; }
  return arr[arr.length - 1];
}
function randInt(min, max, r) { return Math.floor(min + r() * (max - min + 1)); }
function dateStr(y, m, d) {
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function generatePersonas(n) {
  const r = rng(7);
  const nombres = ['Lucía','Mateo','Sofía','Hugo','Martina','Daniel','Paula','Álvaro','Valeria','Marco','Carmen','Pablo','Elena','Diego','Inés','Adrián','Noa','Javier','Lola','Iker','Aitana','Bruno','Vega','Rodrigo','Olivia','Gael','Claudia','Leo','Carla','Nicolás','Andrea','Jorge','Rocío','Sergio','Julia','Antonio','Ana','Marta','Pedro','Sara'];
  const apellidos = ['García','Rodríguez','Fernández','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres'];
  const ciudades = ['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Zaragoza','Málaga','Granada','Murcia','Palma','Vigo','Alicante','San Sebastián','Santander','Córdoba'];
  const ciudadesW = [38, 28, 16, 14, 11, 9, 8, 6, 5, 5, 4, 4, 3, 3, 3];
  const profesiones = ['Desarrollo','Diseño','Marketing','Ventas','RRHH','Finanzas','Operaciones','Producto','Legal','Soporte'];
  const profesionesW = [22, 14, 14, 18, 6, 9, 10, 11, 4, 7];
  const sexos = ['Mujer','Hombre','No binario'];
  const sexosW = [52, 46, 2];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const nombre = `${pick(nombres, r)} ${pick(apellidos, r)}`;
    const sexo = pickWeighted(sexos, sexosW, r);
    // edad with a peak around 32
    const edad = Math.max(19, Math.min(64, Math.round(32 + (r() + r() + r() - 1.5) * 14)));
    const ciudad = pickWeighted(ciudades, ciudadesW, r);
    const profesion = pickWeighted(profesiones, profesionesW, r);
    const baseSalary = { 'Desarrollo': 42000, 'Diseño': 36000, 'Marketing': 34000, 'Ventas': 38000, 'RRHH': 32000, 'Finanzas': 41000, 'Operaciones': 33000, 'Producto': 44000, 'Legal': 48000, 'Soporte': 28000 }[profesion];
    const salario = Math.round((baseSalary + (edad - 28) * 600 + (r() - 0.5) * 8000) / 100) * 100;
    const antiguedad = Math.max(0, Math.min(edad - 22, Math.round(r() * 11)));
    const yyear = 2026 - antiguedad;
    const fecha_alta = dateStr(yyear, randInt(1, 12, r), randInt(1, 28, r));
    rows.push({ nombre, sexo, edad, ciudad, profesion, salario, antiguedad, fecha_alta });
  }
  return rows;
}

function generateViajes(n) {
  const r = rng(13);
  const destinos = [
    { d: 'Tokio',       p: 'Japón',         w: 14, base: 1450 },
    { d: 'Roma',        p: 'Italia',        w: 26, base: 380 },
    { d: 'Nueva York',  p: 'EE.UU.',        w: 18, base: 920 },
    { d: 'Lisboa',      p: 'Portugal',      w: 22, base: 240 },
    { d: 'París',       p: 'Francia',       w: 28, base: 320 },
    { d: 'Bangkok',     p: 'Tailandia',     w: 10, base: 1100 },
    { d: 'Marrakech',   p: 'Marruecos',     w: 12, base: 410 },
    { d: 'Estambul',    p: 'Turquía',       w: 14, base: 360 },
    { d: 'Praga',       p: 'R. Checa',      w: 12, base: 280 },
    { d: 'Buenos Aires',p: 'Argentina',     w: 8,  base: 1280 },
    { d: 'Reikiavik',   p: 'Islandia',      w: 6,  base: 1620 },
    { d: 'El Cairo',    p: 'Egipto',        w: 7,  base: 690 },
    { d: 'Edimburgo',   p: 'Reino Unido',   w: 10, base: 290 },
    { d: 'Berlín',      p: 'Alemania',      w: 14, base: 260 },
  ];
  const aerolineas = ['Iberia','Vueling','Ryanair','Lufthansa','Air France','KLM','British Airways','Emirates'];
  const aerolineasW = [22, 18, 16, 10, 10, 8, 8, 8];
  const rows = [];
  for (let i = 0; i < n; i++) {
    const dest = pickWeighted(destinos, destinos.map(x=>x.w), r);
    const duracion = Math.max(2, Math.round(3 + r() * 9));
    const pasajeros = pickWeighted([1,2,3,4,5,6], [10, 38, 18, 22, 8, 4], r);
    const precio = Math.round((dest.base + duracion * 75 + (r() - 0.5) * dest.base * 0.4) * pasajeros / 50) * 50;
    const m = randInt(4, 6, r);
    const fecha = dateStr(2026, m, randInt(1, 28, r));
    rows.push({ destino: dest.d, pais: dest.p, precio, duracion, fecha, pasajeros, aerolinea: pickWeighted(aerolineas, aerolineasW, r) });
  }
  return rows;
}

function generateVentas(n) {
  const r = rng(21);
  const productos = ['Plan Pro','Plan Team','Plan Starter','Add-on Storage','Add-on Seats','Onboarding','Soporte Premium'];
  const productosW = [28, 22, 30, 8, 6, 3, 3];
  const productoPrecio = { 'Plan Pro': 49, 'Plan Team': 99, 'Plan Starter': 12, 'Add-on Storage': 8, 'Add-on Seats': 6, 'Onboarding': 480, 'Soporte Premium': 220 };
  const clientes = ['Glovo','Cabify','Idealista','BBVA','Santander','Telefónica','Inditex','Mango','Mercadona','El Corte Inglés','Acciona','Repsol','Iberdrola','MásMóvil','Tuenti','Tendam','PcComponentes','Jazztel','Wallapop','Wallbox'];
  const canales = ['Web','Sales','Partner','API'];
  const canalesW = [50, 22, 16, 12];
  const rows = [];
  for (let i = 0; i < n; i++) {
    const p = pickWeighted(productos, productosW, r);
    const unidades = pickWeighted([1, 2, 3, 5, 10, 25], [40, 22, 14, 12, 8, 4], r);
    const importe = productoPrecio[p] * unidades * (0.9 + r() * 0.3);
    const fecha = dateStr(2026, 3, randInt(1, 31, r));
    rows.push({ producto: p, cliente: pick(clientes, r), importe: Math.round(importe), unidades, fecha, canal: pickWeighted(canales, canalesW, r) });
  }
  return rows;
}

// ---------- Análisis ----------

function analyzeColumn(dataset, col) {
  const values = dataset.rows.map(row => row[col.key]).filter(v => v !== undefined && v !== null && v !== '');
  const out = { col, count: values.length, nullCount: dataset.rows.length - values.length };

  if (col.type === 'number') {
    const nums = values.map(Number).filter(n => !isNaN(n));
    nums.sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    out.min = nums[0];
    out.max = nums[nums.length - 1];
    out.mean = sum / nums.length;
    out.median = nums.length % 2 ? nums[(nums.length-1)/2] : (nums[nums.length/2 - 1] + nums[nums.length/2]) / 2;
    // moda
    const freq = {};
    nums.forEach(n => freq[n] = (freq[n] || 0) + 1);
    out.mode = Number(Object.entries(freq).sort((a,b)=>b[1]-a[1])[0][0]);
    out.range = out.max - out.min;
    out.sum = sum;
    // histogram (10 buckets)
    const bins = 10;
    const step = (out.max - out.min) / bins || 1;
    out.histogram = Array.from({length: bins}, (_, i) => {
      const lo = out.min + i * step;
      const hi = i === bins - 1 ? out.max + 0.0001 : lo + step;
      return { lo, hi, count: nums.filter(n => n >= lo && n < hi).length, label: `${Math.round(lo)}` };
    });
    out.values = nums;
  } else if (col.type === 'category' || col.type === 'text') {
    const freq = {};
    values.forEach(v => freq[v] = (freq[v] || 0) + 1);
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    out.distinct = sorted.length;
    out.top = sorted.slice(0, 8).map(([k, v]) => ({ key: k, count: v }));
    out.bottom = sorted.slice(-3).reverse().map(([k, v]) => ({ key: k, count: v }));
    out.mode = sorted[0][0];
    out.modeCount = sorted[0][1];
    out.least = sorted[sorted.length - 1][0];
    out.leastCount = sorted[sorted.length - 1][1];
  } else if (col.type === 'date') {
    const parsed = values.map(v => {
      const [d, m, y] = v.split('/').map(Number);
      return { v, t: new Date(y, m - 1, d).getTime(), d, m, y };
    }).sort((a, b) => a.t - b.t);
    out.earliest = parsed[0].v;
    out.latest = parsed[parsed.length - 1].v;
    // bucket per month
    const buckets = {};
    parsed.forEach(p => {
      const k = `${p.y}-${String(p.m).padStart(2,'0')}`;
      buckets[k] = (buckets[k] || 0) + 1;
    });
    out.timeline = Object.entries(buckets).map(([k, c]) => ({ key: k, count: c }));
    out.distinct = new Set(values).size;
  }
  return out;
}

// Geo coords for travel destinations (approx, just for stylised map)
const GEO = {
  'Tokio':       { x: 0.86, y: 0.42 },
  'Roma':        { x: 0.53, y: 0.36 },
  'Nueva York':  { x: 0.28, y: 0.36 },
  'Lisboa':      { x: 0.47, y: 0.36 },
  'París':       { x: 0.50, y: 0.30 },
  'Bangkok':     { x: 0.78, y: 0.52 },
  'Marrakech':   { x: 0.49, y: 0.42 },
  'Estambul':    { x: 0.59, y: 0.36 },
  'Praga':       { x: 0.54, y: 0.30 },
  'Buenos Aires':{ x: 0.34, y: 0.78 },
  'Reikiavik':   { x: 0.47, y: 0.18 },
  'El Cairo':    { x: 0.60, y: 0.44 },
  'Edimburgo':   { x: 0.49, y: 0.24 },
  'Berlín':      { x: 0.54, y: 0.28 },
  // cities (personas)
  'Madrid':      { x: 0.49, y: 0.40 },
  'Barcelona':   { x: 0.52, y: 0.38 },
  'Valencia':    { x: 0.50, y: 0.42 },
  'Sevilla':     { x: 0.47, y: 0.43 },
  'Bilbao':      { x: 0.49, y: 0.34 },
  'Zaragoza':    { x: 0.50, y: 0.38 },
  'Málaga':      { x: 0.48, y: 0.45 },
  'Granada':     { x: 0.48, y: 0.44 },
  'Murcia':      { x: 0.50, y: 0.43 },
  'Palma':       { x: 0.53, y: 0.40 },
  'Vigo':        { x: 0.46, y: 0.36 },
  'Alicante':    { x: 0.51, y: 0.42 },
  'San Sebastián': { x: 0.50, y: 0.33 },
  'Santander':   { x: 0.48, y: 0.33 },
  'Córdoba':     { x: 0.48, y: 0.44 },
};

Object.assign(window, { DATASETS, analyzeColumn, GEO });
