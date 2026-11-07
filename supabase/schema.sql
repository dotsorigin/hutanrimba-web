-- Republik Hutan Rimba · Tahap 1: simpan progres per warga
-- Jalankan sekali di Supabase: Dashboard > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang (pakai IF NOT EXISTS / OR REPLACE).
--
-- Prinsip: HP tidak pernah menulis tabel langsung. HP hanya memanggil fungsi
-- (daftar, masuk, ambil, aksi, keluar). Fungsi yang memeriksa dan menghitung.

create extension if not exists pgcrypto;

-- ---------- tabel ----------
create table if not exists warga (
  id           bigserial primary key,
  username     text not null unique check (username ~ '^[a-z0-9._]{1,30}$'),
  spesies      text not null check (length(spesies) between 1 and 40),
  nomor        int,                                  -- nomor warga dari data.js (null = calon warga)
  status       text not null default 'calon' check (status in ('calon','warga','terverifikasi','dicabut')),
  kode_hash    text not null,                        -- Kode Warga, di-hash (bcrypt). Teks asli tidak disimpan.
  gagal        int not null default 0,               -- percobaan masuk yang salah berturut-turut
  kunci_sampai timestamptz,                          -- terkunci sementara setelah terlalu banyak salah
  dibuat       timestamptz not null default now()
);

create table if not exists sesi (
  token    uuid primary key default gen_random_uuid(),
  warga_id bigint not null references warga(id) on delete cascade,
  dibuat   timestamptz not null default now(),
  terakhir timestamptz not null default now()
);
create index if not exists sesi_warga on sesi(warga_id);

create table if not exists progres (
  warga_id      bigint primary key references warga(id) on delete cascade,
  biji          int not null default 0 check (biji >= 0),
  rumah_lv      int not null default 0 check (rumah_lv between 0 and 3),
  pohon         int not null default 0 check (pohon >= 0),
  topi          text[] not null default array['']::text[],
  topi_pakai    text not null default '',
  modal_awal    boolean not null default false,      -- hadiah 20 Biji dari Kepala Rimba
  diimpor       boolean not null default false,      -- progres lama dari HP sudah dipindah
  patroli_hari  date,
  patroli_biji  int not null default 0,
  patroli_akhir timestamptz,
  diperbarui    timestamptz not null default now()
);

create table if not exists catatan (
  id       bigserial primary key,
  warga_id bigint references warga(id) on delete cascade,
  aksi     text not null,
  delta    int not null default 0,                   -- perubahan Biji
  info     jsonb,
  waktu    timestamptz not null default now()
);
create index if not exists catatan_warga on catatan(warga_id, waktu desc);

-- Tidak ada yang boleh menyentuh tabel langsung dari website.
alter table warga   enable row level security;
alter table sesi    enable row level security;
alter table progres enable row level security;
alter table catatan enable row level security;
revoke all on warga, sesi, progres, catatan from anon, authenticated;

-- ---------- aturan main (ubah angka di sini kalau perlu) ----------
create or replace function aturan() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'harga_rumah', jsonb_build_array(0, 30, 100, 250),
    'harga_bibit', 10,
    'maks_pohon', 30,
    'modal_awal', 20,
    'topi', jsonb_build_object('daun',20,'kacamata',25,'bunga',35,'caping',45,'mahkota',120),
    'patroli_maks_sekali', 60,     -- Biji maksimal per satu kali kerja
    'patroli_maks_hari', 400,      -- Biji maksimal dari patroli per hari (WIB)
    'patroli_jeda_detik', 15,      -- jarak minimal antar setoran patroli
    'impor_maks_biji', 300,
    'salah_maks', 5,               -- salah Kode Warga sebelum dikunci
    'kunci_menit', 10
  );
$$;

-- ---------- pembantu ----------
create or replace function _kode_baru() returns text language plpgsql volatile as $$
declare
  hewan text[] := array['KANCIL','GAJAH','OWA','BUAYA','ELANG','RUSA','TUPAI','LANDAK','BADAK','KOMODO','PANDA','RUBAH','KOALA','PENYU','MERAK','KUDA','SAPI','TIGER','KAKATUA','TRENGGILING'];
  warna text[] := array['MERAH','HIJAU','BIRU','KUNING','UNGU','JINGGA','PUTIH','HITAM','EMAS','PERAK','COKLAT','PINK'];
  tempat text[] := array['SUNGAI','KANOPI','SABANA','KAMPUNG','BUKIT','DANAU','RAWA','LEMBAH','GUA','PANTAI','AKAR','DAUN','BATU','KABUT','EMBUN','PELANGI','BULAN','MENTARI','HUJAN','ANGIN'];
  b bytea := gen_random_bytes(4);
