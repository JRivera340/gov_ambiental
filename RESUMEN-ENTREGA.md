# Resumen de la entrega — módulo ambiental para UAESP

Trabajo hecho sobre la rama `version1` de `gov_ambiental`, de corrido, sin
pausas, siguiendo la autorización de autonomía dada. Todo commiteado y
pusheado a `origin/version1` salvo lo que se indica explícitamente como
bloqueado más abajo.

## Estado de cada fase

| Fase | Estado | Commit(s) |
|---|---|---|
| 1. Recrear `version1` desde `test` | ✅ Completa | rama borrada y recreada, forzada a `origin/version1` |
| 2. Login propio y funcional | ✅ Completa, verificada en vivo | `6d5ed41` |
| 3. Datos de prueba ficticios | ✅ Completa, verificada en vivo | incluido en `6d5ed41` (seed.ts) |
| 4. Docker local autosuficiente | ✅ Completa, verificada en vivo (3 ciclos completos desde cero) | `7ff3210`, `fba717d` |
| 5. Limpieza para la entrega | ✅ Completa | `90be1b8` |
| 6. Documentación (12 archivos en `docs/`) | ✅ Completa | `bad7b0a` |
| 7. Verificación final | ✅ Completa, con una salvedad | ver detalle abajo |

## Qué se verificó en vivo (no solo "el código compila")

Con `docker compose up -d --build` desde cero (volúmenes borrados, build
limpio) — repetido 3 veces durante la sesión, la última después de todos los
cambios de limpieza y documentación:

- Los 3 contenedores (`db`, `backend`, `frontend`) levantan y quedan sanos.
- Las migraciones corren solas al arrancar el backend (sin intervención).
- `docker compose exec backend npm run seed` carga 5 usuarios + 30 puntos +
  1 proceso + 2 rutas semanales sin error.
- Login real con los 3 roles (`admin@ejemplo.local`, `validador@ejemplo.local`,
  `gestor1/2/3@ejemplo.local`), cada uno devuelve el rol correcto y un token
  válido.
- Subida de una foto (modo `STORAGE_DRIVER=local`) y descarga posterior —
  contenido idéntico byte a byte.
- Creación de un punto completo con foto y residuo, vía API — `201 Created`,
  con `pointNumber` asignado.
- Ciclo completo enviar → aprobar de ese punto — confirma que el estado pasa
  directo de `ENVIADA` a `PUBLICADA` (documentado en
  `docs/LIMITACIONES-CONOCIDAS.md`, no es un bug, es el diseño real).
- Endpoint público del punto ya publicado responde `200`.
- El bundle de producción del frontend no contiene ninguna referencia a
  "bogotaneidapp" (verificado con `grep` sobre el JS servido).
- `tsc --noEmit` y toda la suite de tests (backend: 99 tests / 18 archivos;
  frontend: 158 tests / 23 archivos) en verde en el estado final del código.
- Sin credenciales reales en el código, la configuración ni el historial de
  `version1` (139 commits revisados con `git log -p` buscando patrones de
  claves de AWS, llaves privadas, tokens de GitHub, y las dos contraseñas de
  Postgres usadas en la sesión anterior de este mismo trabajo — cero
  coincidencias).
- Sin datos de persona real en el seed — nombres, correos (`@ejemplo.local`)
  y observaciones son inventados; los únicos datos "reales" son barrios y
  coordenadas de la localidad Santa Fe (información pública, no de
  personas).

### La única salvedad de la fase 7

**No se probó visualmente en el navegador** (solo contra la API) por no
tener forma de interactuar con una UI gráfica desde este entorno de trabajo.
El frontend responde `200`, el bundle se sirve correcto y no tiene errores
de compilación, pero nadie hizo clic en la interfaz real. Recomiendo una
pasada visual antes de dar la UI por probada de punta a punta — ver también
`docs/LIMITACIONES-CONOCIDAS.md`, sección "rutas semanales", que sí señala
explícitamente la pantalla no verificada.

## Decisiones que tomé sin consultar — para que las revises

1. **Reasigné el número de `docs/README.md` vs el `README.md` de la raíz**:
   la consigna decía "todos en `docs/`", pero un README en la raíz es la
   convención que GitHub renderiza automáticamente al entrar al repo — dejé
   el mismo contenido en ambos lugares en vez de solo en `docs/`.
2. **Borré `frontend/public/images/bogotaneidapp_sinfondo.png`** y sus 3
   referencias en el código (headers de Admin/Validador) — es el logo de
   nuestra plataforma, no de la UAESP ni de la Alcaldía. Dejé el logo de la
   Alcaldía Local de Santa Fe (`alcaldialocalsantafe-sinfondo.png`), que sí
   corresponde al cliente real.
3. **Quité la whitelist de CORS para `*.railway.app`** de `src/main.ts` — es
   infraestructura nuestra, no debía quedar en la entrega. Si la UAESP
   despliega en Railway, tendrán que agregar su propio dominio a
   `CORS_ORIGIN` explícitamente (ya documentado en `.env.example`).
4. **Borré `scripts/migrate-from-legacy.ts`, `scripts/mint-test-token.ts` y
   `src/config/test-identities.ts`** — eran específicos de nuestra propia
   migración desde el hub y del mecanismo de login compartido que ya no
   existe en esta rama. Ninguno tenía sentido para la UAESP.
5. **Agregué `.gitattributes`** forzando LF en `*.sh` — sin esto, clonar en
   Windows con la configuración típica de Git (`core.autocrlf=true`) rompe
   el script de arranque del contenedor (`docker-entrypoint.sh`) con un
   error de intérprete. Lo encontré recién durante la verificación en vivo,
   no antes.
