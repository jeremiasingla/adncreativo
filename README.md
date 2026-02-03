# ADNCreativo

Generador de creativos y perfiles de cliente con IA, listo para Vercel.

## Requisitos

- Node.js 18+
- Vercel Postgres
- Vercel Blob (para imágenes)

## Instalación

1. Clona el repo:
   ```sh
   git clone https://github.com/jeremiasingla/adncreativo.git
   cd adncreativo
   ```
2. Instala dependencias:
   ```sh
   npm install
   ```
3. Copia `.env.example` a `.env.local` y completa los datos:
   ```sh
   cp .env.example .env.local
   # Edita y pon tus claves
   ```

## Despliegue en Vercel

1. Sube el repo a GitHub.
2. Crea el proyecto en Vercel y conecta tu repo.
3. Crea una base de datos en Vercel Postgres y copia el `POSTGRES_URL`.
4. Crea un storage en Vercel Blob y copia los tokens/URL.
5. Configura las variables de entorno en Vercel.
6. **Proyecto frontend (adncreativo-frontend):** en Settings → General → **Root Directory** pon **`.`** (raíz del repo). Así se usa el `vercel.json` de la raíz, se instalan los workspaces y el build encuentra Vite.
7. **Proyecto backend:** Root Directory = `backend`.
8. Deploy.

## Scripts útiles

- `npm run dev` — desarrollo local
- `npm run build` — build frontend/backend

## Estructura

- `backend/` — API Express, lógica de negocio
- `frontend/` — React (Vite), UI

## Notas

- El backend ya está migrado a Postgres.
- El storage de imágenes debe migrarse a Vercel Blob.
- El frontend carga imágenes desde la URL pública de Blob.

---

Cualquier duda, abre un issue en GitHub.
