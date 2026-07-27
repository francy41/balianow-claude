# Anuncios pre-roll de Google (VAST / IMA)

BailaNow ya reproduce anuncios pre-roll de Google con el **IMA SDK**. Solo tienes
que pegar una **etiqueta VAST** en el panel. Conviven con los anuncios propios.

## Cómo activarlo
1. Panel superadmin → **Publicidad (Vídeo)** → **Nuevo anuncio**.
2. Elige el proveedor **"Google (VAST)"**.
3. Pega tu **etiqueta VAST (adTagUrl)** y elige las categorías donde aparece.
4. Publícalo. Al entrar en esa categoría (usuarios no Premium), Google servirá el pre-roll.

> El tiempo de "saltar", el relleno de inventario y el cobro los gestiona Google.
> Nosotros contamos también impresiones/clics para tu panel.

## Probar YA sin cuenta (etiqueta de muestra de Google)
Usa esta etiqueta VAST oficial de Google para ver el pre-roll funcionando:

```
https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=
```

Crea un anuncio "Google (VAST)", pega esa URL, categoría "Todas", guárdalo y entra
en `/eventos` (sin ser Premium). Debe reproducirse un anuncio de muestra.

## Para anuncios REALES (ingresos)
1. Crea una cuenta de **Google Ad Manager** (o **AdSense for video**).
2. Google revisa el sitio (necesita tráfico y el archivo **`/ads.txt`** con tu línea de editor — ya está el fichero en `public/ads.txt`, solo añade tu línea).
3. Crea una unidad de anuncio de vídeo y copia su **etiqueta VAST**.
4. Pégala en el panel como se indica arriba.

## Notas técnicas
- El SDK se carga desde `https://imasdk.googleapis.com` y la CSP de `vercel.json`
  ya permite IMA + `doubleclick.net` + `googlesyndication.com`.
- Si Google no tiene inventario o el navegador bloquea el anuncio, el reproductor
  se cierra solo a los pocos segundos (nunca bloquea la navegación).
- Los bloqueadores de anuncios impedirán la carga (comportamiento normal).
