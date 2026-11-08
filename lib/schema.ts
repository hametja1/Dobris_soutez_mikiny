/** Databázové schéma soutěže. Aplikace ho vytvoří sama při prvním dotazu. */
export const SCHEMA_SQL = `
-- Databázové schéma soutěže. Aplikace ho vytvoří sama při prvním spuštění,
-- tento soubor slouží pro přehled nebo ruční založení.

CREATE TABLE IF NOT EXISTS settings (
  id                 integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phase              text NOT NULL DEFAULT 'preparation',
  submissions_until  timestamptz,
  voting_until       timestamptz
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS submissions (
  id             serial PRIMARY KEY,
  number         integer NOT NULL UNIQUE,         -- veřejné číslo návrhu
  author_name    text,                            -- neveřejné, po soutěži lze smazat
  author_key     text NOT NULL,                   -- normalizované jméno pro limit návrhů
  troop          text,
  contact        text,                            -- neveřejné, po soutěži lze smazat
  description    text,
  file_url       text NOT NULL,
  content_type   text NOT NULL,
  hidden         boolean NOT NULL DEFAULT false,  -- skryto moderátorem
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_author_key_idx ON submissions (author_key);

CREATE TABLE IF NOT EXISTS votes (
  id          serial PRIMARY KEY,
  device_id   text NOT NULL UNIQUE,               -- náhodné ID zařízení (localStorage + cookie)
  plus1       integer REFERENCES submissions (id) ON DELETE SET NULL,
  plus2       integer REFERENCES submissions (id) ON DELETE SET NULL,
  minus       integer REFERENCES submissions (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Omezení četnosti (neúspěšná přihlášení, nahrávání). Ukládá jen otisk IP adresy.
CREATE TABLE IF NOT EXISTS rate_events (
  kind  text NOT NULL,
  key   text NOT NULL,
  at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_events_idx ON rate_events (kind, key, at);
`;
