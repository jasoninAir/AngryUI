# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**Interfaz Web moderna y centro de administración remota para [Antigravity CLI](https://github.com/) (`agy`).**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md) • [日本語](README.ja.md) • [Español](README.es.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20aprobados-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20Idiomas-orange.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

[¿Por qué AngryUI?](#-por-qué-angryui) • [Características Principales](#-características-principales) • [Inicio Rápido](#-inicio-rápido) • [Despliegue en Producción](#-despliegue-en-producción) • [Acceso Remoto y VPN](#-acceso-remoto-y-vpn) • [Configuración](#-configuración) • [Arquitectura](#-arquitectura) • [Pruebas](#-pruebas) • [Solución de Problemas](#-solución-de-problemas)

</div>

---

## ✨ ¿Por qué "AngryUI"?

**AngryUI** es un juego de palabras homófono inspirado en **AGY** (`An-Gr-Y` ➔ `AGY`).

Aunque Antigravity CLI (`agy`) ofrece un potente motor de agentes de IA en la terminal, los desarrolladores a menudo necesitan:
1. **Monitoreo remoto y móvil**: Supervisar tareas prolongadas desde teléfonos móviles, tabletas o computadoras portátiles a través de redes LAN o VPN.
2. **Archivos adjuntos y capturas de pantalla**: Pegar imágenes directamente desde el portapapeles (`Cmd+V` / `Ctrl+V`) o arrastrar y soltar archivos sin esfuerzo.
3. **Explorador de archivos del espacio de trabajo**: Examinar la estructura de archivos en un panel lateral, copiar rutas relativas e insertar referencias `@path` con un solo clic.
4. **Control de seguridad y permisos**: Recibir alertas audibles cuando se ejecutan comandos de alto riesgo y aprobarlos dinámicamente mediante tarjetas interactivas o terminal WebTTY.

**AngryUI une la potencia de la terminal con la comodidad del navegador**, con un consumo ultraligero de memoria (**< 50MB**) y sin dependencias de servicios en la nube externos.

---

## 🚀 Características Principales

### ⚡ Transmisión en Tiempo Real y Proceso de Pensamiento
- Integración directa con `agy --print --output-format stream-json`.
- Transmisión instantánea mediante WebSockets de cadenas de razonamiento (Thinking Accordion), tarjetas de herramientas y respuestas finales.

### 🖼️ Multimodal y Pegado de Capturas de Pantalla
- **Pegado instantáneo desde el portapapeles (`Cmd+V` / `Ctrl+V`)**.
- **Arrastrar y soltar**: Carga rápida de múltiples imágenes o documentos locales.
- **Visor Lightbox a pantalla completa**: Vista previa de imágenes de alta resolución y descarga de documentos adjuntos.

### 🌐 Internacionalización en 5 Idiomas (i18n)
- Soporte nativo para **English, 简体中文, 繁體中文, 日本語 y Español**.
- **Detección automática del idioma del dispositivo** en la primera visita.
- Menú emergente minimalista **"aA"** en la esquina inferior izquierda.

### 🛡️ Control de Permisos y Seguridad en Modo Dual
- **Modo Seguro Protegido (Predeterminado)**: Intercepta comandos no autorizados, reproduce un sonido de alerta y muestra una tarjeta de autorización:
  - `Permitir una vez (Allow Once)`: Ejecución únicamente en el turno actual.
  - `Permitir siempre (Always Allow)`: Guarda la regla en `settings.json`.
  - `Abrir WebTTY`: Control interactivo mediante terminal embebida.
- **Modo de Aprobación Automática (Auto-Approve)**: Ejecución continua desatendida.

### 📁 Explorador de Archivos Lateral Plegable
- Árbol de directorios anclado al espacio de trabajo de la sesión actual.
- Carga perezosa de carpetas, iconos semánticos y filtro de búsqueda en tiempo real.
- **Copia de rutas relativas con un clic (📋)** e **inserción directa en el chat (➕ `@path`)**.

### 💻 Terminal WebTTY Embebida
- Terminal completa impulsada por `node-pty` y `xterm.js` con aceleración WebGL.
- Barra de teclas virtuales móviles (`Esc`, `Tab`, `Ctrl+C`, flechas) para pantallas táctiles.

### 🗂️ Gestión de Proyectos y Sesiones
- Sincronización automática de sesiones desde el índice SQLite y los registros locales de `brain/`.
- Renombrado personalizado persistente y filtrado de archivados.
- **Caché en memoria (`sessionCache`)**: Cambio instantáneo entre sesiones sin recargar datos.

### 🔋 Ahorro de Energía y Red
- Pausa automática de solicitudes en segundo plano cuando la pestaña del navegador está oculta o minimizada.

---

## 📦 Inicio Rápido

### Requisitos Previos

- **Node.js** >= 18.0.0
- **Antigravity CLI** instalado (`agy` en `~/.local/bin/agy` o en la variable `$PATH`)

### 1. Instalación

```bash
# Clonar el repositorio
git clone https://github.com/your-username/angryui.git
cd angryui

# Instalar dependencias
npm install
```

### 2. Modo de Desarrollo

```bash
# Iniciar servidores de desarrollo (Frontend Vite :5173 + Backend :3737)
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) en su navegador.

---

## 🚢 Despliegue en Producción

En producción, AngryUI se ejecuta en un **único puerto unificado (`5173`)**, sirviendo frontend estático, API REST y WebSockets.

### Opción A: Demonio PM2 de Alta Disponibilidad (Recomendado)

```bash
# Compilar y arrancar en segundo plano
npm run pm2:start

# Ver registros en tiempo real
npm run pm2:logs

# Reiniciar o detener
npm run pm2:restart
npm run pm2:stop

# Habilitar inicio automático al encender el sistema
pm2 startup && pm2 save
```

### Opción B: Inicio Directo con Node

```bash
# Compilar proyecto
npm run build

# Iniciar servidor en el puerto 5173
npm start

# O especificar un puerto personalizado
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

---

## 🌐 Acceso Remoto y VPN

AngryUI está preparado para ser utilizado desde teléfonos, tabletas o portátiles mediante redes **LAN** o **VPN (Tailscale, WireGuard, ZeroTier, PgyVPN, etc.)**:

```
┌────────────────────────────────────────────────────────┐
│                   Dispositivo Remoto (Móvil / Tablet)   │
│             Navegador: http://192.168.x.x:5173         │
│                 o: http://172.16.x.x:5173              │
└───────────────────────────▲────────────────────────────┘
                            │ Red LAN / Túnel VPN
┌───────────────────────────▼────────────────────────────┐
│                    Máquina Principal (Host)            │
│               Servidor AngryUI (:5173)                 │
└────────────────────────────────────────────────────────┘
```

1. Ejecute `npm run pm2:start` en la máquina principal.
2. Obtenga la IP de red local o IP de la VPN.
3. Abra `http://<IP_HOST>:5173` en su dispositivo remoto.

---

## 🛠️ Configuración

| Parámetro / Variable de Entorno | Argumento CLI | Valor por Defecto | Descripción |
|---------------------------------|---------------|-------------------|-------------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | Puerto del servidor |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | Dirección de enlace (`0.0.0.0` para acceso LAN/VPN) |
| `AGY_WEBUI_TOKEN` | `-t, --token` | (ninguno) | Token de autenticación opcional |
| `AGY_BIN` | - | `~/.local/bin/agy` | Ruta al binario de `agy` |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Directorio raíz de Antigravity |

---

## 🧪 Pruebas Automatizadas

AngryUI cuenta con 70 pruebas automatizadas que cubren pruebas unitarias, de contrato e integración:

```bash
# Ejecutar suite de pruebas completa
npm test

# Modo de observación continua
npm run test:watch
```

---

## 📄 Licencia

Publicado bajo la [Licencia MIT](LICENSE). Código abierto y gratuito para la comunidad.
