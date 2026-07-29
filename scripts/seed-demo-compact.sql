-- BailaNow · datos DEMO compactos (sin reclamar). Pegar en Supabase SQL Editor y Correr.
BEGIN;

INSERT INTO public.venues (id,user_id,name,type,city,cover,avatar,rating,reviews,capacity,is_open,is_premium,price_range) VALUES
('v1',NULL,'Club Tropicana Madrid','club','Madrid','https://picsum.photos/seed/120/800/450','https://ui-avatars.com/api/?name=Tropicana&background=7C3AED&color=fff&size=200&bold=true',4.8,892,500,t,t,3),
('v2',NULL,'La Sala Latina BCN','lounge','Barcelona','https://picsum.photos/seed/121/800/450','https://ui-avatars.com/api/?name=Sala%20Latina&background=EC4899&color=fff&size=200&bold=true',4.6,445,200,f,t,2),
('v3',NULL,'Studio Latino BCN','studio','Barcelona','https://picsum.photos/seed/122/800/450','https://ui-avatars.com/api/?name=Studio%20Latino&background=F59E0B&color=fff&size=200&bold=true',4.9,312,60,t,f,2),
('v4',NULL,'Rooftop 360 Sevilla','rooftop','Sevilla','https://picsum.photos/seed/123/800/450','https://ui-avatars.com/api/?name=Rooftop%20360&background=EF4444&color=fff&size=200&bold=true',4.7,567,250,t,t,3),
('v5',NULL,'Parc del Fòrum','club','Barcelona','https://picsum.photos/seed/124/800/450','https://ui-avatars.com/api/?name=Forum%20BCN&background=06B6D4&color=fff&size=200&bold=true',4.5,1200,10000,f,t,2),
('v6',NULL,'Azúcar Club Valencia','club','Valencia','https://picsum.photos/seed/125/800/450','https://ui-avatars.com/api/?name=Azucar&background=10B981&color=fff&size=200&bold=true',4.7,389,350,t,f,2),
('v7',NULL,'La Clave Club Paris','club','Paris','https://picsum.photos/seed/126/800/450','https://ui-avatars.com/api/?name=La%20Clave&background=8B5CF6&color=fff&size=200&bold=true',4.8,734,300,t,t,3),
('v8',NULL,'El Son Madrid','club','Madrid','https://picsum.photos/seed/140/800/450','https://ui-avatars.com/api/?name=El%20Son&background=DC2626&color=fff&size=200&bold=true',4.7,1120,400,t,t,3),
('v9',NULL,'Azúcar Madrid','club','Madrid','https://picsum.photos/seed/141/800/450','https://ui-avatars.com/api/?name=Azucar%20Madrid&background=B45309&color=fff&size=200&bold=true',4.6,876,350,t,f,2),
('v10',NULL,'Tropical House Madrid','bar','Madrid','https://picsum.photos/seed/142/800/450','https://ui-avatars.com/api/?name=Tropical%20House&background=059669&color=fff&size=200&bold=true',4.5,432,150,t,f,2),
('v11',NULL,'Magangué Club Madrid','club','Madrid','https://picsum.photos/seed/143/800/450','https://ui-avatars.com/api/?name=Magangue&background=D97706&color=fff&size=200&bold=true',4.4,298,200,f,f,2),
('v12',NULL,'Noches de Salsa Valencia','club','Valencia','https://picsum.photos/seed/144/800/450','https://ui-avatars.com/api/?name=Noches%20Salsa&background=7C3AED&color=fff&size=200&bold=true',4.8,654,300,t,t,2),
('v13',NULL,'Tropicana Valencia','club','Valencia','https://picsum.photos/seed/145/800/450','https://ui-avatars.com/api/?name=Tropicana%20VLC&background=EC4899&color=fff&size=200&bold=true',4.5,387,250,t,f,2),
('v14',NULL,'La Bora Bora Valencia','lounge','Valencia','https://picsum.photos/seed/146/800/450','https://ui-avatars.com/api/?name=Bora%20Bora&background=0891B2&color=fff&size=200&bold=true',4.6,512,400,t,t,3),
('v15',NULL,'La Pachanga Paris','club','Paris','https://picsum.photos/seed/147/800/450','https://ui-avatars.com/api/?name=La%20Pachanga&background=BE185D&color=fff&size=200&bold=true',4.7,892,250,t,t,3),
('v16',NULL,'Le Balajo','club','Paris','https://picsum.photos/seed/148/800/450','https://ui-avatars.com/api/?name=Le%20Balajo&background=C2410C&color=fff&size=200&bold=true',4.8,1456,500,t,t,3),
('v17',NULL,'Cubana Café Paris','bar','Paris','https://picsum.photos/seed/149/800/450','https://ui-avatars.com/api/?name=Cubana%20Cafe&background=15803D&color=fff&size=200&bold=true',4.6,743,180,t,f,2),
('v18',NULL,'La Pollera Colorá','club','London','https://picsum.photos/seed/150/800/450','https://ui-avatars.com/api/?name=La%20Pollera&background=DC2626&color=fff&size=200&bold=true',4.7,1234,400,t,t,3),
('v19',NULL,'Salsa Temple London','club','London','https://picsum.photos/seed/151/800/450','https://ui-avatars.com/api/?name=Salsa%20Temple&background=5B21B6&color=fff&size=200&bold=true',4.6,876,350,t,f,2),
('v20',NULL,'Paradise Superclub London','club','London','https://picsum.photos/seed/152/800/450','https://ui-avatars.com/api/?name=Paradise%20London&background=D97706&color=fff&size=200&bold=true',4.5,567,600,f,t,4),
('v21',NULL,'Jet Set Club','club','Santo Domingo','https://picsum.photos/seed/153/800/450','https://ui-avatars.com/api/?name=Jet%20Set&background=B91C1C&color=fff&size=200&bold=true',4.9,2341,800,t,t,3),
('v22',NULL,'Merengue Club Zona Colonial','bar','Santo Domingo','https://picsum.photos/seed/154/800/450','https://ui-avatars.com/api/?name=Merengue%20Club&background=D97706&color=fff&size=200&bold=true',4.7,934,200,t,f,2),
('v23',NULL,'Afrika Club Santo Domingo','club','Santo Domingo','https://picsum.photos/seed/155/800/450','https://ui-avatars.com/api/?name=Afrika%20Club&background=064E3B&color=fff&size=200&bold=true',4.6,678,500,f,t,3),
('v24',NULL,'Club Gricel','club','Buenos Aires','https://picsum.photos/seed/156/800/450','https://ui-avatars.com/api/?name=Club%20Gricel&background=1E40AF&color=fff&size=200&bold=true',4.9,3456,500,t,t,2),
('v25',NULL,'La Viruta Tango Club','club','Buenos Aires','https://picsum.photos/seed/157/800/450','https://ui-avatars.com/api/?name=La%20Viruta&background=BE185D&color=fff&size=200&bold=true',4.8,2187,400,t,t,2),
('v26',NULL,'La Catedral Milonga','club','Buenos Aires','https://picsum.photos/seed/158/800/450','https://ui-avatars.com/api/?name=La%20Catedral&background=92400E&color=fff&size=200&bold=true',4.7,1567,300,t,f,1),
('v27',NULL,'La Glorieta de Belgrano','rooftop','Buenos Aires','https://picsum.photos/seed/159/800/450','https://ui-avatars.com/api/?name=La%20Glorieta&background=15803D&color=fff&size=200&bold=true',4.9,4231,600,t,f,1),
('v28',NULL,'La Topa Tolondra','club','Cali','https://picsum.photos/seed/160/800/450','https://ui-avatars.com/api/?name=Topa%20Tolondra&background=B91C1C&color=fff&size=200&bold=true',4.9,2876,600,t,t,2),
('v29',NULL,'Siboney Salsa Club','club','Cali','https://picsum.photos/seed/161/800/450','https://ui-avatars.com/api/?name=Siboney&background=D97706&color=fff&size=200&bold=true',4.8,1923,400,t,f,1),
('v30',NULL,'Mala Maña Salsa Bar','bar','Cali','https://picsum.photos/seed/162/800/450','https://ui-avatars.com/api/?name=Mala%20Mana&background=7C3AED&color=fff&size=200&bold=true',4.6,567,150,t,f,1),
('v31',NULL,'Hoy Como Ayer','bar','Miami','https://picsum.photos/seed/163/800/450','https://ui-avatars.com/api/?name=Hoy%20Como%20Ayer&background=065F46&color=fff&size=200&bold=true',4.8,3421,200,t,t,2),
('v32',NULL,'Mango''s Tropical Cafe','restaurant','Miami','https://picsum.photos/seed/164/800/450','https://ui-avatars.com/api/?name=Mangos%20Miami&background=EC4899&color=fff&size=200&bold=true',4.6,5678,500,t,t,3),
('v33',NULL,'Ball & Chain','bar','Miami','https://picsum.photos/seed/165/800/450','https://ui-avatars.com/api/?name=Ball%20Chain&background=B45309&color=fff&size=200&bold=true',4.7,2134,350,t,t,3),
('v34',NULL,'Café Cantante Mi Habana','club','La Habana','https://picsum.photos/seed/166/800/450','https://ui-avatars.com/api/?name=Cafe%20Cantante&background=065F46&color=fff&size=200&bold=true',4.9,4532,600,t,t,1),
('v35',NULL,'Casa de la Música Miramar','club','La Habana','https://picsum.photos/seed/167/800/450','https://ui-avatars.com/api/?name=Casa%20Musica&background=DC2626&color=fff&size=200&bold=true',4.8,3210,800,t,f,1),
('v36',NULL,'Galería Café Libro','bar','Bogotá','https://picsum.photos/seed/168/800/450','https://ui-avatars.com/api/?name=Galeria%20Cafe&background=5B21B6&color=fff&size=200&bold=true',4.7,1876,250,t,t,3),
('v37',NULL,'Quiebra Canto Bogotá','club','Bogotá','https://picsum.photos/seed/169/800/450','https://ui-avatars.com/api/?name=Quiebra%20Canto&background=B91C1C&color=fff&size=200&bold=true',4.6,987,300,t,f,2),
('v38',NULL,'Son Havana Medellín','club','Medellín','https://picsum.photos/seed/170/800/450','https://ui-avatars.com/api/?name=Son%20Havana&background=065F46&color=fff&size=200&bold=true',4.8,1234,300,t,t,2),
('v39',NULL,'El Tibiri Laureles','bar','Medellín','https://picsum.photos/seed/171/800/450','https://ui-avatars.com/api/?name=El%20Tibiri&background=D97706&color=fff&size=200&bold=true',4.7,876,200,t,f,1),
('v40',NULL,'SOB''s — Sounds of Brazil','club','New York','https://picsum.photos/seed/172/800/450','https://ui-avatars.com/api/?name=SOBs%20NY&background=1E40AF&color=fff&size=200&bold=true',4.8,5432,350,t,t,3),
('v41',NULL,'Copacabana NYC','club','New York','https://picsum.photos/seed/173/800/450','https://ui-avatars.com/api/?name=Copacabana%20NY&background=BE185D&color=fff&size=200&bold=true',4.6,3210,700,t,t,4),
('v42',NULL,'SalsaFuego Berlin','club','Berlin','https://picsum.photos/seed/174/800/450','https://ui-avatars.com/api/?name=SalsaFuego&background=EC4899&color=fff&size=200&bold=true',4.7,1098,300,t,f,2),
('v43',NULL,'Havanna Bar Berlin','bar','Berlin','https://picsum.photos/seed/175/800/450','https://ui-avatars.com/api/?name=Havanna%20Berlin&background=15803D&color=fff&size=200&bold=true',4.6,876,250,t,f,2),
('v44',NULL,'El Salón Los Ángeles','club','Ciudad de México','https://picsum.photos/seed/176/800/450','https://ui-avatars.com/api/?name=Salon%20Angeles&background=B45309&color=fff&size=200&bold=true',4.9,6543,800,t,t,1),
('v45',NULL,'Mama Rumba','club','Ciudad de México','https://picsum.photos/seed/177/800/450','https://ui-avatars.com/api/?name=Mama%20Rumba&background=DC2626&color=fff&size=200&bold=true',4.7,2341,400,t,t,3),
('v46',NULL,'Antilla BCN Latin Club','club','Barcelona','https://picsum.photos/seed/178/800/450','https://ui-avatars.com/api/?name=Antilla%20BCN&background=7C3AED&color=fff&size=200&bold=true',4.8,2876,500,t,t,3),
('v47',NULL,'La Carbonería Sevilla','bar','Sevilla','https://picsum.photos/seed/179/800/450','https://ui-avatars.com/api/?name=La%20Carboneria&background=C2410C&color=fff&size=200&bold=true',4.8,4321,300,t,f,1),
('v48',NULL,'El Maní es Así','club','Caracas','https://picsum.photos/seed/180/800/450','https://ui-avatars.com/api/?name=El%20Mani&background=D97706&color=fff&size=200&bold=true',4.7,1543,400,t,t,2),
('v49',NULL,'Juan Sebastián Bar','bar','Caracas','https://picsum.photos/seed/181/800/450','https://ui-avatars.com/api/?name=Juan%20Sebastian&background=5B21B6&color=fff&size=200&bold=true',4.6,987,250,t,f,2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id,user_id,name,type,genre,avatar,cover,city,country,rating,reviews,followers,price_from,is_verified,is_premium) VALUES
('a1',NULL,'DJ Mambo King','dj','{"Salsa","Bachata","Merengue"}','https://ui-avatars.com/api/?name=Mambo%20King&background=7C3AED&color=fff&size=200&bold=true','https://picsum.photos/seed/101/800/450','Madrid','España',4.9,147,12400,350,t,t),
('a2',NULL,'La Reina del Ritmo','dancer','{"Salsa","Son Cubano"}','https://ui-avatars.com/api/?name=La%20Reina&background=EC4899&color=fff&size=200&bold=true','https://picsum.photos/seed/102/800/450','Barcelona','España',5,89,8900,200,t,t),
('a3',NULL,'Orquesta Tropical Fuego','band','{"Salsa","Cumbia","Vallenato"}','https://ui-avatars.com/api/?name=Orquesta%20Fuego&background=F59E0B&color=fff&size=200&bold=true','https://picsum.photos/seed/103/800/450','Valencia','España',4.8,203,21000,1200,t,t),
('a4',NULL,'DJ Bacha Flow','dj','{"Bachata","Urban Latin","Reggaeton"}','https://ui-avatars.com/api/?name=Bacha%20Flow&background=06B6D4&color=fff&size=200&bold=true','https://picsum.photos/seed/104/800/450','Sevilla','España',4.7,112,6700,250,t,f),
('a5',NULL,'Marcos & Elena Dance','dancer','{"Tango","Salsa","Bachata"}','https://ui-avatars.com/api/?name=Marcos%20Elena&background=EF4444&color=fff&size=200&bold=true','https://picsum.photos/seed/105/800/450','Bilbao','España',4.9,67,4500,400,t,f),
('a6',NULL,'DJ Kumbé','dj','{"Afrobeats","Afro-Latin","Cumbia"}','https://ui-avatars.com/api/?name=DJ%20Kumbe&background=10B981&color=fff&size=200&bold=true','https://picsum.photos/seed/106/800/450','Milano','Italia',4.6,88,9200,300,f,f),
('a7',NULL,'Instructora Celia','instructor','{"Salsa","Zumba","Bachata"}','https://ui-avatars.com/api/?name=Celia&background=8B5CF6&color=fff&size=200&bold=true','https://picsum.photos/seed/107/800/450','Madrid','España',4.9,310,15600,60,t,t),
('a8',NULL,'Latin Groove Collective','band','{"Son","Timba","Jazz Latino"}','https://ui-avatars.com/api/?name=Latin%20Groove&background=EC4899&color=fff&size=200&bold=true','https://picsum.photos/seed/108/800/450','Paris','Francia',4.8,156,18300,1800,t,t)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id,title,venue_id,venue_name,city,date,time,cover,category,price,capacity,attending,is_featured,is_premium,created_by) VALUES
('e1','Salsa & Bachata Night — Gran Gala','v1','Club Tropicana Madrid','Madrid','2026-06-07','22:00','https://picsum.photos/seed/110/800/450','{"Salsa","Bachata","Fiesta"}',25,500,387,t,t,NULL),
('e2','Masterclass: Bachata Sensual con DJ Bacha Flow','v3','Studio Latino BCN','Barcelona','2026-05-24','18:00','https://picsum.photos/seed/111/800/450','{"Bachata","Masterclass","Baile"}',35,40,38,t,f,NULL),
('e3','Festival Latino BCN 2026','v5','Parc del Fòrum','Barcelona','2026-07-11','16:00','https://picsum.photos/seed/112/800/450','{"Festival","Salsa","Cumbia","Reggaeton"}',45,5000,3200,t,t,NULL),
('e4','Clase Online: Salsa On2 para Principiantes',NULL,'Online — Zoom','Online','2026-05-20','19:00','https://picsum.photos/seed/113/800/450','{"Salsa","Online","Principiantes"}',15,100,67,f,f,NULL),
('e5','Noche de Timba Cubana','v7','La Clave Club Paris','Paris','2026-06-14','21:30','https://picsum.photos/seed/114/800/450','{"Timba","Son Cubano","Fiesta"}',20,300,189,f,t,NULL),
('e6','Bachata & Reggaeton Open Air','v4','Rooftop 360 Sevilla','Sevilla','2026-06-21','23:00','https://picsum.photos/seed/115/800/450','{"Bachata","Reggaeton","Open Air"}',18,250,201,t,f,NULL)
ON CONFLICT (id) DO NOTHING;

COMMIT;
