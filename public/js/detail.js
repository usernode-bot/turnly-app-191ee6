/* Detail arisan: sticky header, the lingkaran giliran (turn circle),
 * collected and progress lines with the status legend, the Status /
 * Turns / History tabs and the sticky bottom action bar.
 *
 * Actions are role-based for the demo: "member" is the demo viewer's own
 * role (pay, or see the awaiting note), "admin" gets Confirm, Reject with
 * reason and Ingatkan per row, plus the sticky "Ingatkan N anggota" bar.
 * The reminder state (which members were reminded, and whether the send
 * cooldown still holds) comes from public/js/reminders.js; recording is
 * app.remind/remindSemua. Renders into the static #detail-view skeleton in
 * index.html; all copy comes from i18n.
 */
(function () {
  'use strict';

  var app = window.TurnlyApp;
  var d = app.d;
  var i18n = app.i18n;
  var t = i18n.t;
  var reminders = app.reminders;
  var un = window.unNative || null;

  var HARI_INI = app.HARI_INI;
  var PENGGUNA_ID = app.PENGGUNA_ID;

  var TABS = ['status', 'turns', 'history'];
  var TAB_ID = { status: 'tab-status', turns: 'tab-turns', history: 'tab-history' };
  var PANEL_ID = { status: 'panel-status', turns: 'panel-turns', history: 'panel-history' };
  // The initial tab: '?tab=history' (or status/turns) opens that tab at load,
  // so the Riwayat tab's Pengingat section is reachable without a click; an
  // unrecognised value falls back to Status.
  var tabAktif = (function () {
    try {
      var m = new URLSearchParams(window.location.search).get('tab');
      return TABS.indexOf(m) !== -1 ? m : 'status';
    } catch (e) { return 'status'; }
  })();

  var arisanKini = null;   // the arisan being rendered
  var aksiBar = null;      // what the bottom bar's button does now

  function labelTab(tab) {
    if (tab === 'status') return t('tab.status');
    if (tab === 'turns') return t('tab.turns');
    return t('tab.history');
  }

  function tombolKelas(teks, klik, kelas) {
    var b = app.el('button', 'btn-secondary' + (kelas ? ' ' + kelas : ''), teks);
    b.addEventListener('click', klik);
    return b;
  }

  // ── The lingkaran giliran: avatars clockwise from the top ────────────────
  function renderLingkaran(arisan, penerima) {
    var wadah = document.getElementById('lingkaran-giliran');
    wadah.textContent = '';

    var urut = d.anggotaUrut(arisan);
    var n = urut.length || 1;

    urut.forEach(function (anggota, i) {
      var status = d.statusIuranTampil(d.iuranUntukAnggota(arisan, anggota.id), arisan.periode_aktif, HARI_INI);
      var sudut = (-90 + (360 / n) * i) * Math.PI / 180;
      var isPenerima = penerima && anggota.id === penerima.id;
      // The recipient carries the accent ring; the others sit bare.
      var posisi = app.el('span', isPenerima
        ? 'absolute inline-flex rounded-full border-2 border-accent p-0.5'
        : 'absolute inline-flex');
      posisi.style.left = (50 + 42 * Math.cos(sudut)) + '%';
      posisi.style.top = (50 + 42 * Math.sin(sudut)) + '%';
      posisi.style.transform = 'translate(-50%, -50%)';
      posisi.appendChild(app.avatarEl(anggota.nama_tampil, status, { silent: true }));
      wadah.appendChild(posisi);
    });

    // The centre: the round, the recipient, the amount.
    var tengah = app.el('div', 'absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center');
    tengah.appendChild(app.el('p', 'text-small text-muted', t('detail.turnOf', {
      round: arisan.periode_aktif.nomor,
      rounds: arisan.total_periode,
    })));
    if (penerima) {
      tengah.appendChild(app.el('p', 'text-body font-medium', penerima.nama_tampil));
      tengah.appendChild(app.el('p', 'font-display text-heading tabular-nums', d.formatRupiah(arisan.nominal)));
    }
    wadah.appendChild(tengah);
  }

  // ── Collected and progress lines ──────────────────────────────────────────
  function renderGaris(arisan) {
    var total = arisan.nominal * arisan.anggota.length;
    document.getElementById('detail-terkumpul').textContent = t('detail.collected', {
      collected: d.formatRupiah(d.totalTerkumpul(arisan)),
      total: d.formatRupiah(total),
    });
    document.getElementById('detail-progres').textContent = t('detail.paidProgress', {
      paid: d.hitungLunas(arisan),
    });
  }

  // ── Legend: the four statuses, avatar + chip + one sentence ───────────────
  function renderKeterangan() {
    document.getElementById('keterangan-label').textContent = t('legend.title');
    var ul = document.getElementById('daftar-keterangan');
    ul.textContent = '';

    ['lunas', 'menunggu', 'belum', 'telat'].forEach(function (key) {
      var status = { key: key, telatHari: 3 };
      var li = app.el('li', 'list-row justify-between');
      var kiri = app.el('div', 'flex min-w-0 items-center gap-3');
      kiri.appendChild(app.avatarEl(t('legend.sampleName'), status, { mini: true }));
      kiri.appendChild(app.el('p', 'min-w-0 text-small text-muted', app.statusKet(status)));
      li.appendChild(kiri);
      li.appendChild(app.chipEl(status));
      ul.appendChild(li);
    });
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  function renderTabs() {
    TABS.forEach(function (tab) {
      var btn = document.getElementById(TAB_ID[tab]);
      var aktif = tab === tabAktif;
      btn.textContent = labelTab(tab);
      btn.setAttribute('aria-selected', aktif ? 'true' : 'false');
      btn.classList.toggle('border-accent', aktif);
      document.getElementById(PANEL_ID[tab]).hidden = !aktif;
    });
  }

  // ── Status tab: members with role-based action buttons ────────────────────
  function renderPanelStatus(arisan) {
    var ul = document.getElementById('daftar-status');
    ul.textContent = '';
    var peran = app.getRole();
    var pengguna = app.penggunaAnggota(arisan);

    // Admin only: the member next to pay leads the list and carries the
    // chip, so the organizer can remind them first. The rest keep turn
    // order. The member view stays exactly as it was.
    var urut = d.anggotaUrut(arisan);
    var berikut = null;
    if (peran === 'admin') {
      berikut = d.anggotaBerikutnyaBayar(arisan, HARI_INI);
      if (berikut) {
        urut = urut.filter(function (a) { return a.id !== berikut.id; });
        urut.unshift(berikut);
      }
    }

    urut.forEach(function (anggota) {
      var status = d.statusIuranTampil(d.iuranUntukAnggota(arisan, anggota.id), arisan.periode_aktif, HARI_INI);
      var li = app.el('li', 'flex flex-col gap-2 px-4 py-3');

      var atas = app.el('div', 'flex items-center gap-3');
      atas.appendChild(app.avatarEl(anggota.nama_tampil, status));
      var namaBaris = app.el('div', 'flex min-w-0 flex-wrap items-center gap-1.5');
      namaBaris.appendChild(app.el('p', 'truncate text-body font-medium', anggota.nama_tampil));
      if (anggota.user_id === PENGGUNA_ID) namaBaris.appendChild(app.tagEl(t('tag.you')));
      if (anggota.id === arisan.admin_id) namaBaris.appendChild(app.tagEl(t('tag.admin')));
      if (berikut && anggota.id === berikut.id) namaBaris.appendChild(app.el('span', 'chip chip-berikut', t('status.nextToPay')));
      atas.appendChild(namaBaris);
      atas.appendChild(app.chipEl(status));
      li.appendChild(atas);

      var dueId = arisan.periode_aktif && arisan.periode_aktif.id;

      // The reminder already recorded for this member this round, if any:
      // its line sits under the name and its cooldown decides the button.
      var terakhir = reminders.lastReminder(arisan, anggota.id, dueId);
      if (terakhir) {
        var at = terakhir.sent_at || terakhir.scheduled_for;
        li.appendChild(app.el('p', 'text-small text-muted', t('reminder.sentLine', {
          time: reminders.relativeReminderTime(at, new Date(), i18n.getLocale()),
        })));
      }

      var tombol = [];
      if (peran === 'admin') {
        if (status.key === 'menunggu') {
          tombol.push(tombolKelas(t('action.confirm'), function () {
            app.setIuranStatus(arisan, anggota.id, 'lunas');
            app.toast(t('toast.confirmed', { name: anggota.nama_tampil }));
          }, ''));
          tombol.push(tombolKelas(t('action.reject'), function () {
            app.bukaModalTolak(arisan, anggota);
          }, 'border-danger/60 text-danger'));
        } else if (status.key === 'belum' || status.key === 'telat') {
          var dalamJeda = reminders.remindedToday(arisan, anggota.id, dueId, HARI_INI);
          var tombolIngatkan = tombolKelas(
            dalamJeda ? t('reminder.again') : t('action.remind'),
            function () { app.remind(arisan, anggota); },
            ''
          );
          tombolIngatkan.disabled = dalamJeda; // the cooldown gate
          tombol.push(tombolIngatkan);
        }
      } else if (pengguna && anggota.id === pengguna.id
          && (status.key === 'belum' || status.key === 'telat')) {
        tombol.push(tombolKelas(t('pay.action'), function () { app.bukaSheetBayar(arisan); }, ''));
      }
      if (tombol.length) {
        var bawah = app.el('div', 'flex flex-wrap gap-2');
        tombol.forEach(function (b) { bawah.appendChild(b); });
        li.appendChild(bawah);
      }
      ul.appendChild(li);
    });
  }

  // ── Turns tab: the draw order, the current recipient tagged ───────────────
  function renderPanelTurns(arisan, penerima) {
    var ul = document.getElementById('daftar-giliran');
    ul.textContent = '';

    d.anggotaUrut(arisan).forEach(function (anggota) {
      var li = app.el('li', 'list-row justify-between');
      var kiri = app.el('div', 'flex min-w-0 items-center gap-3');
      kiri.appendChild(app.el('span', 'w-4 shrink-0 text-small tabular-nums text-muted', anggota.urutan_giliran));
      var av = app.el('span', 'avatar bg-raised text-fg', app.initials(anggota.nama_tampil));
      av.setAttribute('aria-hidden', 'true');
      kiri.appendChild(av);
      var namaBaris = app.el('div', 'flex min-w-0 flex-wrap items-center gap-1.5');
      namaBaris.appendChild(app.el('p', 'truncate text-body font-medium', anggota.nama_tampil));
      if (anggota.user_id === PENGGUNA_ID) namaBaris.appendChild(app.tagEl(t('tag.you')));
      if (anggota.id === arisan.admin_id) namaBaris.appendChild(app.tagEl(t('tag.admin')));
      kiri.appendChild(namaBaris);
      li.appendChild(kiri);
      if (penerima && anggota.id === penerima.id) li.appendChild(app.tagEl(t('turns.current')));
      ul.appendChild(li);
    });
  }

  // ── History tab: finished rounds, then the reminders recorded ────────────
  function renderPanelHistory(arisan) {
    var ul = document.getElementById('daftar-riwayat');
    var kosong = document.getElementById('riwayat-kosong');
    ul.textContent = '';

    var lalu = arisan.periode_lalu || [];
    kosong.hidden = lalu.length > 0;
    ul.hidden = lalu.length === 0;
    if (!lalu.length) {
      document.getElementById('riwayat-kosong-teks').textContent = t('history.empty');
    } else {
      lalu.forEach(function (periode) {
        var penerimaLalu = d.anggotaDenganId(arisan, periode.penerima_anggota_id);
        var li = app.el('li', 'list-row justify-between');
        var kiri = app.el('div', 'min-w-0');
        kiri.appendChild(app.el('p', 'truncate text-body font-medium', t('history.round', {
          round: periode.nomor,
          date: d.formatTanggalPendek(periode.tanggal_jatuh_tempo, i18n.getLocale()),
        })));
        if (penerimaLalu) {
          kiri.appendChild(app.el('p', 'truncate text-small text-muted', t('history.recipient', {
            name: penerimaLalu.nama_tampil,
          })));
        }
        li.appendChild(kiri);
        li.appendChild(app.el('span', 'chip chip-dana shrink-0', t('history.paidOut')));
        ul.appendChild(li);
      });
    }

    renderPengingat(arisan);
  }

  // ── Pengingat: every reminder recorded for this arisan, newest first ──────
  function renderPengingat(arisan) {
    var ul = document.getElementById('daftar-pengingat');
    var kosong = document.getElementById('pengingat-kosong');
    document.getElementById('pengingat-label').textContent = t('reminder.historyTitle');
    ul.textContent = '';

    var riwayat = reminders.reminderHistory(arisan);
    var sekarang = new Date();
    kosong.hidden = riwayat.length > 0;
    ul.hidden = riwayat.length === 0;
    if (!riwayat.length) {
      document.getElementById('pengingat-kosong-teks').textContent = t('reminder.historyEmpty');
      return;
    }

    riwayat.forEach(function (baris) {
      var li = app.el('li', 'list-row justify-between');
      var kiri = app.el('div', 'min-w-0');
      kiri.appendChild(app.el('p', 'truncate text-body font-medium', baris.nama));
      kiri.appendChild(app.el('p', 'truncate text-small text-muted', t('reminder.sentLine', {
        time: reminders.relativeReminderTime(baris.sentAt, sekarang, i18n.getLocale()),
      })));
      li.appendChild(kiri);
      ul.appendChild(li);
    });
  }

  function renderTabPanels() {
    var arisan = arisanKini;
    var penerima = d.penerimaPeriode(arisan);
    renderPanelStatus(arisan);
    renderPanelTurns(arisan, penerima);
    renderPanelHistory(arisan);
  }

  // ── Sticky bottom action bar: varies by role and state ────────────────────
  function renderBar(arisan) {
    var bar = document.getElementById('bar-bawah');
    var btn = document.getElementById('btn-bar');
    var teks = document.getElementById('bar-teks');
    var peran = app.getRole();
    var pengguna = app.penggunaAnggota(arisan);

    aksiBar = null;
    btn.hidden = true;
    teks.hidden = true;

    if (peran === 'member' && pengguna) {
      var status = d.statusIuranTampil(d.iuranUntukAnggota(arisan, pengguna.id), arisan.periode_aktif, HARI_INI);
      if (status.key === 'belum' || status.key === 'telat') {
        btn.hidden = false;
        btn.textContent = t('pay.action');
        aksiBar = function () { app.bukaSheetBayar(arisan); };
      } else if (status.key === 'menunggu') {
        teks.hidden = false;
        teks.textContent = t('legend.awaiting');
      } else {
        bar.hidden = true; // lunas: nothing to do this round
        return;
      }
    } else {
      // The bulk action spends on the ones due right now: unpaid members
      // whose round is not in cooldown. Most-overdue first, then nearest due.
      var antrean = reminders.reminderQueue(arisan, HARI_INI);
      if (antrean.length) {
        btn.hidden = false;
        btn.textContent = reminders.bulkReminderText(antrean.length, i18n.getLocale());
        aksiBar = function () { bukaSheetPengingat(arisan, antrean); };
      } else {
        bar.hidden = true; // everyone paid, or all reminded today
        return;
      }
    }
    bar.hidden = false;
  }

  // ── Ingatkan N anggota: a confirm sheet, then a result sheet ──────────────
  // The platform's native bottom sheet, with a plain <dialog> fallback for a
  // local run without the hosted kit (the same shape app.js uses).
  function presentSheet(isi, padaTutup) {
    if (un && un.presentSheet) return un.presentSheet({ contentEl: isi, onDismiss: padaTutup });
    var dialog = document.createElement('dialog');
    dialog.className = 'sheet-fallback';
    dialog.appendChild(isi);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', function () { if (padaTutup) padaTutup(); });
    dialog.showModal();
    return { dismiss: function () { dialog.close(); } };
  }

  function bukaSheetPengingat(arisan, antrean) {
    var isi = app.el('div', 'flex flex-col gap-4 px-5 pb-6 pt-2');
    isi.appendChild(app.el('h2', 'font-display text-heading', t('reminder.confirmTitle', {
      count: antrean.length,
    })));
    isi.appendChild(app.el('p', 'text-body text-muted', t('reminder.confirmBody')));

    var ul = app.el('ul', 'list');
    antrean.forEach(function (item) {
      var status = d.statusIuranTampil(
        d.iuranUntukAnggota(arisan, item.anggota.id), arisan.periode_aktif, HARI_INI);
      var li = app.el('li', 'list-row');
      li.appendChild(app.avatarEl(item.anggota.nama_tampil, status, { mini: true }));
      li.appendChild(app.el('p', 'min-w-0 flex-1 truncate text-body font-medium', item.anggota.nama_tampil));
      li.appendChild(app.chipEl(status));
      ul.appendChild(li);
    });
    isi.appendChild(ul);

    var baris = app.el('div', 'flex gap-2');
    var batal = app.el('button', 'btn-secondary min-w-0 flex-1', t('reminder.confirmCancel'));
    var kirim = app.el('button', 'btn-primary min-w-0 flex-1', t('reminder.confirmSend'));
    baris.appendChild(batal);
    baris.appendChild(kirim);
    isi.appendChild(baris);

    var sheet = presentSheet(isi, null);
    batal.addEventListener('click', function () { sheet.dismiss(); });
    kirim.addEventListener('click', function () {
      sheet.dismiss();
      var tercatat = app.remindSemua(arisan, antrean.map(function (item) { return item.anggota.id; }));
      if (tercatat.length) bukaSheetPengingatHasil(tercatat.length);
    });
  }

  // The result sheet: what was recorded, so the person sees the outcome on
  // the same surface they confirmed on. The toast announces it too.
  function bukaSheetPengingatHasil(jumlah) {
    var isi = app.el('div', 'flex flex-col gap-4 px-5 pb-6 pt-2');
    isi.appendChild(app.el('h2', 'font-display text-heading', t('reminder.sheetTitle')));
    isi.appendChild(app.el('p', 'text-body text-muted', t('reminder.sheetBody', { count: jumlah })));
    var tutupTombol = app.el('button', 'btn-secondary w-full', t('reminder.done'));
    isi.appendChild(tutupTombol);
    var sheet = presentSheet(isi, null);
    tutupTombol.addEventListener('click', function () { sheet.dismiss(); });
  }

  // ── Role switch ───────────────────────────────────────────────────────────
  function renderRoleTombol() {
    var peranMember = app.getRole() === 'member';
    var member = document.getElementById('role-member');
    var admin = document.getElementById('role-admin');
    member.textContent = t('role.member');
    admin.textContent = t('role.admin');
    member.setAttribute('aria-pressed', peranMember ? 'true' : 'false');
    admin.setAttribute('aria-pressed', peranMember ? 'false' : 'true');
    member.classList.toggle('border-accent', peranMember);
    admin.classList.toggle('border-accent', !peranMember);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(arisan) {
    arisanKini = arisan;
    document.getElementById('detail-nama').textContent = arisan.nama;
    document.getElementById('btn-kembali').setAttribute('aria-label', t('a11y.back'));
    document.getElementById('tablist').setAttribute('aria-label', arisan.nama);
    document.getElementById('role-label').textContent = t('detail.viewAs');
    renderRoleTombol();

    var penerima = d.penerimaPeriode(arisan);
    renderLingkaran(arisan, penerima);
    renderGaris(arisan);
    renderKeterangan();
    renderTabs();
    renderTabPanels();
    renderBar(arisan);
  }

  // Static listeners: bound once, they read the mutable module state.
  TABS.forEach(function (tab) {
    document.getElementById(TAB_ID[tab]).addEventListener('click', function () {
      if (tabAktif === tab) return;
      tabAktif = tab;
      renderTabs();
      renderTabPanels();
    });
  });
  document.getElementById('role-member').addEventListener('click', function () { app.setRole('member'); });
  document.getElementById('role-admin').addEventListener('click', function () { app.setRole('admin'); });
  document.getElementById('btn-kembali').addEventListener('click', function () {
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/');
  });
  document.getElementById('btn-bar').addEventListener('click', function () {
    if (aksiBar) aksiBar();
  });

  window.TurnlyDetail = { render: render };

  // Both screen renderers are registered: first paint.
  window.TurnlyApp.start();
})();
