-- Renombrar Comida a Supermercado en categorias default
UPDATE finance_categories SET name = 'Supermercado', icon = 'shopping-cart' WHERE name = 'Comida' AND is_default = true;

-- Cubrir el caso de que el nombre sea Alimentacion
UPDATE finance_categories SET name = 'Supermercado', icon = 'shopping-cart' WHERE name = 'Alimentacion' AND is_default = true;

-- Actualizar la funcion seed para nuevos usuarios
CREATE OR REPLACE FUNCTION seed_default_finance_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM finance_categories WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO finance_categories (user_id, name, type, icon, color, is_default) VALUES
    (p_user_id, 'Supermercado',  'gasto',   'shopping-cart',  '#f97316', true),
    (p_user_id, 'Transporte',    'gasto',   'car',            '#3b82f6', true),
    (p_user_id, 'Ocio',          'gasto',   'gamepad-2',      '#a855f7', true),
    (p_user_id, 'Salud',         'gasto',   'heart-pulse',    '#ef4444', true),
    (p_user_id, 'Educacion',     'gasto',   'graduation-cap', '#06b6d4', true),
    (p_user_id, 'Ropa',          'gasto',   'shirt',          '#ec4899', true),
    (p_user_id, 'Hogar',         'gasto',   'home',           '#84cc16', true),
    (p_user_id, 'Tecnologia',    'gasto',   'laptop',         '#6366f1', true),
    (p_user_id, 'Vencimientos',  'gasto',   'repeat',         '#8b5cf6', true),
    (p_user_id, 'Otros gastos',  'gasto',   'wallet',         '#64748b', true),
    (p_user_id, 'Sueldo',        'ingreso', 'banknote',       '#22c55e', true),
    (p_user_id, 'Freelance',     'ingreso', 'briefcase',      '#10b981', true),
    (p_user_id, 'Inversiones',   'ingreso', 'trending-up',    '#14b8a6', true),
    (p_user_id, 'Otros ingresos','ingreso', 'plus-circle',    '#0ea5e9', true);
END;
$$;
