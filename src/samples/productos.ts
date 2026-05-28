import type { Dataset } from '../types/dataset'
import { pick, pickWeighted, randInt, rng, round2 } from './sampleRng'

function generateProductos(n: number): Record<string, string | number>[] {
  const r = rng(409)
  const categorias = ['Electrónica', 'Hogar', 'Moda', 'Deporte', 'Belleza', 'Libros']
  const categoriasW = [22, 20, 24, 14, 12, 8]
  const marcas = ['Lumen', 'Vela', 'Krate', 'Norte', 'Pámpano', 'Vortex', 'Mistral', 'Bloom']
  const proveedores = ['Iberia Supply', 'Atlas Mayorista', 'Norden', 'SeaLink', 'Talleres Tena']
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const categoria = pickWeighted(categorias, categoriasW, r)
    const marca = pick(marcas, r)
    const sku = `SKU-${String(1000 + i).padStart(5, '0')}`
    const stock = randInt(0, 480, r)
    const precio = round2(
      (categoria === 'Electrónica' ? 80 : categoria === 'Libros' ? 12 : 30) * (0.6 + r() * 2.2),
    )
    const coste = round2(precio * (0.35 + r() * 0.25))
    const margen_pct = round2(((precio - coste) / precio) * 100)
    const proveedor = pick(proveedores, r)
    const valoracion = round2(3.4 + r() * 1.5)
    rows.push({
      sku,
      categoria,
      marca,
      proveedor,
      stock,
      precio_eur: precio,
      coste_eur: coste,
      margen_pct,
      valoracion,
    })
  }
  return rows
}

export const productos: Dataset = {
  id: 'productos',
  label: 'Catálogo de productos',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'category' },
    { key: 'marca', label: 'Marca', type: 'category' },
    { key: 'proveedor', label: 'Proveedor', type: 'category' },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'precio_eur', label: 'Precio (€)', type: 'currency' },
    { key: 'coste_eur', label: 'Coste (€)', type: 'currency' },
    { key: 'margen_pct', label: 'Margen %', type: 'number' },
    { key: 'valoracion', label: 'Valoración', type: 'number' },
  ],
  rows: generateProductos(140),
}
