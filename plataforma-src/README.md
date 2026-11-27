# NEXORA AIR VA — plataforma de gestión

> **Ubicación en este repositorio**
> - `plataforma/` → la web ya construida (se sirve en `/plataforma/` de GitHub Pages).
> - `plataforma-src/` → código fuente, esquema de base de datos (`supabase/`) y herramientas.
> - Para reconstruir tras editar `plataforma-src/src/*`: `sh plataforma-src/build.sh`.
> - Las rutas de abajo (`public/`, `src/`, …) son relativas a `plataforma-src/`; `public/` equivale a `plataforma/`.
> - La web actual de la raíz (`index.html`, `css/`, `js/`) **no se ha modificado**.

# NEXORA AIR VA

Plataforma web de la aerolínea virtual NEXORA AIR VA (ICAO NXR, callsign NEXO, VATSIM / IVAO / SimBrief).
Web pública, portal del piloto y panel de staff con roles y permisos, reservas, charter, rutas, tours, eventos, noticias, redes sociales y mapa de vuelos en directo.

Funciona de dos maneras:

| Modo | Cuándo | Datos |
|---|---|---|
| **Demostración** | `public/config.js` vacío | `localStorage` del navegador, con datos de ejemplo |
| **Nube** | `config.js` con tu proyecto de Supabase | PostgreSQL real, login real (contraseñas con bcrypt), roles protegidos por RLS |

GitHub Pages solo sirve archivos estáticos, así que la base de datos, el login y la seguridad los aporta **Supabase** (plan gratuito) y la web se publica en Pages.

## Puesta en marcha (≈15 minutos)

### 1. Supabase
1. Crea un proyecto en <https://supabase.com> (región UE).
2. **SQL Editor → New query**: pega `supabase/schema.sql` y pulsa *Run*.
3. **Authentication → Providers → Email**: déjalo activo. Para empezar puedes desactivar *Confirm email* (si lo dejas activo, cada piloto debe confirmar su correo antes de entrar).
4. **Project Settings → API**: copia la *Project URL* y la clave *anon public*.

### 2. GitHub Pages
1. Sube este repositorio a GitHub (rama `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → pestaña Variables** → crea `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los valores del paso 1.4. (La clave *anon* es pública por diseño; la seguridad está en las políticas RLS.)
4. Haz un push (o lanza el workflow a mano en *Actions*). La web queda en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.
5. En Supabase, **Authentication → URL Configuration**: pon esa dirección en *Site URL*.

### 3. Primer arranque
- **La primera persona que se registre es administradora** y la base de datos se rellena con el catálogo inicial (flota, vuelos, tours, normativa, redes de ejemplo…). Regístrate tú primero.
- Después, desde Staff → Administración: sube los logos, crea los niveles de staff y asigna roles. Los demás pilotos se registran y quedan *Pendientes* hasta que el staff los apruebe.

## Desarrollo local
```sh
./build.sh                               # une src/* en public/index.html
python3 -m http.server -d public 8000    # http://localhost:8000
```
Para probar contra tu Supabase rellena `public/config.js` (no lo subas con claves si prefieres usar las variables del repositorio).

## Estructura
- `src/` módulos que `build.sh` concatena por orden de nombre (`02b-cloud.js` = capa de Supabase, `11c-cloud-actions.js` = alta/login).
- `public/` salida publicada: `index.html`, `config.js`, `routes.csv` (37.594 rutas), `airports.csv` (6.071 aeropuertos), `img/`.
- `supabase/schema.sql` tablas, funciones de permisos y políticas RLS.
- `.github/workflows/pages.yml` construye y despliega en Pages.
- `docs/` Dossier Maestro, tablero de marca y `SEGURIDAD.md`.
- `data/routes_original.csv`, `tools/` para regenerar rutas y el mapamundi de puntos.

## Cómo se guardan los datos (modo nube)
- `profiles` / `profile_private`: un perfil por piloto (código NX0001…, estado, rol). El estado, la verificación y el rol solo los cambia el staff autorizado (trigger `profiles_guard`).
- `nx_docs (coll, id, owner, data)`: flota, tours, reservas, logbook, noticias, redes, marca, roles… Cada colección tiene su permiso en `coll_perm()` y su tipo de acceso en `coll_kind()`.
- El navegador lee todo al cargar, guarda los cambios con medio segundo de retraso y se refresca cada 45 s.

## Pendiente
- **Validación de vuelos en el servidor.** Hoy el cálculo de puntos y la validación del logbook lo hace el navegador; las políticas impiden que un piloto edite o borre su logbook, pero no que cree una entrada falsa. Ver `docs/SEGURIDAD.md`.
- Importación real del OFP de SimBrief y lectura de VATSIM/IVAO (necesitan una función de servidor; con Supabase serían *Edge Functions* programadas).
- Imágenes de flota y logos van dentro de la base de datos (base64); si pesan mucho, moverlas a Supabase Storage.
