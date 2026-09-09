CREATE TABLE IF NOT EXISTS flaccid75_model_auth (
 id integer PRIMARY KEY CHECK(id=1),
 encrypted text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
