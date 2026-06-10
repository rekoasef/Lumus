import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProductScanResult } from '@/types/food.types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const code = request.nextUrl.searchParams.get('code')
  if (!code || !/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
    { headers: { 'User-Agent': 'Lumus/1.0 (radevelopment02@gmail.com)' } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Error al consultar la base de productos' }, { status: 502 })
  }

  const data = await res.json()

  if (data.status === 0 || !data.product) {
    return NextResponse.json({ error: 'Producto no encontrado en la base de datos' }, { status: 404 })
  }

  const p = data.product
  const n = p.nutriments ?? {}

  const result: ProductScanResult = {
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

  return NextResponse.json(result)
}
