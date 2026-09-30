-- Demo data: Calzado > Zapatilla Runner > three variantes with stock.
--
-- Apply (needs an existing schema — the app's synchronize creates it):
--   sqlite:   docker compose exec -T app sqlite3 database.sqlite < database/seed.sql
--   postgres: docker compose exec -T postgres psql -U postgres -d ecommerce_challenge < database/seed.sql
-- Portable SQL (sqlite + postgres): literal UUIDs and ON CONFLICT DO
-- NOTHING make re-runs no-ops; stock rows match their movimiento_stock
-- deltas so the SUM(delta) = cantidad_disponible invariant holds by
-- construction. The zero-stock variante intentionally has no movement.

INSERT INTO categoria (id, nombre) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Calzado')
ON CONFLICT DO NOTHING;

INSERT INTO producto (id, nombre, descripcion, precio_centavos, moneda, categoria_id) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Zapatilla Runner', 'Zapatilla de running liviana', 129990, 'ARS', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01')
ON CONFLICT DO NOTHING;

INSERT INTO variante (id, sku, producto_id) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'ZAP-RUNNER-42-NEGRO', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'ZAP-RUNNER-42-BLANCO', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'ZAP-RUNNER-43-NEGRO', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02')
ON CONFLICT DO NOTHING;

INSERT INTO atributo_variante (variante_id, nombre, valor) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'talle', '42'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'color', 'negro'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'talle', '42'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'color', 'blanco'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'talle', '43'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'color', 'negro')
ON CONFLICT DO NOTHING;

INSERT INTO stock (sku, cantidad_disponible) VALUES
  ('ZAP-RUNNER-42-NEGRO', 10),
  ('ZAP-RUNNER-42-BLANCO', 3),
  ('ZAP-RUNNER-43-NEGRO', 0)
ON CONFLICT DO NOTHING;

INSERT INTO movimiento_stock (id, sku, delta, motivo, fecha, idempotency_key) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'ZAP-RUNNER-42-NEGRO', 10, 'INGRESO', CURRENT_TIMESTAMP, 'seed-ingreso-ZAP-RUNNER-42-NEGRO'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'ZAP-RUNNER-42-BLANCO', 3, 'INGRESO', CURRENT_TIMESTAMP, 'seed-ingreso-ZAP-RUNNER-42-BLANCO')
ON CONFLICT DO NOTHING;
