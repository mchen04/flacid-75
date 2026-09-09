CREATE TABLE IF NOT EXISTS flaccid75_state (
 id integer PRIMARY KEY CHECK (id = 1),
 data jsonb NOT NULL DEFAULT '{"profile":null,"clock":null,"days":{},"weights":{}}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO flaccid75_state(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS flaccid75_operations (
 id uuid PRIMARY KEY,
 occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 kind text NOT NULL,
 day date NOT NULL
);
CREATE TABLE IF NOT EXISTS flaccid75_rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL,
 resets_at timestamptz NOT NULL
);