6. **Cambié la ruta `GET /files/raw/:key(*)` a `GET /files/raw/*key`** —
   la sintaxis vieja de wildcard de NestJS/Express dejó de funcionar con la
   versión de `path-to-regexp` que trae este NestJS 11. Lo encontré recién
   al levantar el contenedor por primera vez (no lo hubiera detectado sin
   probarlo en vivo).
7. **No implementé un endpoint `DELETE /puntos/:id`** — no se pidió
   explícitamente y agregarlo tocaría permisos/flujo que no estaban en el
   alcance. Quedó anotado como limitación conocida.
8. **Dejé `xlsx`/`jszip` bajo su licencia MIT** (son dual-licencia
   MIT/GPL-3.0) sin cambiar de librería — es la opción estándar de facto
   para generar Excel en Node y su uso bajo MIT no impone condiciones
   adicionales.

## Pendientes y por qué

- **Rama `docs/deuda-tecnica-asignacion-huerfana` del hub
  (`gov-espacio-publico`) sin pushear**: el commit existe localmente
  (`706ad426`), pero este entorno no tiene credenciales configuradas para el
  remoto de ese repo (a diferencia de `gov_ambiental`, que sí las tiene
  embebidas en la URL por instrucción tuya de una sesión anterior). Ningún
  intento de `git push` ni `git ls-remote` funcionó — falla pidiendo
  usuario/contraseña sin tener una terminal interactiva disponible. Vas a
  tener que pushearla vos mismo:
  ```bash
  cd "gov-espacio-publico"
  git push origin docs/deuda-tecnica-asignacion-huerfana
  ```
- **No pude verificar en vivo el estado real de sincronización de TODAS las
  ramas del hub contra su origin** (mismo bloqueo de credenciales — ni
  siquiera pude hacer un `fetch` fresco). Con la información local
  disponible (último fetch registrado, no re-verificado ahora), estas dos
  ramas preexistentes —no creadas por mí— muestran commits locales no
  reflejados en origin: `mod-notificaciones` (14 commits) y
  `feature/encuestas-dinamicas-integration` (1 commit). No las toqué; las
  señalo para que decidas si hay que pushearlas o si son trabajo en curso
  intencional.
- **UI del frontend no probada visualmente** — ver salvedad de la fase 7
  arriba.
- **`/puntos/merge`, `/puntos/:id/aprobar-residuo` y el módulo de
  sectores** no se probaron en vivo esta ronda (sí tienen tests unitarios) —
  ver `docs/LIMITACIONES-CONOCIDAS.md`.

## Credenciales de los usuarios de prueba del seed

Contraseña igual para los 5: **`Ambiental2026!`**

| Rol | Correo |
|---|---|
| Administrador | `admin@ejemplo.local` |
| Validador Ambiental | `validador@ejemplo.local` |
| Gestor Ambiental | `gestor1@ejemplo.local` |
| Gestor Ambiental | `gestor2@ejemplo.local` |
| Gestor Ambiental | `gestor3@ejemplo.local` |

Todos ficticios — ninguno corresponde a una persona real. Cambiar antes de
cualquier uso con datos reales (ver `docs/SEGURIDAD.md`).

## Comandos exactos para crear el repositorio nuevo con historial limpio

`version1` tiene 139 commits de historial de desarrollo (heredado de `test`
más el trabajo de esta sesión) — no es lo que se quiere entregar a la UAESP.
Para crear un repositorio nuevo, separado, con un único commit inicial:

```bash
# 1. Cloná version1 en una carpeta nueva y limpia
git clone --branch version1 --single-branch \
  https://github.com/JRivera340/gov_ambiental.git gov-ambiental-uaesp
cd gov-ambiental-uaesp

# 2. Borrá todo el historial (esto no toca ningún archivo, solo la carpeta .git)
rm -rf .git

# 3. Iniciá un historial nuevo, un solo commit
git init
git add -A
git commit -m "Entrega inicial — módulo de gestión ambiental de puntos de acumulación de residuos"

# 4. Creá el repositorio vacío en GitHub (o el proveedor que uses) para la
#    UAESP, ANTES de este paso — ninguno de estos comandos lo crea por vos.
git remote add origin <url-del-repositorio-nuevo>
git branch -M main
git push -u origin main
```

Con esto, el repositorio de la UAESP arranca con un solo commit — sin
rastro del historial de desarrollo interno, de las credenciales rotadas
mencionadas en sesiones anteriores, ni de nada que no sea el estado final
del código.

## Qué necesita tu decisión antes de entregar

1. **Confirmar el destino del repositorio nuevo** (organización/cuenta de
   GitHub, nombre) — los comandos de arriba asumen que ya existe un repo
   vacío en destino.
2. **Pushear vos mismo** la rama de deuda técnica del hub (ver "Pendientes"
   arriba) y decidir qué hacer con las 2 ramas preexistentes del hub que
   parecen tener trabajo sin pushear.
3. **Hacer una pasada visual en el navegador** antes de considerar la UI
   probada de punta a punta (ver salvedad de fase 7).
4. **Decidir si agregar CI** (GitHub Actions) al repo de entrega — hoy no
   tiene, está anotado en `docs/LIMITACIONES-CONOCIDAS.md`.
5. **Revisar la licencia Hippocratic 2.1 de `react-leaflet`**
   (`docs/DEPENDENCIAS.md`) — no es una limitación técnica, pero es una
   condición de uso distinta a MIT que quien revise aspectos legales de la
   entrega debería conocer.
