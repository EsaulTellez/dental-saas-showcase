# 🦷 Dental SaaS - Plataforma de Gestión Clínica y Automatización

> **Nota de Privacidad:** Por motivos de protección de Propiedad Intelectual (IP) y seguridad, el código fuente completo de este SaaS comercial se mantiene en un **repositorio privado**. Este repositorio funciona como un *Showcase* (Vitrina) para demostrar la arquitectura, tecnologías y retos técnicos resueltos durante su desarrollo.

---

## 🚀 Sobre el Proyecto

**Dental SaaS** es una plataforma integral diseñada específicamente para modernizar y optimizar la operación de clínicas dentales. Su objetivo principal es resolver uno de los mayores problemas en el sector salud: **las inasistencias de pacientes (no-shows)**, al mismo tiempo que proporciona herramientas clínicas avanzadas para los odontólogos.

### 💡 Problemas que resuelve:
1.  **Inasistencias:** Mediante la automatización de WhatsApp, los pacientes confirman o cancelan su asistencia con botones interactivos, actualizando la agenda en tiempo real.
2.  **Desorganización Clínica:** Centraliza expedientes, odontogramas interactivos y pagos en un solo lugar.
3.  **Cuellos de botella en recepción:** El portal público permite a nuevos pacientes registrarse y agendar citas por sí mismos.

---

## 🛠️ Stack Tecnológico (Arquitectura Serverless / BaaS)

El proyecto está construido bajo una arquitectura moderna sin servidor (Serverless), garantizando alta disponibilidad, seguridad y escalabilidad a bajo costo.

*   **Frontend:** React 19, Vite, TailwindCSS (UI Moderna y responsiva).
*   **Base de Datos & Backend (BaaS):** Supabase (PostgreSQL).
    *   Uso intensivo de *Row Level Security (RLS)* para multitenancy seguro.
    *   Suscripciones *Realtime* para que la agenda se actualice en vivo sin recargar la página.
*   **Motor Lógico y Automatización:** n8n (Node Based Automation).
    *   Gestión de Webhooks, CRON jobs, y comunicación bidireccional.
*   **Integraciones de Terceros:** Meta Cloud API (WhatsApp Business).

---

## 🌟 Características Principales (Features)

### 1. Agenda Inteligente en Tiempo Real
*   Calendario interactivo con código de colores según el estado de la cita (Confirmada, En sala de espera, Cancelada).
*   Visualización rápida de los horarios de los doctores, descansos y vacaciones.

### 2. Automatización de WhatsApp (Flujo End-to-End)
*   **Envío Automático:** El sistema envía un mensaje de WhatsApp al paciente 24 horas antes de su cita.
*   **Botones Interactivos:** El mensaje incluye botones de Meta ("Confirmar Cita", "Reagendar", "Cancelar").
*   **Webhooks Seguros:** Cuando el paciente presiona un botón, un Webhook en n8n procesa la respuesta, verifica tokens de seguridad, y actualiza el estado en Supabase, reflejándose instantáneamente en la pantalla de la recepcionista.

### 3. Portal de Agendamiento Público
*   Los pacientes pueden acceder a un enlace público, elegir un doctor, ver su disponibilidad en tiempo real, y agendar su propia cita.
*   El sistema calcula automáticamente los tiempos de consulta según el tratamiento seleccionado.

### 4. Módulo Clínico (Odontograma)
*   Registro visual interactivo del historial dental del paciente (Caries, Resinas, Endodoncias, etc.).
*   Notas de evolución clínica aseguradas y ligadas al expediente del paciente.

---

## 🧠 Retos Técnicos Superados

1.  **Sincronización de Zonas Horarias (Timezones):** 
    Manejar correctamente las horas de las citas entre el frontend (navegador del usuario), la base de datos PostgreSQL (UTC) y el motor de automatización n8n para asegurar que los recordatorios de WhatsApp lleguen a la hora exacta en México.
2.  **Seguridad en Webhooks de WhatsApp:** 
    Implementación de tokens criptográficos en los enlaces de reprogramación enviados por WhatsApp para evitar que usuarios malintencionados modifiquen citas de otros pacientes.
3.  **UI/UX Premium:** 
    Construir una interfaz limpia, sin distracciones, utilizando principios de "Glassmorphism" y micro-interacciones para reducir la curva de aprendizaje del personal de la clínica.

---

*Desarrollado con pasión por mejorar el ecosistema de salud digital.*