begin
  return hewan[1 + get_byte(b,0) % 20] || '-' || warna[1 + get_byte(b,1) % 12] || '-' ||
         tempat[1 + get_byte(b,2) % 20] || '-' || lpad((10 + get_byte(b,3) % 90)::text, 2, '0');
end $$;

create or replace function _warga_dari_token(p_token uuid) returns bigint language plpgsql as $$
declare w bigint;
begin
  update sesi set terakhir = now() where token = p_token returning warga_id into w;
  if w is null then raise exception 'sesi_habis' using errcode = 'P0001'; end if;
  if exists (select 1 from warga where id = w and status = 'dicabut') then raise exception 'akun_dicabut' using errcode = 'P0001'; end if;
  return w;
end $$;

create or replace function _data(w bigint) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'u', wa.username, 's', wa.spesies, 'n', coalesce(wa.nomor, 0), 'status', wa.status,
    'biji', p.biji, 'lv', p.rumah_lv, 'trees', p.pohon, 'hats', to_jsonb(p.topi), 'hat', p.topi_pakai,
    'gift', case when p.modal_awal then 1 else 0 end, 'diimpor', p.diimpor)
  from warga wa join progres p on p.warga_id = wa.id where wa.id = w;
$$;

-- ---------- fungsi untuk website ----------
-- Daftar: membuat warga baru dan Kode Warga. Kode hanya dikembalikan sekali ini.
create or replace function daftar(p_username text, p_spesies text, p_nomor int default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(both '@ ' from coalesce(p_username,''))); k text := _kode_baru(); w bigint; t uuid;
begin
  if u !~ '^[a-z0-9._]{1,30}$' then raise exception 'username_tidak_valid' using errcode = 'P0001'; end if;
  if exists (select 1 from warga where username = u) then raise exception 'sudah_diklaim' using errcode = 'P0001'; end if;
  insert into warga(username, spesies, nomor, status, kode_hash)
    values (u, left(coalesce(p_spesies,'kucing'), 40), p_nomor, case when p_nomor > 0 then 'warga' else 'calon' end, crypt(k, gen_salt('bf', 8)))
    returning id into w;
  insert into progres(warga_id) values (w);
  insert into sesi(warga_id) values (w) returning token into t;
  insert into catatan(warga_id, aksi, info) values (w, 'daftar', jsonb_build_object('spesies', p_spesies, 'nomor', p_nomor));
  return jsonb_build_object('token', t, 'kode', k, 'data', _data(w));
end $$;

-- Masuk dari HP lain: username + Kode Warga.
create or replace function masuk(p_username text, p_kode text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(both '@ ' from coalesce(p_username,''))); r warga; t uuid; a jsonb := aturan();
begin
  select * into r from warga where username = u;
  if r.id is null then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if r.status = 'dicabut' then raise exception 'akun_dicabut' using errcode = 'P0001'; end if;
  if r.kunci_sampai is not null and r.kunci_sampai > now() then raise exception 'terkunci_sementara' using errcode = 'P0001'; end if;
  if r.kode_hash <> crypt(upper(trim(coalesce(p_kode,''))), r.kode_hash) then
    update warga set gagal = gagal + 1,
      kunci_sampai = case when gagal + 1 >= (a->>'salah_maks')::int then now() + make_interval(mins => (a->>'kunci_menit')::int) else kunci_sampai end
      where id = r.id;
    return jsonb_build_object('ok', false, 'galat', 'kode_salah');
  end if;
  update warga set gagal = 0, kunci_sampai = null where id = r.id;
  insert into sesi(warga_id) values (r.id) returning token into t;
  return jsonb_build_object('ok', true, 'token', t, 'data', _data(r.id));
end $$;

