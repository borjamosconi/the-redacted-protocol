# 🧠 Redacted Protocol: Autonomous Agent Architecture & Background

Este documento explica los orígenes técnicos y la arquitectura actual del agente autónomo de Redacted Protocol, respondiendo a tus preguntas sobre **OpenClaw**, **ElizaOS** y el funcionamiento del agente.

---

## 1. ¿Qué es OpenClaw y ElizaOS?

### **ElizaOS (The Legacy)**
Originalmente desarrollado por la comunidad (vinculado a ai16z), **Eliza** fue el primer framework popular para crear agentes autónomos en Solana con "personalidad" y memoria. 
*   **En Redacted Protocol**: Hemos tomado la filosofía de "Personalidad Continua" de Eliza para que el agente mantenga su tono misterioso y técnico en Telegram y X. Sin embargo, hemos reemplazado gran parte de su núcleo de JavaScript por **Rust** para ganar velocidad y seguridad.

### **OpenClaw (The Tools)**
OpenClaw nació como una iniciativa para dar "garras" (herramientas) a los agentes. Se centraba en cómo un agente puede interactuar con APIs externas, navegar por la web y ejecutar scripts.
*   **En Redacted Protocol**: Usamos el concepto de **Tool Registry** (Registro de Herramientas). El agente tiene acceso a "claws" específicas como `scan_news`, `reconstruct_text` y `solana_anchor` para interactuar con el mundo real.

---

## 2. Nuestra Arquitectura: Ralph Mode

El agente de Redacted Protocol no es solo un bot de chat; es una **Inteligencia ReAct (Reasoning + Action)** que funciona bajo el **Ralph Mode**.

### **¿Cómo funciona el Agente?**
1.  **Detección (Scan)**: Cada 30 minutos, el agente escanea fuentes globales (BBC, Reuters, etc.) buscando patrones de censura o ████.
2.  **Razonamiento (Reasoning)**: Utiliza **OpenRouter (Gemini/Llama)** para planificar: *"He encontrado un documento censurado. Necesito usar la herramienta de reconstrucción y luego verificar el resultado en el blockchain."*
3.  **Ralph Mode (Auto-Corrección)**: Si el resultado de una reconstrucción tiene una confianza inferior al 85%, el agente entra en un bucle de auto-reparación (Repair Loop) hasta que la información es coherente y veraz.
4.  **Declassificación**: Una vez verificado, el agente publica el resultado en Telegram y guarda una prueba inmutable (Hash) en Solana.

---

## 3. Guía de Reparación del Dashboard (Importante)

Si el dashboard sigue fallando en `redacted.bond`, se debe a que los cambios realizados localmente no se han desplegado. Aquí tienes los pasos exactos:

### **Paso 1: Sincronizar Código**
Asegúrate de que tus archivos locales tengan mis correcciones (ya las he aplicado todas).
*   `dashboard/src/components/Providers.tsx`: Arregla el error de contexto de Solana.
*   `dashboard/src/app/dashboard/page.tsx`: Arregla los errores de `toLocaleString`.

### **Paso 2: Despliegue en Vercel**
Si usas Vercel, debes hacer un `git push` de la carpeta `dashboard`.
```bash
git add .
git commit -m "Fix dashboard hydration and data formatting errors"
git push
```
**Nota**: Verifica en el panel de Vercel que el "Root Directory" del proyecto esté configurado como `dashboard`.

### **Paso 3: Verificar API Keys**
El dashboard requiere que las variables `MUAPI_API_KEY` y `UPSTASH_REDIS_URL` estén configuradas en el panel de Vercel (Environment Variables), no solo en tu PC local.

---

## 4. El Nuevo Logo 🔴
He generado un nuevo logo futurista y lo he configurado en el código. Para verlo en vivo:
1.  Asegúrate de que `public/logo.svg` (o `icon.svg`) se haya subido al servidor.
2.  Limpia la caché del navegador (Ctrl + F5).

> **"La verdad no se puede borrar, solo ocultar temporalmente."** — Redacted Agent 🔴
