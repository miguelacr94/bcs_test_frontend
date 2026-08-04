This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🧠 Reglas de Negocio Implementadas en Frontend

### 1. Manejo de Errores y Bloqueos de Solicitud (Regla de 30 Días)
El frontend intercepta adecuadamente las validaciones críticas emitidas por el backend:
- Si el cliente intenta iniciar una validación y tiene una solicitud finalizada hace menos de 30 días, el sistema captura el error HTTP 400 y muestra un mensaje estructurado (rojo, permanente e *inline* en el formulario) para evitar notificaciones tipo "toast" volátiles.
- El botón de simular se bloquea preventivamente si esta regla es incumplida.

### 2. Reinicio del Estado de Simulación
- Cuando un usuario vuelve a la fase de validación e ingresa un nuevo documento (o el mismo), los campos del simulador (`monto` y `plazo`) se reinician (`""`) forzosamente.
- El botón "Consultar Oferta" se desactiva hasta que el usuario digite valores válidos nuevamente.

### 3. Registro de Motivos (Abandono y Rechazo)
- En la interfaz administrativa y de cliente, cuando se dispara el evento "Abandonar" o "Finalizar sin desembolso", se captura la razón mediante modales interactivos y se la envía en el payload JSON (DTO) correspondiente.
