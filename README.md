
## IDs de piloto y ficha de piloto

- Formato **NXR + 3 cifras**, desde **NXR101**, contando hacia arriba desde la primera alta. Al asignar uno nuevo el sistema comprueba que no lo use ningún otro piloto (si el staff ha puesto a mano uno más alto, lo salta). Pasados NXR999 sigue con 4 cifras.
- El staff con permiso **Pilotos** puede cambiar el ID de cualquier piloto (Staff → Pilotos → Ficha). Se actualizan en cascada sus vuelos, reservas, tickets, tours y demás registros; no se permiten duplicados.
- La **ficha** muestra todos los datos del piloto. Solo un **Admin** puede editarlos.
- **Base de datos ya creada:** ejecuta de nuevo `supabase/schema.sql` y después **una vez** `supabase/migrations/001_ids_nxr.sql`, que renombra los códigos antiguos (`NX0001`…) a `NXR101`… y actualiza todos los documentos que los mencionan. Haz antes una copia de seguridad.

## Aviso de altas pendientes

Cada vez que alguien se registra, todo el staff con permiso **Pilotos** (Admin y los niveles que lo incluyan) recibe una notificación en la campana: «Nueva alta pendiente de revisión: nombre (ID)», con un botón **Revisar** que abre Staff → Pilotos. En la nube lo crea el disparador `handle_new_user` de `supabase/schema.sql` (vuelve a ejecutarlo para activarlo). No se envía correo: haría falta una función de servidor.
