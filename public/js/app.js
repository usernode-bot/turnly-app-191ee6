/* Turnly app core: shared screen helpers, the pay sheet, the reject
 * modal, the demo role switch and the tiny router (Beranda at /,
 * Detail arisan at /arisan/<id>).
 *
 * Tahap 2 is demo-only: actions mutate the in-memory demo data and
 * re-render, nothing is sent anywhere. The status mutations use the same
 * field names the future API will write, so the backend stage replaces
 * `setIuranStatus` body without touching the screens.
 *
 * All copy comes from i18n; names and file names go into the DOM as text
 * nodes, never as HTML.
 */
(function () {
  'use strict';

  var d = window.TurnlyDomain;
  var i18n = window.TurnlyI18n;
  var t = i18n.t;
  var demo = window.TurnlyDemoData;
  var reminders = window.TurnlyReminders;
  var un = window.unNative || null;

  var HARI_INI = demo.DEMO_HARI_INI;
  var PENGGUNA_ID = demo.PENGGUNA_DEMO_ID;

  // Status identifiers mirror the database enum; the message keys are English.
  var STATUS_MESSAGE = {
    lunas: 'status.paid',
    menunggu: 'status.awaiting',
    belum: 'status.unpaid',
    telat: 'status.late',
  };
  var LEGEND_MESSAGE = {
    lunas: 'legend.paid',
    menunggu: 'legend.awaiting',
    belum: 'legend.unpaid',
    telat: 'legend.late',
  };
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

  // ── Element helpers ──────────────────────────────────────────────────────

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initials(nama) {
    var words = nama.split(/\s+/).filter(Boolean);
    var letters = words.slice(0, 2).map(function (w) { return w.charAt(0); });
    return letters.join('').toUpperCase();
  }

  function statusLabel(status) {
    return t(STATUS_MESSAGE[status.key], { days: status.telatHari });
  }

  function statusKet(status) {
    return t(LEGEND_MESSAGE[status.key]);
  }

  // A status avatar. When labelled, it is announced as "Bu Rina, Unpaid";
  // `silent` hides it from assistive tech at full size (the turn circle,
  // where the Status tab says it in words).
  function avatarEl(nama, status, opts) {
    var elAva = el('span', 'avatar ' + AVATAR_CLASS[status.key] + (opts && opts.mini ? ' avatar-sm' : ''));
    elAva.textContent = initials(nama);
    if (opts && (opts.mini || opts.silent)) {
      elAva.setAttribute('aria-hidden', 'true'); // the row's chip already says the status
    } else {
      elAva.setAttribute('role', 'img');
      elAva.setAttribute('aria-label', t('a11y.memberStatus', { name: nama, status: statusLabel(status) }));
    }
    return elAva;
  }

  function chipEl(status) {
    return el('span', 'chip ' + CHIP_CLASS[status.key], statusLabel(status));
  }

  function tagEl(text) {
    return el('span', 'tag', text);
  }

  // ── Demo data access ─────────────────────────────────────────────────────

  // The member the demo viewer "is", in one arisan.
  function penggunaAnggota(arisan) {
    var found = (arisan.anggota || []).filter(function (a) { return a.user_id === PENGGUNA_ID; });
    return found[0] || null;
  }

  // The pengguna's presentation status in one arisan's active periode.
  function statusPengguna(arisan) {
    var anggota = penggunaAnggota(arisan);
    if (!anggota) return null;
    var iuran = d.iuranUntukAnggota(arisan, anggota.id);
    return {
      anggota: anggota,
      status: d.statusIuranTampil(iuran, arisan.periode_aktif, HARI_INI),
    };
  }

  // The demo stand-in for the future API write. Mutates the in-memory row
  // and re-renders the current screen.
  function setIuranStatus(arisan, anggotaId, status) {
    var periodeId = arisan.periode_aktif && arisan.periode_aktif.id;
    var rows = arisan.iuran || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].anggota_id === anggotaId && rows[i].periode_id === periodeId) {
        rows[i].status = status;
        break;
      }
    }
    rerender();
  }

  // ── Reminders: recorded on this device, shown on the member row ─────────
  // Demo stage: nothing is sent to members; the record drives the
  // "Reminded" chip so the admin sees who has been nudged this round.

  function remind(arisan, anggota) {
    var periodeId = arisan.periode_aktif && arisan.periode_aktif.id;
    if (reminders && periodeId) {
      reminders.record(arisan.id, periodeId, anggota.id, new Date().toISOString());
    }
    toast(t('toast.reminderSent', { name: anggota.nama_tampil }));
    rerender();
  }

  // Reminds every unpaid and late member at once (members awaiting
  // confirmation have already paid). Returns how many were recorded.
  function remindAll(arisan) {
    var periodeId = arisan.periode_aktif && arisan.periode_aktif.id;
    if (!reminders || !periodeId) return 0;
    var count = 0;
    d.anggotaUrut(arisan).forEach(function (anggota) {
      var status = d.statusIuranTampil(d.iuranUntukAnggota(arisan, anggota.id), arisan.periode_aktif, HARI_INI);
      if (status.key === 'belum' || status.key === 'telat') {
        reminders.record(arisan.id, periodeId, anggota.id, new Date().toISOString());
        count++;
      }
    });
    toast(t('toast.remindersSent', { count: count }));
    rerender();
    return count;
  }

  // This device's reminder record for one member in the active round:
  // an ISO timestamp, or null.
  function reminderFor(arisan, anggotaId) {
    if (!reminders || !arisan.periode_aktif) return null;
    return reminders.get(arisan.id, arisan.periode_aktif.id, anggotaId);
  }

  // ── Toast + copy ─────────────────────────────────────────────────────────

  function toast(message) {
    if (un && un.toast) {
      un.toast(message);
      return;
    }
    // Plain local run without the platform edge: a minimal honest fallback.
    var node = el('div', '');
    node.setAttribute('role', 'status');
    node.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);'
      + 'background:rgb(var(--hero));color:rgb(var(--hero-fg));padding:10px 16px;border-radius:999px;'
      + 'font:500 14px/1.4 system-ui,sans-serif;z-index:60';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 2200);
  }

  function salinRekening(teks) {
    var selesai = function () { toast(t('toast.accountCopied')); };
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

  // ── Lembar bayar iuran: account box, photo proof, send ───────────────────

  var sheetTerbuka = false;

  function isiSheetBayar(root, arisan) {
    root.querySelector('#sheet-judul').textContent = t('pay.title', { group: arisan.nama });
    root.querySelector('#sheet-nominal').textContent = d.formatRupiah(arisan.nominal);
    root.querySelector('#sheet-transfer-label').textContent = t('pay.transferTo');
    root.querySelector('#sheet-rekening').textContent = arisan.rekening_kas;
    root.querySelector('#btn-salin').textContent = t('pay.copyAccount');
    root.querySelector('#sheet-proof-title').textContent = t('pay.proofTitle');
    root.querySelector('#btn-pilih-foto').textContent = t('pay.choosePhoto');
    root.querySelector('#btn-kirim').textContent = t('pay.sendProof');
    root.querySelector('#btn-batal').textContent = t('pay.cancel');
    var preview = root.querySelector('#proof-preview');
    preview.removeAttribute('src');
    preview.hidden = true;
    preview.alt = t('pay.proofAlt');
    var kirim = root.querySelector('#btn-kirim');
    kirim.disabled = true; // send proof waits for a chosen photo
  }

  function bukaSheetBayar(arisan) {
    if (sheetTerbuka) return;
    sheetTerbuka = true;
    var anggota = penggunaAnggota(arisan);
    // Clone the template's root DIV (not the fragment) so the kit and the
    // fallback both receive a real element.
    var isi = document.getElementById('tpl-sheet-bayar').content.firstElementChild.cloneNode(true);
    isiSheetBayar(isi, arisan);

    var tutup = function () { sheetTerbuka = false; };

    var pilihFoto = isi.querySelector('#btn-pilih-foto');
    var inputFoto = isi.querySelector('#input-foto');
    var preview = isi.querySelector('#proof-preview');
    var kirim = isi.querySelector('#btn-kirim');

    pilihFoto.addEventListener('click', function () { inputFoto.click(); });
    inputFoto.addEventListener('change', function () {
      var file = inputFoto.files && inputFoto.files[0];
      if (!file) return;
      kirim.disabled = false;
      pilihFoto.textContent = t('pay.changePhoto');
      var reader = new FileReader();
      reader.onload = function () {
        preview.src = String(reader.result);
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    kirim.addEventListener('click', function () {
      if (kirim.disabled || !anggota) return;
      tutupSheet();
      setIuranStatus(arisan, anggota.id, 'menunggu');
      toast(t('legend.awaiting'));
    });

    var tombolSalin = isi.querySelector('#btn-salin');
    tombolSalin.addEventListener('click', function () {
      salinRekening(arisan.rekening_kas);
    });
    var tombolBatal = isi.querySelector('#btn-batal');
    tombolBatal.addEventListener('click', function () { tutupSheet(); });

    function tutupSheet() {
      if (sheet) sheet.dismiss();
      if (dialog) dialog.close();
    }

    var sheet = null;
    var dialog = null;

    if (un && un.presentSheet) {
      sheet = un.presentSheet({ contentEl: isi, onDismiss: tutup });
      return;
    }

    // Fallback sheet for a plain local run where the hosted kit is absent.
    dialog = document.createElement('dialog');
    dialog.className = 'sheet-fallback';
    dialog.appendChild(isi);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', tutup);
    dialog.showModal();
  }

  // ── Modal tolak bukti: reject with an optional reason ────────────────────

  function bukaModalTolak(arisan, anggota) {
    var isi = el('div', 'flex flex-col gap-4 px-5 pb-6 pt-2');
    isi.appendChild(el('h2', 'font-display text-heading', t('reject.title', { name: anggota.nama_tampil })));

    var label = el('label', 'section-label');
    label.setAttribute('for', 'alasan-tolak');
    label.textContent = t('reject.reasonLabel');
    isi.appendChild(label);

    var alasan = el('textarea', 'field');
    alasan.id = 'alasan-tolak';
    alasan.rows = 3;
    alasan.placeholder = t('reject.reasonPlaceholder');
    isi.appendChild(alasan);

    var baris = el('div', 'flex gap-2');
    var batal = el('button', 'btn-secondary min-w-0 flex-1', t('pay.cancel'));
    var tolak = el('button', 'btn-secondary min-w-0 flex-1 border-danger/60 text-danger', t('action.reject'));
    baris.appendChild(batal);
    baris.appendChild(tolak);
    isi.appendChild(baris);

    var tutup = function () {
      if (sheet) sheet.dismiss();
      if (dialog) dialog.close();
    };
    var sheet = null;
    var dialog = null;

    batal.addEventListener('click', tutup);
    tolak.addEventListener('click', function () {
      tutup();
      setIuranStatus(arisan, anggota.id, 'ditolak');
      toast(t('toast.rejected', { name: anggota.nama_tampil }));
    });

    if (un && un.presentModal) {
      sheet = un.presentModal({ contentEl: isi });
      return;
    }
    // Fallback for a plain local run where the hosted kit is absent.
    dialog = document.createElement('dialog');
    dialog.className = 'sheet-fallback';
    dialog.appendChild(isi);
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  // ── Demo role switch ─────────────────────────────────────────────────────

  var peran = 'member'; // the demo viewer's real role in both groups

  function getRole() { return peran; }

  function setRole(next) {
    if (next !== 'member' && next !== 'admin') return;
    if (next === peran) return;
    peran = next;
    rerender();
  }

  // ── Router ───────────────────────────────────────────────────────────────

  var tampilan = null; // { nama: 'beranda' } or { nama: 'detail', arisan }

  function route() {
    var m = /^\/arisan\/([A-Za-z0-9-]+)\/?$/.exec(window.location.pathname);
    var arisan = m && demo.arisan.filter(function (a) { return a.id === m[1]; })[0];
    tampilan = arisan ? { nama: 'detail', arisan: arisan } : { nama: 'beranda' };
    rerender();
  }

  // Called from detail.js, the last screen script: by then both renderers
  // are registered and the first paint can happen.
  function start() { route(); }

  function rerender() {
    if (!tampilan) return;
    document.title = t('app.name');
    var berandaView = document.getElementById('beranda-view');
    var detailView = document.getElementById('detail-view');
    if (tampilan.nama === 'detail') {
      berandaView.hidden = true;
      detailView.hidden = false;
      window.TurnlyDetail.render(tampilan.arisan);
    } else {
      detailView.hidden = true;
      berandaView.hidden = false;
      window.TurnlyBeranda.render();
    }
  }

  i18n.onChange(rerender);

  window.TurnlyApp = {
    HARI_INI: HARI_INI,
    PENGGUNA_ID: PENGGUNA_ID,
    d: d,
    i18n: i18n,
    demo: demo,
    start: start,
    el: el,
    initials: initials,
    statusLabel: statusLabel,
    statusKet: statusKet,
    avatarEl: avatarEl,
    chipEl: chipEl,
    tagEl: tagEl,
    penggunaAnggota: penggunaAnggota,
    statusPengguna: statusPengguna,
    setIuranStatus: setIuranStatus,
    toast: toast,
    salinRekening: salinRekening,
    bukaSheetBayar: bukaSheetBayar,
    bukaModalTolak: bukaModalTolak,
    remind: remind,
    remindAll: remindAll,
    reminderFor: reminderFor,
    getRole: getRole,
    setRole: setRole,
    rerender: rerender,
  };
})();
