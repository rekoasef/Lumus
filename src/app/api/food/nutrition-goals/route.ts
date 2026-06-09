import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nutritionGoalsSchema } from '@/lib/validations/food'

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentario: 1.2,
  moderado: 1.375,
  activo: 1.55,
  muy_activo: 1.725,
}

function calculateTDEE(weightKg: number, heightCm: number, birthDate: string | null, activityLevel: string): number {
  // Mifflin-St Jeor (asumimos hombre por defecto; ajustable con sexo en el futuro)
  const age = birthDate
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 25
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.375))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('weight_kg, height_cm, birth_date, activity_level, trains, daily_calorie_goal, daily_protein_goal')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const suggestedCalories =
    profile.weight_kg && profile.height_cm
      ? calculateTDEE(
          Number(profile.weight_kg),
          Number(profile.height_cm),
          (profile as Record<string, unknown>).birth_date as string | null,
          profile.activity_level ?? 'moderado'
        )
      : null

  const suggestedProtein =
    profile.weight_kg
      ? Math.round(Number(profile.weight_kg) * (profile.trains ? 1.6 : 1.2))
      : null

  return NextResponse.json({
    activity_level: profile.activity_level ?? 'moderado',
    trains: profile.trains ?? false,
    daily_calorie_goal: profile.daily_calorie_goal ?? null,
    daily_protein_goal: profile.daily_protein_goal ?? null,
    weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
    height_cm: profile.height_cm ? Number(profile.height_cm) : null,
    suggested_calories: suggestedCalories,
    suggested_protein: suggestedProtein,
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = nutritionGoalsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { activity_level, trains, daily_calorie_goal, daily_protein_goal } = parsed.data

  const { error } = await supabase
    .from('user_profiles')
    .update({
      activity_level,
      trains,
      daily_calorie_goal: daily_calorie_goal ?? null,
      daily_protein_goal: daily_protein_goal ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
