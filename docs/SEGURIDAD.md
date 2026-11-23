# Seguridad y límites conocidos

## Qué protege ya la base de datos (RLS, en `supabase/schema.sql`)
- Las contraseñas las gestiona Supabase Auth (bcrypt); nunca llegan a las tablas del VA.
- Un piloto no puede cambiar su `status`, `rol`, `net_ok`, su código ni su fecha de alta (trigger `profiles_guard`).
- Solo un admin puede cambiar roles, y siempre debe quedar al menos un admin.
- Cada colección exige el permiso de su área (`coll_perm`): un Moderador no puede tocar la flota, un nivel sin `redes` no puede editar redes, etc. Marca y roles son solo para admin.
- Reservas: cada piloto crea y edita las suyas. Tickets, incidentes, notificaciones, aceptación de normativa e inscripción a tours: solo su dueño y el staff con el permiso.
- IDs de VATSIM/IVAO/SimBrief y correo: solo el propio piloto y el staff de pilotos (`profile_private`).
- Un piloto no puede editar ni borrar entradas de logbook ni de puntos.

## Lo que todavía NO está protegido
1. **Logbook y puntos falsos.** El cálculo de puntos, rangos y la validación de un vuelo se hacen en el navegador, y un piloto puede *insertar* una entrada con el contenido que quiera. Solución: mover `finalize()` / `settle()` a una función de base de datos o Edge Function, y dejar `log` y `tx` como solo escritura del servidor.
2. **Logros y favoritos** viven en el perfil público del piloto y los puede editar él mismo (son cosméticos, pero los logros dan puntos).
3. **Imágenes** (logos, flota) se guardan en base64 dentro de `nx_docs`; cualquier staff con permiso de flota puede subir un PNG pesado.
4. **Sin limitación de intentos propia**: depende de la protección de Supabase Auth (límites por IP configurables en *Authentication → Rate Limits*).
5. **Eliminar pilotos**: quitar a un piloto desde el panel de staff todavía no se sincroniza con la base de datos; hay que borrarlo en Supabase (Authentication → Users).

## Recomendaciones
- Activa *Confirm email* cuando haya miembros reales.
- No pongas la clave `service_role` nunca en el repositorio ni en `config.js`; solo la `anon`.
- Haz copias periódicas: Supabase → Database → Backups.
