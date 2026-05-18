# 🚀 GUÍA DE DEPLOY A VERCEL - BaiLa Now

## ✅ Estado Actual
- ✓ Configuración Vercel creada (`vercel.json`)
- ✓ Build probado y funcionando
- ✓ TypeScript: 0 errores
- ✓ GitHub sincronizado (commit: `d71ef75`)
- ✓ Vercel CLI instalado

---

## 📋 PASOS PARA DEPLOY

### **OPCIÓN 1: Dashboard Vercel (Recomendado - Más fácil)**

#### 1. Ve a https://vercel.com/dashboard
```
Si no tienes cuenta, crea una con GitHub (permite auto-sync)
```

#### 2. Click en "Add New..." → "Project"
```
Busca tu repositorio: balianow-claude
```

#### 3. Configura el Proyecto
```
Framework: Vite (Vercel lo detecta automáticamente)
Build Command: npm run build
Output Directory: dist
Root Directory: ./
```

#### 4. Variables de Entorno (IMPORTANTE)
```
Agregalas exactamente como en .env.local:

VITE_SUPABASE_URL = [Tu URL de Supabase]
VITE_SUPABASE_KEY = [Tu API Key de Supabase]
VITE_API_URL = https://api.balianow.com (o tu URL)

⚠️ Estas variables las encuentras en:
   • Supabase Dashboard → Project Settings → API
   • Tu archivo .env.local local
```

#### 5. Click "Deploy"
```
Espera 1-2 minutos
Vercel construye automáticamente y despliega
```

#### 6. ¡Listo!
```
Tu URL será: https://balianow-claude.vercel.app
(O un nombre personalizado si lo configuraste)
```

---

### **OPCIÓN 2: CLI Local (Alternativa)**

Si prefieres hacerlo desde terminal:

```bash
# 1. Loguear en Vercel
vercel login

# 2. Ir al directorio del proyecto
cd "F:\BACHASALSEROS APP WEB\PROYEC LATINO CLAUDE"

# 3. Deploy a producción
vercel --prod

# 4. Seguir prompts interactivos
# (Te preguntará sobre el proyecto, framework, etc)
```

---

## 🔧 Configuración Post-Deploy

### **1. Variables de Entorno**
En Vercel Dashboard:
1. Proyecto → Settings → Environment Variables
2. Agrega las 3 variables de Supabase
3. Las variables se aplicarán automáticamente

### **2. Auto-Deploy desde GitHub**
```
✓ Automático: Cada push a master → nuevo deploy
✓ Preview URLs: Cada PR → preview temporal
✓ Sin configuración adicional necesaria
```

### **3. Dominio Personalizado (Opcional)**
Si quieres `balianow.com` en lugar de `vercel.app`:
```
Settings → Domains → Add Custom Domain
Sigue las instrucciones de DNS
```

---

## 🔍 Verificación Post-Deploy

### **1. Verifica que funciona:**
- Abre https://balianow-claude.vercel.app
- Prueba la home page completa
- Verifica que el buscador funciona
- Prueba navegación a diferentes secciones

### **2. Verifica Performance:**
- Abre DevTools → Lighthouse
- Debería dar 90+ score
- Speeds: ~2-3 segundos

### **3. Revisa Logs:**
Si algo no funciona:
```
Vercel Dashboard → Proyecto → Deployments
→ Haz click en último deploy
→ Logs (puedes ver errores de build)
```

---

## ⚙️ Configuración Vercel.json Actual

```json
{
  "buildCommand": "npm run build",
  "framework": "vite",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_SUPABASE_URL": "@vite_supabase_url",
    "VITE_SUPABASE_KEY": "@vite_supabase_key"
  }
}
```

✓ Vite configurado correctamente
✓ Output directory: dist/
✓ Variables de entorno referenciadas

---

## 🆘 Troubleshooting

### **Build falla con error de TypeScript:**
```
Solución: npm run build localmente y verifica errores
Si está limpio localmente, probablemente sea variables de entorno
```

### **Página no carga o es en blanco:**
```
Causas comunes:
1. Variables de Supabase no configuradas
2. CORS issues (revisar Supabase settings)
3. Cache del navegador (Ctrl+Shift+Del)

Solución: Mira los logs en Vercel Dashboard
```

### **Imágenes no cargan:**
```
✓ Las imágenes de Unsplash/UI Avatars son externas
✓ Vercel debería cargarlas sin problema
✓ Si falla, revisa CORS en Supabase
```

---

## 📊 Después del Deploy

### **1. Configurar CI/CD Automático**
```
✓ Ya está! Cada push a master = auto-deploy
✓ Cada PR = preview URL
```

### **2. Monitoreo**
Vercel te da gratis:
- Web Vitals (performance)
- Error tracking
- Analytics
- Uptime monitoring

### **3. Escalabilidad Futura**
Cuando necesites APIs:
```
Puedes agregar:
- Vercel Functions (serverless)
- Vercel KV (redis)
- Vercel Postgres
- Edge Middleware
```

---

## 📝 Resumen Rápido

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Ir a vercel.com/dashboard | 1 min |
| 2 | Conectar repo GitHub | 2 min |
| 3 | Configurar proyecto | 2 min |
| 4 | Agregar env variables | 2 min |
| 5 | Click Deploy | 1-2 min |
| **Total** | **~10 minutos** | ✓ |

---

## 🎉 ¡Listo!

Una vez deploys en Vercel, tendrás:
- ✅ URL pública en vivo
- ✅ SSL/TLS automático (HTTPS)
- ✅ CDN global para velocidad
- ✅ Auto-scaling bajo demanda
- ✅ CI/CD automático con GitHub
- ✅ Previews en cada PR

---

## 🔗 Links Útiles

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Tu Proyecto:** https://vercel.com/your-team/balianow-claude
- **Documentación Vercel:** https://vercel.com/docs
- **Build Logs:** Dashboard → Deployments → Latest

---

**¿Necesitas ayuda? Cuéntame qué error tienes y lo resolvemos!** 🚀
