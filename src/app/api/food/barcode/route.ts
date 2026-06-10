import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProductScanResult } from '@/types/food.types'

const HEADERS = { 'User-Agent': 'Lumus/1.0 (radevelopment02@gmail.com)' }

/* Intenta Open Food Facts o Open Products Facts (misma estructura de respuesta) */
async function tryOpenFactsDB(code: string, baseUrl: string): Promise<ProductScanResult | null> {
  try {
    const res = await fetch(`${baseUrl}/api/v0/product/${code}.json`, { headers: HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 0 || !data.product) return null

    const p = data.product
    const n = p.nutriments ?? {}

    return {
      code,
      name: p.product_name_es || p.product_name || null,
      brand: p.brands || null,
      quantity: p.quantity || null,
      image_url: p.image_front_small_url || p.image_small_url || null,
      calories_per_100g: n['energy-kcal_100g'] ?? null,
      protein_per_100g: n['proteins_100g'] ?? null,
      carbs_per_100g: n['carbohydrates_100g'] ?? null,
      fat_per_100g: n['fat_100g'] ?? null,
      serving_size: p.serving_size || null,
      calories_per_serving: n['energy-kcal_serving'] ?? null,
      protein_per_serving: n['proteins_serving'] ?? null,
      carbs_per_serving: n['carbohydrates_serving'] ?? null,
      fat_per_serving: n['fat_serving'] ?? null,
    }
  } catch {
    return null
  }
}

/* Fallback: UPC ItemDB — trial endpoint sin API key, 100 req/día */
async function tryUpcItemDB(code: string): Promise<ProductScanResult | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null

    return {
      code,
      name: item.title || null,
      brand: item.brand || null,
      quantity: item.size || null,
      image_url: item.images?.[0] || null,
      calories_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fat_per_100g: null,
      serving_size: null,
      calories_per_serving: null,
      protein_per_serving: null,
      carbs_per_serving: null,
      fat_per_serving: null,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const code = request.nextUrl.searchParams.get('code')
  if (!code || !/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  // 1. Alimentos con nutrición
  const foodResult = await tryOpenFactsDB(code, 'https://world.openfoodfacts.org')
  if (foodResult?.name) return NextResponse.json(foodResult)

  // 2. Productos no-alimentarios (limpieza, higiene, hogar)
  const productResult = await tryOpenFactsDB(code, 'https://world.openproductsfacts.org')
  if (productResult?.name) return NextResponse.json(productResult)

  // 3. Fallback universal — UPC ItemDB (EAN/UPC, cubre prácticamente todo)
  const upcResult = await tryUpcItemDB(code)
  if (upcResult?.name) return NextResponse.json(upcResult)

  return NextResponse.json(
    { error: 'Producto no encontrado. Podés agregar a la lista ingresando el nombre manualmente.' },
    { status: 404 }
  )
}
