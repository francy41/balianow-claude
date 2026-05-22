-- Insertar clases reales asociadas al usuario superadmin como profesor demo
-- (en producción cada profesor crearía las suyas)
DO $$
DECLARE
  v_vendor UUID := '8fcd5e33-d9ef-4827-8194-66dc71d037b5';
  v_class1 UUID;
  v_class2 UUID;
  v_class3 UUID;
  v_class4 UUID;
  v_class5 UUID;
  v_class6 UUID;
  v_date TIMESTAMPTZ;
  v_hour INTEGER;
  v_offering UUID;
  i INTEGER;
BEGIN
  -- Limpiar clases demo previas
  DELETE FROM availability_slots WHERE vendor_id = v_vendor;
  DELETE FROM class_offerings WHERE vendor_id = v_vendor;

  -- 6 clases reales
  INSERT INTO class_offerings (id, vendor_id, title, description, category, style, level, duration_minutes, price, currency, max_students, is_online, cover_image, status)
  VALUES
    (gen_random_uuid(), v_vendor, 'Bachata Sensual — Nivel Intermedio', 'Clase online intensiva de bachata sensual: técnica de conexión, musicalidad y figuras intermedias. Ideal si ya bailas bachata básica.', 'class', ARRAY['Bachata'], 'Intermedio', 60, 25, 'EUR', 1, true, 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=600&h=375&fit=crop', 'active'),
    (gen_random_uuid(), v_vendor, 'Salsa On1 desde cero — Principiantes', 'Aprende salsa estilo Los Angeles paso a paso. Sin pareja necesaria. Grupo reducido de máximo 5 personas.', 'class', ARRAY['Salsa'], 'Principiante', 60, 18, 'EUR', 5, true, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=375&fit=crop', 'active'),
    (gen_random_uuid(), v_vendor, 'Kizomba Fusion — Workshop avanzado', 'Workshop intensivo de 90 minutos para bailarines avanzados. Técnica de tarraxinha, semba moderno y conexión.', 'workshop', ARRAY['Kizomba'], 'Avanzado', 90, 35, 'EUR', 8, true, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=375&fit=crop', 'active'),
    (gen_random_uuid(), v_vendor, 'Reggaeton Femenino — Estilo y actitud', 'Clase de reggaeton para mujeres. Coreografía completa de 1 minuto. Workout + baile + actitud.', 'class', ARRAY['Reggaeton'], 'all', 60, 22, 'EUR', 10, true, 'https://images.unsplash.com/photo-1571266028243-d220bc11f8b1?w=600&h=375&fit=crop', 'active'),
    (gen_random_uuid(), v_vendor, 'Clase privada 1-on-1 (cualquier estilo)', 'Sesión privada de 60 minutos. Tú eliges el estilo y el enfoque. Perfeccionamiento personalizado.', 'private', ARRAY['Bachata','Salsa','Kizomba'], 'all', 60, 45, 'EUR', 1, true, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=375&fit=crop', 'active'),
    (gen_random_uuid(), v_vendor, 'Salsa Cubana / Casino — Grupal', 'Salsa cubana en rueda de casino. Aprende los pasos clásicos y figuras de rueda.', 'class', ARRAY['Salsa','Cumbia'], 'Principiante', 60, 18, 'EUR', 6, true, 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&h=375&fit=crop', 'active');

  -- Crear slots de disponibilidad: próximos 14 días, 4 horas/día (10:00, 16:00, 19:00, 21:00) por cada clase
  FOR v_offering IN SELECT id FROM class_offerings WHERE vendor_id = v_vendor LOOP
    FOR i IN 1..14 LOOP
      FOR v_hour IN SELECT unnest(ARRAY[10, 16, 19, 21]) LOOP
        v_date := date_trunc('day', now() + (i || ' days')::interval) + (v_hour || ' hours')::interval;
        INSERT INTO availability_slots (vendor_id, offering_id, starts_at, ends_at, status, max_students)
        VALUES (
          v_vendor, v_offering, v_date, v_date + interval '60 minutes',
          'available',
          (SELECT max_students FROM class_offerings WHERE id = v_offering)
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Inserted % offerings and % slots',
    (SELECT COUNT(*) FROM class_offerings WHERE vendor_id = v_vendor),
    (SELECT COUNT(*) FROM availability_slots WHERE vendor_id = v_vendor);
END $$;
