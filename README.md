
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

## Presentación animada y eslogan
- La pantalla de bienvenida es dinámica: rutas aéreas animadas con aviones, palabras que aparecen una a una («Conecta. Vuela. Supera.»), eslogan escrito en directo («El piloto vuela, NEXORA AIR hace el resto.»), ticker de funciones y paralaje con el puntero. Respeta `prefers-reduced-motion`.
- En las presentaciones (bienvenida y portada) se habla de «redes de vuelo» en vez de nombrar VATSIM/IVAO. La pestaña Compañía no se ha tocado.

## Descargas y certificados

- Pilotos: la pestaña **Competición** pasa a llamarse **Estadísticas**. Nueva pestaña **Descargas** con subpestañas Libreas, Documentos, Logos y Certificados.
- Staff (Descargas en el menú, permiso `operaciones`): añade, edita o elimina archivos de las tres secciones. Se puede adjuntar un archivo o pegar un enlace externo (Drive, MEGA…) para archivos muy pesados. Los pilotos reciben una notificación al publicar.
- Con Supabase los archivos se guardan en el bucket público `downloads` (máx. 50 MB); en modo demo van dentro del navegador (máx. 1,5 MB). Vuelve a ejecutar `supabase/schema.sql` para crear la colección `dl` y el bucket.
- Certificados: se generan solos al completar un tour, evento o desafío, con felicitación de la aerolínea, y se descargan en PNG o PDF.

## Seguimiento en VATSIM / IVAO reales

- Se ha eliminado el simulador de vuelo del modo demo y la importación simulada de OFP. En el caso operacional solo queda el botón **Generar briefing con SimBrief** (con ruta, avión, indicativo `NEXO…` y remarks ya rellenos).
- **Con Supabase (producción): seguimiento desde el servidor, sin depender de ninguna web abierta.** `supabase/schema.sql` crea una tarea de `pg_cron` que cada minuto pide a VATSIM e IVAO su listado público (con `pg_net`) y:
  1. reconoce todo vuelo con indicativo **NXR…** o **NEXO…** cuyo ID de VATSIM/IVAO (Mi perfil) pertenece a un piloto **activo**;
  2. lo sigue (despegue, millas, última posición) y, si tiene una reserva con la misma salida y llegada, la pasa a «en vuelo» con check-in automático;
  3. cuando se desconecta (3 minutos sin verlo) escribe el vuelo en el Logbook y cierra la reserva. Si no cuadra (sin plan de vuelo, no aterrizó, otro destino, duración muy corta, avión fuera de la flota) queda **en revisión** del staff. Un vuelo sin reserva también se registra.
  4. avisa al piloto y la web le suma los puntos al abrirla (los vuelos del servidor llevan `src='net'`).
- Para activarlo: ejecuta `supabase/schema.sql` y, si el script avisa, activa las extensiones **pg_cron** y **pg_net** en *Database → Extensions* y vuelve a ejecutarlo. Las direcciones de las redes están en la tabla `net_cfg` (se pueden cambiar o desactivar); las sesiones detectadas, en `net_sessions` (visibles para el staff).
- **Sin Supabase:** la web arranca vacía (sin cuentas ni datos de ejemplo) y avisa de que no hay base de datos conectada. Solo para pruebas existe un interruptor oculto (`?demo=1`) que carga datos de ejemplo; `src/11h-network.js` hace entonces el seguimiento en el navegador.
- Limitaciones: el listado de IVAO puede exigir clave (cabeceras en `net_cfg.headers`); sin coordenadas de aeropuertos en la base, el aterrizaje se deduce de la velocidad en la última posición y de que el destino del plan coincida con la reserva.


## Integraciones (staff)

La pestaña **Integraciones** (permiso `sistema`) arranca vacía: no hay nada preintegrado. El administrador da de alta a mano los procesos o servicios que quiera (nombre, tipo, dirección, cabecera y credencial opcionales, notas y estado), los edita, los elimina y, si tienen dirección, pulsa **Comprobar** para consultarla de verdad desde el navegador (algunos servicios no admiten consultas desde el navegador y saldrán «con error»). La credencial no se muestra nunca. `supabase/migrations/003_limpiar_integraciones.sql` borra las integraciones de ejemplo de bases ya creadas (la web también las descarta al cargar).

## Sin datos ni procesos simulados

- Se han retirado los vuelos simulados del mapa, las cuentas de demostración y el tiempo de vuelo aleatorio. El mapa de **vuelos en directo** solo muestra pilotos que VATSIM/IVAO está viendo ahora, en su **posición real** (el servidor la guarda en la reserva cada minuto mientras vuela). Una reserva sin conexión en la red no aparece en el mapa ni avanza sola.
- Datos de ejemplo solo con `?demo=1` (o `localStorage nx-demo=1`), pensado para pruebas.
