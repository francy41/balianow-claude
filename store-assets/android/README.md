# Material gráfico para Google Play

Lo que Play Console pide para publicar BailaNow en Android.

## Ya hecho

| Fichero | Tamaño | Para qué |
|---|---|---|
| `icono-512.png` | 512×512 | Icono de la ficha de la tienda |
| `cabecera-1024x500.png` | 1024×500 | Gráfico destacado |

Se generan con:

```bash
node scripts/play-store-render.mjs
```

El diseño vive en `scripts/play-store-graficos.html`. Si cambia la marca, se
edita ese fichero y se vuelve a lanzar el script: los tamaños salen exactos
porque se recorta cada elemento por su caja, no por el viewport.

Dos detalles que Play Console exige y es fácil incumplir:

- **El icono no lleva esquinas redondeadas ni sombra.** Google aplica su propia
  máscara; si vienen incrustadas se ven dobles.
- **En la cabecera, el texto va lejos de los bordes.** Google la recorta de
  formas distintas según dónde la muestre, y lo que toca el borde se pierde.

## Pendiente: capturas de pantalla

Mínimo 2, recomendable entre 5 y 8. No se generan desde aquí a propósito: este
entorno no alcanza la base de datos, así que saldrían pantallas vacías, y
rellenarlas con datos inventados sería anunciar contenido que no existe.

Se sacan de la web real, en Chrome:

1. Abrir `bailanow.com`
2. `F12` → icono de móvil → **412 × 915**
3. En cada pantalla: `Ctrl+Shift+P` → `screenshot` → *Capture screenshot*

Pantallas sugeridas, por orden de importancia en la ficha:

1. `/` — Inicio
2. `/venues` — Locales
3. `/eventos` — Eventos
4. `/rutas` — Planes de baile
5. `/artistas` — Artistas
6. `/radio` — Radio en directo

Guardarlas aquí, en `store-assets/android/capturas/`.
