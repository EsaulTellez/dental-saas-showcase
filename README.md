# 🦷 Dentisly- Plataforma de Gestión Clínica y Automatización
**Video Demostración: https://drive.google.com/file/d/1Z2OETVKjBoN73o8HtHVgiA9z8EkqKqLM/view?usp=sharing**

> **Nota de Privacidad:** Por motivos de protección de Propiedad Intelectual y seguridad, el código fuente completo de este SaaS comercial se mantiene en un **repositorio privado**. Este repositorio funciona como un showcase para demostrar una parte del proyecto

---

## Sobre el Proyecto

**Dental SaaS** es una plataforma integral diseñada específicamente para modernizar y optimizar la operación de clínicas dentales. Su objetivo principal es resolver uno de los mayores problemas en el sector salud: **las inasistencias de pacientes **, al mismo tiempo que proporciona herramientas clínicas avanzadas para los odontólogos.

###  Problemas que resuelve:
1.  **Inasistencias:** Mediante la automatización de WhatsApp, los pacientes confirman o cancelan su asistencia con botones interactivos, actualizando la agenda en tiempo real.
2.  **Desorganización Clínica:** Centraliza expedientes, odontogramas interactivos y pagos en un solo lugar.
3.  **Cuellos de botella en recepción:** El portal público permite a nuevos pacientes registrarse y agendar citas por sí mismos.

---

##  Stack Tecnológico (Arquitectura Serverless / BaaS)

El proyecto está construido bajo una arquitectura moderna sin servidor , garantizando alta disponibilidad, seguridad y escalabilidad a bajo costo.

*   **Frontend:** React 19, Vite, TailwindCSS 
*   **Base de Datos & Backend (BaaS):** Supabase 
*   **Motor Lógico y Automatización:** n8n 
*   **Integraciones de Terceros:** Meta Cloud API (WhatsApp Business).

---

##  Características Principales

### 1. Agenda Inteligente en Tiempo Real
*   Calendario interactivo con código de colores según el estado de la cita (Confirmada, En sala de espera, Cancelada).
*   Visualización rápida de los horarios de los doctores, descansos y vacaciones.

### 2. Automatización de WhatsApp
*   **Envío Automático:** El sistema envía un mensaje de WhatsApp al paciente 24 horas antes de su cita.
*   **Botones Interactivos:** El mensaje incluye botones de Meta ("Confirmar Cita", "Reagendar", "Cancelar").
*   **Webhooks Seguros:** Cuando el paciente presiona un botón, un Webhook en n8n procesa la respuesta, verifica tokens de seguridad, y actualiza                            el estado en Supabase, reflejándose instantáneamente en la pantalla de la recepcionista.

### 3. Portal de Agendamiento Público
*   Los pacientes pueden acceder a un enlace público, elegir un doctor, ver su disponibilidad en tiempo real, y agendar su propia cita.
*   El sistema calcula automáticamente los tiempos de consulta según el tratamiento seleccionado.

### 4. Expedientes
*   Registro visual interactivo del historial dental del paciente (Caries, Resinas, Endodoncias, etc.).
*   Notas de evolución clínica aseguradas y ligadas al expediente del paciente.

---

##  Retos Técnicos Superados

1.  **Seguridad en Webhooks de WhatsApp:** 
    Implementación de tokens criptográficos en los enlaces de reprogramación enviados por WhatsApp para evitar que usuarios malintencionados modifiquen citas de otros pacientes.
2.  **UI/UX :** 
    Construir una interfaz limpia, sin distracciones, utilizando  micro-interacciones para reducir la curva de aprendizaje del personal de la clínica.

---


### 📊 Dashboard & Agenda

<img width="1918" height="1036" alt="image" src="https://github.com/user-attachments/assets/93dd8053-6463-4a22-9717-b437c9d5a93b" />   
<img width="1918" height="1008" alt="image" src="https://github.com/user-attachments/assets/9c04baea-8145-4873-8227-3e2712b50c3f" />

### 🦷 Odontograma Interactivo
<img width="1915" height="1035" alt="image" src="https://github.com/user-attachments/assets/5a4df028-4351-4909-ab3f-deefe09faca5" />

### 🤖 Automatización de Whatsapp en acción
<div align="center">
  <img width="1229" height="738" alt="image" src="https://github.com/user-attachments/assets/239450ef-56be-4209-97a3-e9d0b5585e3e" />


  <img width="1918" height="1143" alt="image" src="https://github.com/user-attachments/assets/d9dada3e-0cbd-4ee1-b85f-1b492a2b7cc2" />

</div>
