# LUMUS — Tools, Skills & MCP

Documentación de las herramientas externas integradas al proyecto para potenciar el desarrollo con Claude Code y Codex.

---

## Resumen

| Herramienta | Tipo | Para qué sirve |
|---|---|---|
| `claude-mem` | Plugin de Claude Code | Memoria persistente entre sesiones de desarrollo |
| `frontend-design` | Skill de Anthropic | Guía a Claude para generar UI premium y no genérica |
| `WebSearch-MCP` | MCP Server | Búsqueda web en tiempo real desde Claude Code |

---

## 1. claude-mem — Memoria Persistente

**Repo:** https://github.com/thedotmack/claude-mem

### ¿Qué hace?
Plugin para Claude Code que captura automáticamente todo lo que Claude hace durante las sesiones de desarrollo, lo comprime con IA y lo inyecta como contexto en sesiones futuras.

Sin esto, cada vez que abrís Claude Code, empieza desde cero sin saber qué hiciste ayer. Con claude-mem, recuerda decisiones arquitecturales, bugs resueltos, convenciones del proyecto, etc.

### Por qué es importante para Lumus
- Lumus tiene muchos módulos y decisiones de arquitectura — sin memoria, Claude Code te va a preguntar lo mismo en cada sesión
- Evita que el agente tome decisiones inconsistentes con lo ya decidido
- Acumula contexto del schema, convenciones y el estado actual del proyecto

### Instalación

```bash
# Instalar una sola vez (global, no por proyecto)
npx claude-mem install
```

Luego reiniciar Claude Code. La memoria empieza a capturarse automáticamente.

### Configuración en el proyecto

El archivo `.mcp.json` en la raíz del proyecto registra el servidor MCP de claude-mem:

```json
{
  "mcpServers": {
    "claude-mem": {
      "command": "npx",
      "args": ["claude-mem", "mcp"],
      "env": {}
    }
  }
}
```

### Cómo funciona
1. **SessionStart** — inyecta contexto relevante de sesiones anteriores
2. **PostToolUse** — captura observaciones después de cada acción del agente
3. **SessionEnd** — comprime y guarda el resumen de la sesión

### Búsqueda de memoria

Dentro de Claude Code podés buscar en el historial:

```
# Buscar decisiones sobre el schema
mem-search "supabase schema finanzas"

# Buscar bugs resueltos
mem-search "bug auth middleware"
```

### Privacidad
Para excluir contenido sensible del storage de memoria:
```
<private>
Este contenido no se va a guardar en claude-mem
</private>
```

---

## 2. frontend-design Skill — UI Premium

**Fuente:** https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

### ¿Qué hace?
Un archivo de skill oficial de Anthropic que guía a Claude Code para generar interfaces frontend distintivas y de calidad producción, evitando los patrones genéricos de "AI slop" (Inter font + gradiente violeta en fondo blanco, etc.).

### Por qué es importante para Lumus
El diseño es una prioridad del proyecto. Sin esta skill, Claude Code tiende a generar UI predecible y genérica. Con esta skill, el agente toma decisiones estéticas con intención.

### Cómo se usa

El archivo `skills/frontend-design/SKILL.md` ya está en el proyecto. Claude Code lo lee automáticamente cuando trabaja en componentes de UI.

**Cuando hacer referencia explícita:**
```
# En un prompt a Claude Code
Usando la skill de frontend-design, creá el componente TaskCard para el módulo de Organización.
```

### Principios que aplica la skill

**Tipografía:** Evita fuentes genéricas (Inter, Roboto, Arial). Elige fuentes con carácter.
> En Lumus usamos Geist — permitido por la skill ya que es una elección deliberada y coherente con el sistema de diseño.

**Color:** Paleta dominante con acentos definidos, no paletas tímidas y distribuidas uniformemente.
> Aplica perfecto con nuestro sistema: `#0a0a0f` base + `#7c6dfa` accent.

**Motion:** Animaciones de impacto en momentos clave — no micro-interacciones dispersas.
> Usar Framer Motion para transiciones de página y estados importantes, no para todo.

**Composición espacial:** Layouts asimétricos, espacio negativo generoso, elementos que rompen la grilla.

**Backgrounds y detalles visuales:** Gradientes, texturas, sombras dramáticas — no fondos sólidos genéricos.

### Lo que NO debe hacer Claude Code en Lumus

Según esta skill + nuestro design system, en ningún componente debe aparecer:
- ❌ Fondo blanco con gradiente violeta genérico
- ❌ Tipografía Inter o Roboto sin justificación
- ❌ Layouts de tarjetas cookie-cutter sin adaptación al contexto
- ❌ Animaciones en cada hover sin propósito
- ❌ Paletas de colores sin jerarquía clara

