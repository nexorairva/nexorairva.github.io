
## IDs de piloto y ficha de piloto

- Formato **NXR + 3 cifras**, desde **NXR101**, contando hacia arriba desde la primera alta. Al asignar uno nuevo el sistema comprueba que no lo use ningún otro piloto (si el staff ha puesto a mano uno más alto, lo salta). Pasados NXR999 sigue con 4 cifras.
- El staff con permiso **Pilotos** puede cambiar el ID de cualquier piloto (Staff → Pilotos → Ficha). Se actualizan en cascada sus vuelos, reservas, tickets, tours y demás registros; no se permiten duplicados.
- La **ficha** muestra todos los datos del piloto. Solo un **Admin** puede editarlos.
- **Base de datos ya creada:** ejecuta de nuevo `supabase/schema.sql` y después **una vez** `supabase/migrations/001_ids_nxr.sql`, que renombra los códigos antiguos (`NX0001`…) a `NXR101`… y actualiza todos los documentos que los mencionan. Haz antes una copia de seguridad.

## Aviso de altas pendientes

Cada vez que alguien se registra, todo el staff con permiso **Pilotos** (Admin y los niveles que lo incluyan) recibe una notificación en la campana: «Nueva alta pendiente de revisión: nombre (ID)», con un botón **Revisar** que abre Staff → Pilotos. En la nube lo crea el disparador `handle_new_user` de `supabase/schema.sql` (vuelve a ejecutarlo para activarlo). No se envía correo: haría falta una función de servidor.

## Rechazo de altas y ajuste de horas
- **Rechazar** una solicitud (o eliminar una cuenta) la borra por completo: perfil, datos y, en modo nube, también el usuario de acceso. La persona tendrá que volver a darse de alta y ya no reaparece al refrescar. En modo nube hay que volver a ejecutar `supabase/schema.sql` (añade la función `remove_pilot`).
- **Horas de vuelo (solo Admin):** en la ficha del piloto, "Ajustar horas de vuelo". Es un ajuste auditable (±, con motivo) que se suma a las horas reales: cambia el total y el rango, pero no los rankings mensuales/de temporada. Queda en auditoría y el piloto recibe un aviso. En la base de datos solo un admin puede modificar `profiles.h_adj`.

## Sin datos de ejemplo, retos y textos legales
- La app arranca **sin tours, eventos, retos, calendario ni noticias de ejemplo**. En modo demo se limpian solos una vez; en modo nube ejecuta `supabase/migrations/002_limpiar_ejemplos.sql`.
- **Staff → Operaciones → Eventos y retos:** formulario "Crear reto" (desafío o misión; mide vuelos, horas, millas, aeropuertos o vuelos largos; periodo, objetivo y recompensa). Los retos y eventos se pueden eliminar. Colección `chall` (reejecutar `schema.sql`).
- **Normativa / términos / privacidad:** texto de hasta 60.000 caracteres o archivo adjunto `.txt`, `.md`, `.html`, `.docx` (se convierte en texto de la web) o `.pdf` (se muestra incrustado, máx. 2 MB).
- **Staff → Administración → Marca:** logos y, debajo, "Fondo de la web" (color claro/oscuro, imagen y velo).
- El mapa del panel del piloto solo muestra su vuelo en curso; al terminarlo queda limpio.

## Aeropuertos, rutas, códigos de vuelo, tema y pie de página
- **Aeropuertos y rutas** (`public/airports.csv`, `public/routes.csv`: es la carpeta que se publica; `data/` solo guarda el original). `tools/build_airports.py` completa el listado con todos los aeropuertos con IATA de OpenFlights (6.737 con coordenadas) y `tools/build_routes.py` descarta las rutas con algún extremo sin coordenadas (quedan 37.406). Regenerar: `python3 tools/build_airports.py airports-extended.dat && python3 tools/build_routes.py data/routes_original.csv`.
- **Código de vuelo = ID del piloto** que reserva (oficial, ruta/charter o libre): `NXR104`, etc. La referencia de la programación se guarda aparte (`sched`).
- **Noticias:** en Staff → Noticias, iconos ✎ (editar) y 🗑 (eliminar, con confirmación).
- **Tema:** arranca en oscuro; el botón ☀/🌙 de la cabecera permite cambiarlo y se recuerda en el navegador.
- **Configuración → Colaboradores:** logos (hasta 12, con enlace opcional) que aparecen en el pie de todas las páginas, sobre «© año NEXORA AIR». Colección `partners` (reejecutar `schema.sql`).

## Menú staff unificado, aeropuertos y presentación
- **Staff → Operaciones → Tours, eventos y retos:** una sola pestaña con sub-pestañas Tours / Eventos / Retos / Remarks. Cada tour y cada evento tiene su propio campo **Remark** (si se deja vacío se usa el general). El calendario se gestiona en Eventos.
- **Staff → Operaciones → Aeropuertos:** pestañas *Catálogo* (los 6.737 aeropuertos, con buscador y paginación), *Red y hubs* y *Añadir / importar*. «Editar / Hub» permite cambiar nombre, ciudad, país, coordenadas y zona horaria, marcarlo como hub principal/secundario y meterlo o sacarlo de la red de NEXORA AIR. Las ediciones del catálogo se guardan en `apo` (reejecutar `schema.sql`). `public/airports.csv` ahora incluye nombre, ICAO y zona horaria (`tools/build_airports.py`).
- **Presentación:** al entrar a la web (una vez por sesión del navegador, y solo en la portada) aparece una pantalla de bienvenida; al pulsar en cualquier parte (o Enter/Espacio) pasa al inicio.
