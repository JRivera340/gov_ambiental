# Deuda técnica de gov_ambiental

Registro de hallazgos que no corresponde arreglar en el momento en que se
encuentran. No es un plan de trabajo, es un inventario — cada entrada dice
qué es, dónde está, qué impacto tiene y un esfuerzo estimado (bajo/medio/
alto). Mismo formato que `gov-espacio-publico/DEUDA-TECNICA.md`, pero este
archivo es de este repo — la deuda de la que habla es propia, no del hub.

---

## 1. Sin migración automática al desplegar

**Qué es:** las migraciones de TypeORM se corren a mano
(`npm run migration:run` en local, `npm run migration:run:dist` contra
producción vía `railway run`) — no hay ningún mecanismo que las corra solas
al desplegar. Si se pushea un commit que agrega una columna a una entidad
sin correr la migración correspondiente antes de que ese commit sirva
tráfico, `synchronize: false` en producción hace que TypeORM arme sus
`SELECT` con columnas que no existen todavía en la tabla real — rompe TODOS
los endpoints que tocan esa tabla, no solo la feature nueva.

**Dónde está:** ausencia — `Dockerfile` (`CMD ["node", "dist/main"]`) y
`railway.toml` (sin `startCommand`) no ejecutan ninguna migración antes de
arrancar la app.

**Impacto:** ALTO. Ya causó un riesgo real la noche del 2026-07-30→31: el
commit `2dcd106` (agrega `tipoOperativo` a `PuntoResiduo`) se pusheó y
desplegó antes de correr la migración a mano. No llegó a romper producción
solo porque un intento fallido de automatizarla (ver ítem 2) corrió la
migración pendiente como efecto colateral antes de que ese contenedor
muriera en el healthcheck — pura suerte de timing, no un mecanismo
confiable. La próxima vez que esto pase podría no haber ningún intento de
automatización a mitad de camino que salve la migración.

**Esfuerzo:** MEDIO — ver ítem 2, ya se intentó y no se resolvió en una
sesión.

---

## 2. Automatizar la migración al desplegar — intentado y revertido 2026-07-31

**Qué es:** se intentó que `npm run migration:run:dist` corriera ANTES de
`node dist/main` en el arranque del contenedor (`startCommand` en
`railway.toml` / `CMD` en `Dockerfile`), para cerrar el ítem 1 de raíz. 4
variantes distintas fallaron:
1. CLI de TypeORM invocado directo (`node ./node_modules/typeorm/cli.js -d
   dist/config/data-source.js migration:run`) — el proceso no cerraba solo
   tras terminar (deja el pool de Postgres abierto), el `&&` del comando de
   arranque nunca llegaba a `node dist/main`.
2. Script propio (`scripts/run-migrations-dist.js`) llamando
   `AppDataSource.destroy()` explícitamente — también se colgaba, en
   `destroy()` en vez de en el CLI.
3. Mismo script sin `destroy()` (dejar que el proceso salga con
   `process.exit(0)` sin cerrar el pool prolijamente) — el script SÍ
   terminaba (confirmado en logs: `[MIGRACIONES] Al dia.` seguido de exit),
   pero el deploy igual fallaba el healthcheck — `node dist/main` nunca
   llegaba a imprimir ni una línea de su propio arranque.
4. Mismo script + diagnóstico explícito de código de salida
   (`echo "[DEPLOY] migration:run:dist exit code: $code"`) antes de decidir
   si continuar — ni ese `echo` llegaba a aparecer en los logs del deploy
   fallido, señal de que el problema está en cómo Railway ejecuta ese
   `CMD`/`startCommand` específico (Dockerfile vs Railpack, algún límite de
   tiempo o de recursos durante el arranque, u otra causa no identificada),
   no en el script de Node en sí.

**Dónde está:** revertido — `Dockerfile` volvió a `CMD ["node", "dist/main"]`
sin ningún paso previo; `railway.toml` sin `startCommand`. El script
`scripts/run-migrations-dist.js` queda en el repo (funciona correctamente
corrido a mano vía `railway run`), solo no se invoca automáticamente.

**Impacto:** ALTO — ver ítem 1, es la causa raíz del riesgo real de esa
noche. Mientras no se resuelva, cada cambio de esquema depende de que quien
lo pushea recuerde correr la migración a mano ANTES de que el deploy
automático de Railway (disparado por el push) empiece a servir tráfico —
ventana de tiempo estrecha y manual, sin red de seguridad.

**Esfuerzo:** MEDIO-ALTO. Necesita acceso interactivo a la consola/soporte
de Railway para diagnosticar por qué el `CMD`/`startCommand` no completa su
segunda mitad — no es un problema de lógica de Node (ya se probó que el
script en sí termina correctamente), es específico del entorno de
ejecución de Railway. Alternativas a explorar cuando se retome: un
`pre_deploy_command` separado (campo distinto de `startCommand` en la
config de Railway, corre en un paso previo al deploy en vez de dentro del
mismo `CMD`), o correr la migración desde un healthcheck endpoint propio
que la dispare de forma controlada.
