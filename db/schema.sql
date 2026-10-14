-- Turnly schema, applied idempotently on boot (server.js runs this file with
-- CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so repeated
-- migrations are safe).
--
-- Column names match public/js/domain.js field for field (arisan,
-- anggota_arisan, periode, iuran), plus the reminder layer below, so the
-- screens slot onto real rows without renaming anything. "Telat" is never
-- stored: it is always derived from the periode's due date at render time,
-- which is why `reminders` keeps only the moment a reminder was recorded and
-- no lateness column of its own.

-- One Homeroom user. `language` mirrors public/js/user-profile.js: 'en' or
-- 'id' once a person picks one, and 'en' when they have not. The client
-- profile (localStorage 'turnly.user') is the offline copy; this column is
-- the account copy, from which the server value wins on load.
CREATE TABLE IF NOT EXISTS users (
  id              bigserial PRIMARY KEY,
  username        text UNIQUE,
  language        text NOT NULL DEFAULT 'en',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- A rotating savings group. `rekening_kas` is the group account a member
-- transfers to; `admin_id` names the anggota row of the organizer.
CREATE TABLE IF NOT EXISTS arisan (
  id                 text PRIMARY KEY,
  nama               text NOT NULL,
  nominal            bigint NOT NULL,
  periode            text NOT NULL,
  aturan_jatuh_tempo jsonb,
  tanggal_mulai      date,
  total_periode      integer,
  rekening_kas       text,
  status             text NOT NULL DEFAULT 'berjalan',
  admin_id           text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- One member of a group, in draw order. `user_id` is null for an anggota who
-- has not opened the app yet (the demo's "belum pakai aplikasi").
CREATE TABLE IF NOT EXISTS anggota_arisan (
  id              text PRIMARY KEY,
  arisan_id       text NOT NULL REFERENCES arisan(id),
  user_id         bigint REFERENCES users(id),
  nama_tampil     text NOT NULL,
  nomor_hp        text,
  urutan_giliran  integer NOT NULL,
  peran           text NOT NULL DEFAULT 'anggota'
);

-- One round of a group: who receives the pot and when the contributions are
-- due. The active round is the one with status 'berjalan'.
CREATE TABLE IF NOT EXISTS periode (
  id                   text PRIMARY KEY,
  arisan_id            text NOT NULL REFERENCES arisan(id),
  nomor                integer NOT NULL,
  tanggal_jatuh_tempo  date NOT NULL,
  penerima_anggota_id  text REFERENCES anggota_arisan(id),
  status               text NOT NULL DEFAULT 'berjalan'
);

-- One member's contribution for one round.
CREATE TABLE IF NOT EXISTS iuran (
  id          text PRIMARY KEY,
  periode_id  text NOT NULL REFERENCES periode(id),
  anggota_id  text NOT NULL REFERENCES anggota_arisan(id),
  status      text NOT NULL DEFAULT 'belum'
);

-- A reminder the organizer recorded for one member in one round. The row is
-- the "sent" signal the Status tab reads: `sent_at` is the moment the
-- reminder was recorded, `status` is 'queued' until that moment and 'sent'
-- after it, and `channel` names how it is delivered. `due_id` is the periode
-- the reminder is about, so lateness at read time comes from that due date,
-- never from a stored number. `message_key` is the i18n key of the words that
-- were shown, so a reminder written in one language reads back correctly
-- later.
CREATE TABLE IF NOT EXISTS reminders (
  id            bigserial PRIMARY KEY,
  arisan_id     text NOT NULL REFERENCES arisan(id),
  due_id        text REFERENCES periode(id),
  member_id     text NOT NULL REFERENCES anggota_arisan(id),
  channel       text NOT NULL DEFAULT 'app',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  status        text NOT NULL DEFAULT 'queued',
  created_by    bigint REFERENCES users(id),
  message_key   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminders_member_due
  ON reminders (member_id, due_id, sent_at DESC);