create or replace function ambil(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin return _data(_warga_dari_token(p_token)); end $$;

create or replace function keluar(p_token uuid)
returns void language sql security definer set search_path = public, extensions as $$
  delete from sesi where token = p_token;
$$;

-- Semua perubahan progres lewat sini. Server yang menghitung Biji.
create or replace function aksi(p_token uuid, p_jenis text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  w bigint := _warga_dari_token(p_token);
  a jsonb := aturan();
  p progres;
  hari date := (now() at time zone 'Asia/Jakarta')::date;
  n int; harga int; id_topi text;
begin
  select * into p from progres where warga_id = w for update;

  if p_jenis = 'patroli' then
    n := greatest(0, least(coalesce((p_data->>'padam')::int, 0), (a->>'patroli_maks_sekali')::int));
    if p.patroli_akhir is not null and now() - p.patroli_akhir < make_interval(secs => (a->>'patroli_jeda_detik')::int) then
      raise exception 'terlalu_cepat' using errcode = 'P0001'; end if;
    if p.patroli_hari is distinct from hari then p.patroli_hari := hari; p.patroli_biji := 0; end if;
    n := least(n, (a->>'patroli_maks_hari')::int - p.patroli_biji);
    update progres set biji = biji + n, patroli_hari = hari, patroli_biji = p.patroli_biji + n, patroli_akhir = now(), diperbarui = now() where warga_id = w;

  elsif p_jenis = 'modal_awal' then
    if p.modal_awal then n := 0; else n := (a->>'modal_awal')::int; end if;
    update progres set biji = biji + n, modal_awal = true, diperbarui = now() where warga_id = w;

  elsif p_jenis = 'tanam' then
    harga := (a->>'harga_bibit')::int; n := -harga;
    if p.biji < harga then raise exception 'biji_kurang' using errcode = 'P0001'; end if;
    if p.pohon >= (a->>'maks_pohon')::int then raise exception 'pekarangan_penuh' using errcode = 'P0001'; end if;
    update progres set biji = biji - harga, pohon = pohon + 1, diperbarui = now() where warga_id = w;

  elsif p_jenis = 'upgrade' then
    if p.rumah_lv >= 3 then raise exception 'sudah_maksimal' using errcode = 'P0001'; end if;
    harga := (a->'harga_rumah'->>(p.rumah_lv + 1))::int; n := -harga;
    if p.biji < harga then raise exception 'biji_kurang' using errcode = 'P0001'; end if;
    update progres set biji = biji - harga, rumah_lv = rumah_lv + 1, diperbarui = now() where warga_id = w;

  elsif p_jenis = 'topi' then
    id_topi := coalesce(p_data->>'id', '');
    if id_topi <> '' and not (a->'topi' ? id_topi) then raise exception 'topi_tidak_ada' using errcode = 'P0001'; end if;
    n := 0;
    if not (id_topi = any(p.topi)) then
      harga := (a->'topi'->>id_topi)::int; n := -harga;
      if p.biji < harga then raise exception 'biji_kurang' using errcode = 'P0001'; end if;
      update progres set biji = biji - harga, topi = array_append(topi, id_topi) where warga_id = w;
    end if;
    update progres set topi_pakai = id_topi, diperbarui = now() where warga_id = w;

  elsif p_jenis = 'impor' then
    -- sekali saja: progres lama dari HP, dibatasi supaya tidak bisa dipakai curang
    if p.diimpor then raise exception 'sudah_diimpor' using errcode = 'P0001'; end if;
    n := greatest(0, least(coalesce((p_data->>'biji')::int, 0), (a->>'impor_maks_biji')::int));
    update progres set
      biji = biji + n,
      rumah_lv = greatest(rumah_lv, least(3, greatest(0, coalesce((p_data->>'lv')::int, 0)))),
      pohon = greatest(pohon, least((a->>'maks_pohon')::int, greatest(0, coalesce((p_data->>'trees')::int, 0)))),
      modal_awal = modal_awal or coalesce((p_data->>'gift')::int, 0) = 1,
      diimpor = true, diperbarui = now()
      where warga_id = w;

  else
    raise exception 'aksi_tidak_dikenal' using errcode = 'P0001';
  end if;

  insert into catatan(warga_id, aksi, delta, info) values (w, p_jenis, coalesce(n, 0), p_data);
  return _data(w);
end $$;

-- ---------- untuk admin (jalankan dari SQL Editor, bukan dari website) ----------
-- Lupa Kode Warga:   select reset_kode('username');   -> kode baru, kirim lewat DM
create or replace function reset_kode(p_username text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare k text := _kode_baru(); w bigint;
begin
  update warga set kode_hash = crypt(k, gen_salt('bf', 8)), gagal = 0, kunci_sampai = null
    where username = lower(trim(both '@ ' from p_username)) returning id into w;
  if w is null then raise exception 'tidak_ditemukan'; end if;
  delete from sesi where warga_id = w;           -- keluarkan semua HP lama
  insert into catatan(warga_id, aksi) values (w, 'reset_kode');
  return k;
end $$;

-- Cabut klaim username yang salah:   select cabut_klaim('username');
create or replace function cabut_klaim(p_username text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from warga where username = lower(trim(both '@ ' from p_username));
$$;

-- Hanya fungsi website yang boleh dipanggil dari HP.
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function daftar(text, text, int), masuk(text, text), ambil(uuid), keluar(uuid), aksi(uuid, text, jsonb) to anon, authenticated;