---

## 3. WebSearch-MCP — Búsqueda Web

**Repo:** https://github.com/mnhlt/WebSearch-MCP

### ¿Qué hace?
Servidor MCP self-hosted que da a Claude Code capacidad de búsqueda web en tiempo real. Útil para que el agente busque documentación actualizada, soluciones a errores, o APIs de librerías mientras desarrolla.

### Por qué es importante para Lumus
- Claude Code puede buscar la doc de Supabase, Next.js, shadcn/ui cuando hay algo que no sabe
- Puede buscar soluciones a errores específicos sin salir del flujo
- Útil para el módulo de IA cuando necesite buscar info sobre modelos o pricing actualizado

### Requisitos
- Docker y Docker Compose instalados

### Setup del Crawler Service

Crear `docker-compose.yml` en una carpeta separada (NO en el repo de Lumus):

```yaml
version: '3.8'

services:
  crawler:
    image: laituanmanh/websearch-crawler:latest
    container_name: websearch-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - LOG_LEVEL=info
      - FLARESOLVERR_URL=http://flaresolverr:8191/v1
    depends_on:
      - flaresolverr
    volumes:
      - crawler_storage:/app/storage

  flaresolverr:
    image: 21hsmw/flaresolverr:nodriver
    container_name: flaresolverr
    restart: unless-stopped
    environment:
      - LOG_LEVEL=info
      - TZ=UTC

volumes:
  crawler_storage:
```

> **Mac con Apple Silicon:** Agregar `platform: "linux/amd64"` al servicio `crawler` y `platform: "linux/arm64"` a `flaresolverr`.

```bash
# Iniciar el crawler
docker-compose up -d

# Verificar que funciona
curl http://localhost:3001/health
```

### Configuración en el proyecto

Agregar al `.mcp.json` del proyecto:

```json
{
  "mcpServers": {
    "websearch": {
      "command": "npx",
      "args": ["websearch-mcp"],
      "env": {
        "API_URL": "http://localhost:3001",
        "MAX_SEARCH_RESULT": "5"
      }
    }
  }
}
```

### Uso dentro de Claude Code

El agente usa el tool `web_search` automáticamente cuando necesita buscar información. También se puede invocar explícitamente:

```
# Pedirle a Claude Code que busque algo específico
Buscá en la doc de Supabase cómo configurar RLS con múltiples roles.
```

### Parámetros disponibles

| Parámetro | Descripción |
|---|---|
| `query` | La búsqueda |
| `numResults` | Cantidad de resultados (default: 5) |
| `language` | Código de idioma (ej: `es`, `en`) |
| `excludeDomains` | Dominios a excluir |
| `resultType` | `all`, `news`, `blogs` |

---

## .mcp.json completo del proyecto

Este archivo va en la raíz del repo (`/lumus/.mcp.json`):

```json
{
  "mcpServers": {
    "claude-mem": {
      "command": "npx",
      "args": ["claude-mem", "mcp"],
      "env": {}
    },
    "websearch": {
      "command": "npx",
      "args": ["websearch-mcp"],
      "env": {
        "API_URL": "http://localhost:3001",
        "MAX_SEARCH_RESULT": "5"
      }
    }
  }
}
```

---

## Estructura de archivos de skills

```
lumus/
├── .mcp.json                          → Config de MCP servers
├── CLAUDE.md                          → Instrucciones para Claude Code
├── skills/
│   └── frontend-design/
│       └── SKILL.md                   → Skill de diseño de Anthropic
└── docs/
    └── TOOLS_AND_SKILLS.md            → Este archivo
```

---

## Checklist de setup inicial

Antes de empezar a desarrollar, verificar:

- [ ] `npx claude-mem install` ejecutado y Claude Code reiniciado
- [ ] Docker corriendo con `docker-compose up -d` en la carpeta del crawler
- [ ] `curl http://localhost:3001/health` devuelve `{ "status": "ok" }`
- [ ] `.mcp.json` en la raíz del proyecto con ambos servers configurados
- [ ] `skills/frontend-design/SKILL.md` presente en el repo

---

## Notas importantes

**claude-mem es global**, no por proyecto — se instala una sola vez y funciona para todos los proyectos.

**WebSearch-MCP requiere Docker corriendo** — si el crawler no está activo, el tool simplemente no funciona pero no rompe nada.

**La skill de frontend-design** no requiere instalación — es solo un archivo `.md` que Claude Code lee. Lo que importa es que esté en el repo y que se lo referencie en los prompts cuando se trabaje en UI.
