import type { Dataset } from '../types/dataset'

// Deterministic seeded RNG ported from legacy app/data.jsx so the sample
// rows match the legacy dataset exactly (seed=7, n=184).
function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

function pickWeighted<T>(arr: readonly T[], weights: readonly number[], r: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let n = r() * total
  for (let i = 0; i < arr.length; i++) {
    n -= weights[i]
    if (n <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

function randInt(min: number, max: number, r: () => number): number {
  return Math.floor(min + r() * (max - min + 1))
}

function dateStr(y: number, m: number, d: number): string {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function generatePersonas(n: number): Record<string, string | number>[] {
  const r = rng(7)
  const nombres = [
    'Lucía', 'Mateo', 'Sofía', 'Hugo', 'Martina', 'Daniel', 'Paula', 'Álvaro',
    'Valeria', 'Marco', 'Carmen', 'Pablo', 'Elena', 'Diego', 'Inés', 'Adrián',
    'Noa', 'Javier', 'Lola', 'Iker', 'Aitana', 'Bruno', 'Vega', 'Rodrigo',
    'Olivia', 'Gael', 'Claudia', 'Leo', 'Carla', 'Nicolás', 'Andrea', 'Jorge',
    'Rocío', 'Sergio', 'Julia', 'Antonio', 'Ana', 'Marta', 'Pedro', 'Sara',
  ]
  const apellidos = [
    'García', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez',
    'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz',
    'Moreno', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres',
  ]
  const ciudades = [
    'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza',
    'Málaga', 'Granada', 'Murcia', 'Palma', 'Vigo', 'Alicante',
    'San Sebastián', 'Santander', 'Córdoba',
  ]
  const ciudadesW = [38, 28, 16, 14, 11, 9, 8, 6, 5, 5, 4, 4, 3, 3, 3]
  const profesiones = [
    'Desarrollo', 'Diseño', 'Marketing', 'Ventas', 'RRHH', 'Finanzas',
    'Operaciones', 'Producto', 'Legal', 'Soporte',
  ]
  const profesionesW = [22, 14, 14, 18, 6, 9, 10, 11, 4, 7]
  const sexos = ['Mujer', 'Hombre', 'No binario']
  const sexosW = [52, 46, 2]
  const baseSalary: Record<string, number> = {
    Desarrollo: 42000,
    Diseño: 36000,
    Marketing: 34000,
    Ventas: 38000,
    RRHH: 32000,
    Finanzas: 41000,
    Operaciones: 33000,
    Producto: 44000,
    Legal: 48000,
    Soporte: 28000,
  }

  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const nombre = `${pick(nombres, r)} ${pick(apellidos, r)}`
    const sexo = pickWeighted(sexos, sexosW, r)
    const edad = Math.max(19, Math.min(64, Math.round(32 + (r() + r() + r() - 1.5) * 14)))
    const ciudad = pickWeighted(ciudades, ciudadesW, r)
    const profesion = pickWeighted(profesiones, profesionesW, r)
    const salario = Math.round((baseSalary[profesion] + (edad - 28) * 600 + (r() - 0.5) * 8000) / 100) * 100
    const antiguedad = Math.max(0, Math.min(edad - 22, Math.round(r() * 11)))
    const yyear = 2026 - antiguedad
    const fecha_alta = dateStr(yyear, randInt(1, 12, r), randInt(1, 28, r))
    rows.push({ nombre, sexo, edad, ciudad, profesion, salario, antiguedad, fecha_alta })
  }
  return rows
}

export const personas: Dataset = {
  id: 'personas',
  label: 'Personas',
  createdAt: '2026-05-21T00:00:00Z',
  columns: [
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'sexo', label: 'Sexo', type: 'category' },
    { key: 'edad', label: 'Edad', type: 'number' },
    { key: 'ciudad', label: 'Ciudad', type: 'category' },
    { key: 'profesion', label: 'Profesión', type: 'category' },
    { key: 'salario', label: 'Salario', type: 'number' },
    { key: 'antiguedad', label: 'Antigüedad', type: 'number' },
    { key: 'fecha_alta', label: 'Fecha alta', type: 'date' },
  ],
  rows: generatePersonas(184),
}
