/* Foundation preview screen renderer.
 *
 * Tahap 1 only: proves the theme, the base components and the demo data
 * work together. Tahap 2 replaces this screen with the real Beranda and
 * Detail arisan, reusing these pieces. All copy comes from i18n; names go
 * into the DOM as text nodes, never as HTML.
 */
(function () {
  'use strict';

  var d = window.TurnlyDomain;
  var t = window.TurnlyI18n.t;
  var demo = window.TurnlyDemoData;
  var un = window.unNative || null;

  var HARI_INI = demo.DEMO_HARI_INI;
  var PENGGUNA_ID = demo.PENGGUNA_DEMO_ID;

  var STATUS_KEYS = ['lunas', 'menunggu', 'belum', 'telat'];
  var AVATAR_CLASS = {
    lunas: 'avatar-lunas',
    menunggu: 'avatar-menunggu',
    belum: 'avatar-belum',
    telat: 'avatar-telat',
  };
  var CHIP_CLASS = {
    lunas: 'chip-lunas',
    menunggu: 'chip-menunggu',
    belum: 'chip-belum',
    telat: 'chip-telat',
  };

  function statusLabel(status) {
    if (status.key === 'telat') {
      return status.telatHari === 1 ? t('status.telat.1') : t('status.telat', { n: status.telatHari });
    }
    return t('status.' + status.key);
  }

  function statusKet(status) {
    return t('ket.' + status.key);
  }

  function initials(nama) {
    var words = nama.split(/\s+/).filter(Boolean);
    var letters = words.slice(0, 2).map(function (w) { return w.charAt(0); });
    return letters.join('').toUpperCase();
  }

  // A status avatar. When labelled, it is announced as "Bu Rina, Belum bayar".
  function avatarEl(nama, status, opts) {
    var el = document.createElement('span');
    el.className = 'avatar ' + AVATAR_CLASS[status.key] + (opts && opts.mini ? ' avatar-sm' : '');
    el.textContent = initials(nama);
    if (opts && opts.mini) {
      el.setAttribute('aria-hidden', 'true'); // the row's chip already says the status
    } else {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', nama + ', ' + statusLabel(status));
    }
    return el;
  }

  function chipEl(status) {
    var el = document.createElement('span');
    el.className = 'chip ' + CHIP_CLASS[status.key];
    el.textContent = statusLabel(status);
    return el;
  }

  function tagEl(text) {
    var el = document.createElement('span');
    el.className = 'tag';
    el.textContent = text;
    return el;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ── Hero: the pengguna's unpaid iuran, nearest due first ────────────────
  function statusPengguna(arisan) {
    var anggota = (arisan.anggota || []).filter(function (a) { return a.user_id === PENGGUNA_ID; })[0];
    if (!anggota) return null;
    var iuran = d.iuranUntukAnggota(arisan, anggota.id);
    return {
      anggota: anggota,
      status: d.statusIuranTampil(iuran, arisan.periode_aktif, HARI_INI),
    };
  }

  function jatuhTempoText(arisan) {
    var jt = arisan.periode_aktif.tanggal_jatuh_tempo;
    var tanggal = d.formatTanggalPendek(jt);
    var n = d.selisihHari(HARI_INI, jt);
    if (n === 0) return t('iuran.jatuh_tempo.hari_ini');
    if (n < 0) return t('iuran.jatuh_tempo.lewat', { n: -n });
    return t('iuran.jatuh_tempo.lagi', { tanggal: tanggal, n: n });
  }

  function renderHero() {
    var belumBayar = demo.arisan
      .map(function (arisan) {
        var s = statusPengguna(arisan);
        return s && (s.status.key === 'belum' || s.status.key === 'telat')
          ? { arisan: arisan, status: s.status } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return d.selisihHari(HARI_INI, a.arisan.periode_aktif.tanggal_jatuh_tempo)
             - d.selisihHari(HARI_INI, b.arisan.periode_aktif.tanggal_jatuh_tempo);
      });

    var label = document.getElementById('hero-label');
    var nama = document.getElementById('hero-nama');
    var nominal = document.getElementById('hero-nominal');
    var tempo = document.getElementById('hero-jatuh-tempo');
    var tombol = document.getElementById('btn-bayar');

    if (!belumBayar.length) {
      label.textContent = t('iuran.label');
      nama.textContent = t('iuran.lunas_semua');
      nominal.hidden = true;
      tempo.hidden = true;
      tombol.hidden = true;
      return;
    }

    var pilihan = belumBayar[0];
    label.textContent = t('iuran.label');
    nama.textContent = pilihan.arisan.nama;
    nominal.textContent = d.formatRupiah(pilihan.arisan.nominal);
    tempo.textContent = jatuhTempoText(pilihan.arisan);
    tombol.textContent = t('aksi.bayar');
    tombol.addEventListener('click', function () { bukaSheetBayar(pilihan.arisan); });
  }

  // ── "Arisan Anda": one row per arisan ────────────────────────────────────
  function renderDaftarArisan() {
    document.getElementById('arisan-anda-label').textContent = t('arisan.anda');
    var ul = document.getElementById('daftar-arisan');

    demo.arisan.forEach(function (arisan) {
      var milik = statusPengguna(arisan);
      var li = el('li', 'list-row justify-between');

      var kiri = el('div', 'flex min-w-0 items-center gap-3');
      kiri.appendChild(avatarEl(milik.anggota.nama_tampil, milik.status, { mini: true }));
      var teks = el('div', 'min-w-0');
      teks.appendChild(el('p', 'truncate text-body font-medium', arisan.nama));
      teks.appendChild(el('p', 'truncate text-small text-muted',
        t('arisan.lunas.dari', { lunas: d.hitungLunas(arisan), total: arisan.anggota.length })
        + ' · ' + t('arisan.periode.info', { nomor: arisan.periode_aktif.nomor, total: arisan.total_periode })));
      kiri.appendChild(teks);

      li.appendChild(kiri);
      li.appendChild(chipEl(milik.status));
      ul.appendChild(li);
    });
  }

  // ── Papan status: every member of every demo arisan, in giliran order ───
  function renderPapan() {
    document.getElementById('papan-judul').textContent = t('papan.judul');
    var wadah = document.getElementById('papan-status');

    demo.arisan.forEach(function (arisan) {
      var section = el('section', 'mb-6');
      section.appendChild(el('h3', 'section-label', arisan.nama));
      var penerima = d.penerimaPeriode(arisan);
      section.appendChild(el('p', 'mb-2 px-1 text-small text-muted',
        t('arisan.periode.info', { nomor: arisan.periode_aktif.nomor, total: arisan.total_periode })
        + (penerima ? ' · ' + t('arisan.penerima', { nama: penerima.nama_tampil }) : '')));

      var ul = el('ul', 'list');
      d.anggotaUrut(arisan).forEach(function (anggota) {
        var iuran = d.iuranUntukAnggota(arisan, anggota.id);
        var status = d.statusIuranTampil(iuran, arisan.periode_aktif, HARI_INI);

        var li = el('li', 'list-row justify-between');
        var kiri = el('div', 'flex min-w-0 items-center gap-3');
        kiri.appendChild(avatarEl(anggota.nama_tampil, status));

        var namaBaris = el('div', 'flex min-w-0 flex-wrap items-center gap-1.5');
        namaBaris.appendChild(el('p', 'truncate text-body font-medium', anggota.nama_tampil));
        if (anggota.user_id === PENGGUNA_ID) namaBaris.appendChild(tagEl(t('tag.anda')));
        if (anggota.id === arisan.admin_id) namaBaris.appendChild(tagEl(t('tag.admin')));
        kiri.appendChild(namaBaris);

        li.appendChild(kiri);
        li.appendChild(chipEl(status));
        ul.appendChild(li);
      });

      section.appendChild(ul);
      wadah.appendChild(section);
    });
  }

  // ── Keterangan: the four statuses, avatar + chip + one sentence ──────────
  function renderKeterangan() {
    document.getElementById('keterangan-label').textContent = t('keterangan.judul');
    var ul = document.getElementById('daftar-keterangan');

    STATUS_KEYS.forEach(function (key) {
      var status = { key: key, telatHari: 3 };
      var li = el('li', 'list-row justify-between');
      var kiri = el('div', 'flex min-w-0 items-center gap-3');
      var contoh = avatarEl('Contoh', status, { mini: true });
      contoh.setAttribute('aria-hidden', 'true');
      kiri.appendChild(contoh);
      kiri.appendChild(el('p', 'min-w-0 text-small text-muted', statusKet(status)));
      li.appendChild(kiri);
      li.appendChild(chipEl(status));
      ul.appendChild(li);
    });
  }

  // ── Lembar bayar iuran: the platform bottom sheet, with a dialog fallback
  var sheetTerbuka = false;

  function toast(message) {
    if (un && un.toast) {
      un.toast(message);
      return;
    }
    // Plain local run without the platform edge: a minimal honest fallback.
    var el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);'
      + 'background:#222B5A;color:#F5F4F9;padding:10px 16px;border-radius:999px;'
      + 'font:500 14px/1.4 system-ui,sans-serif;z-index:60';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  function salinRekening(teks) {
    var selesai = function () { toast(t('toast.rekening_tersalin')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(selesai, function () { salinFallback(teks, selesai); });
    } else {
      salinFallback(teks, selesai);
    }
  }

  function salinFallback(teks, selesai) {
    var ta = document.createElement('textarea');
    ta.value = teks;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* tetap lanjut, jangan blokir UI */ }
    ta.remove();
    selesai();
  }

  function isiSheetBayar(root, arisan) {
    root.querySelector('#sheet-judul').textContent = t('bayar.judul', { arisan: arisan.nama });
    root.querySelector('#sheet-nominal').textContent = d.formatRupiah(arisan.nominal);
    root.querySelector('#sheet-transfer-label').textContent = t('bayar.transfer_ke');
    root.querySelector('#sheet-rekening').textContent = arisan.rekening_kas;
    root.querySelector('#btn-salin').textContent = t('bayar.salin');
    root.querySelector('#btn-batal').textContent = t('bayar.batal');
  }

  function bukaSheetBayar(arisan) {
    if (sheetTerbuka) return;
    sheetTerbuka = true;
    // Clone the template's root DIV (not the fragment) so the kit and the
    // fallback both receive a real element.
    var isi = document.getElementById('tpl-sheet-bayar').content.firstElementChild.cloneNode(true);
    isiSheetBayar(isi, arisan);

    var tutup = function () { sheetTerbuka = false; };

    if (un && un.presentSheet) {
      var sheet = un.presentSheet({ contentEl: isi, onDismiss: tutup });
      isi.querySelector('#btn-salin').addEventListener('click', function () {
        salinRekening(arisan.rekening_kas);
      });
      isi.querySelector('#btn-batal').addEventListener('click', function () { sheet.dismiss(); });
      return;
    }

    // Fallback sheet for a plain local run where the hosted kit is absent.
    var dialog = document.createElement('dialog');
    dialog.className = 'sheet-fallback';
    dialog.appendChild(isi);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', tutup);
    dialog.querySelector('#btn-salin').addEventListener('click', function () {
      salinRekening(arisan.rekening_kas);
    });
    dialog.querySelector('#btn-batal').addEventListener('click', function () { dialog.close(); });
    dialog.showModal();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  document.getElementById('app-title').textContent = t('app.nama');
  document.getElementById('app-subtitle').textContent = t('fondasi.subjudul');
  document.getElementById('demo-catatan').textContent = t('demo.catatan');
  renderHero();
  renderDaftarArisan();
  renderPapan();
  renderKeterangan();
})();
