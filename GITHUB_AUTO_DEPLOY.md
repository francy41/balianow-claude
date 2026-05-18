# 🚀 GITHUB AUTO-DEPLOY PARA VERCEL

## El problema actual
Los deploys desde CLI están teniendo problemas de build. La solución es usar GitHub directamente.

---

## ✅ Solución: GitHub Auto-Deploy

### Paso 1: Ve al Dashboard de Vercel
```
https://vercel.com/solfa-mendezs-projects/balianow-claude
```

### Paso 2: Conecta GitHub
En el Dashboard:
```
Settings → Git Repository → Connect Git Repository
```

Selecciona:
```
Repository: francy41/balianow-claude
Branch: master
```

### Paso 3: Vercel Conectará Automáticamente
Vercel detectará:
- Framework: Vite ✓
- Build Command: npm run build ✓
- Output: dist/ ✓

### Paso 4: Primer Deploy Automático
```
Vercel se activará automáticamente
Build tardará ~2 minutos
Tu app estará EN VIVO ✨
```

### Paso 5: Auto-Deploy Futuro
Cada vez que hagas:
```bash
git push origin master
```

Vercel automáticamente:
1. ✓ Detecta cambios en GitHub
2. ✓ Compila la app
3. ✓ Despliega en producción
4. ✓ Sin que hagas nada

---

## 🎯 Ventajas

- ✅ Build automático con cada push
- ✅ Preview URLs en Pull Requests
- ✅ Logs detallados en Vercel
- ✅ Rollback automático si falla
- ✅ Zero configuración manual

---

## Tu URL Será

```
https://balianow-claude-solfa-mendezs-projects.vercel.app
```

O puedes personalizar el dominio después.

---

**Hazlo ahora en el dashboard de Vercel (3 minutos total)**
