# Un pedido, varias reacciones

Demostración educativa de Pub-Sub con Kafka: un productor publica pedidos y dos grupos independientes preparan notificaciones y registran ventas. Interfaz en español, sin framework ni base de datos adicional.

## Ejecutar con Kafka real

Requisitos: Node.js 22+ y Docker con Docker Compose.

```sh
npm install
docker compose up -d
npm start
```

Abre http://localhost:3000. Si aparece «Esperando conexión», espera a que Kafka arranque y reinicia `npm start`. El indicador debe mostrar «Kafka real · Listo».

## Vista de demostración sin Docker

```sh
npm install
npm run demo
```

Esta opción SIMULA el flujo en memoria y se identifica expresamente en pantalla. No conecta con Kafka ni sustituye la demostración real de la tecnología.

## Guion de exposición (3 minutos)

1. Crea un pedido: aparece en el tema y en ambos consumidores.
2. Pausa analítica. Crea dos pedidos más: notificaciones continúa y analítica acumula pendientes.
3. Reanuda analítica: procesa lo pendiente y actualiza ventas.
4. Explica: «El productor publica una vez; cada grupo procesa independientemente».

Pausar suspende la lectura de particiones mediante KafkaJS; no mata un proceso ni simula una caída real. Un evento que ya esté procesándose puede terminar al pausar.

## Alcance

- Kafka real: tema `pedidos-demo`, una partición, grupos `demo-notifications` y `demo-analytics`.
- Kafka conserva eventos y offsets en su volumen. Las tarjetas y la deduplicación son memoria de la aplicación; no son almacenamiento durable ni garantía de exactamente una vez. Al reiniciar la app, los grupos existentes retoman su posición y las tarjetas empiezan vacías; un grupo nuevo puede leer el historial.
- Los contadores de pendientes corresponden únicamente a pedidos publicados en la sesión actual del servidor, no a una consulta del lag de Kafka.
- No envía correos, cobra dinero ni gestiona inventario.
- Un broker, sin autenticación: solo demostración local. El servidor web escucha en la interfaz local.
- No incluye transacciones entre una base de datos y Kafka: no existe base de datos de pedidos en este alcance.

Para detener Kafka conservando datos: `docker compose down`. Para una demostración desde cero, detén también la aplicación y usa `docker compose down -v` (borra los eventos del prototipo), luego vuelve a iniciarlos.

## Verificación

`npm test` comprueba validación e independencia/deduplicación de grupos. La prueba integrada del flujo puede ejecutarse con `node smoke.mjs` mientras la app está activa; crea tres pedidos de prueba y pausa/reanuda analítica.
