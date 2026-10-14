/* Beranda: greeting, the contribution-due hero block, the "Arisan Anda"
 * list with mini status circles, and the create button.
 *
 * Renders into the static #beranda-view skeleton in index.html. Group rows
 * navigate to Detail arisan at /arisan/<id>. All copy comes from i18n.
 */
(function () {
  'use strict';

  var app = window.TurnlyApp;
  var d = app.d;
  var i18n = app.i18n;
  var t = i18n.t;
  var demo = app.demo;

  var HARI_INI = app.HARI_INI;

  // The arisan the hero button pays for. The button is bound ONCE (below)
  // and reads this, so re-rendering never stacks click listeners.
  var arisanBayar = null;

  // ── Greeting: the demo member's name, by the Jakarta clock ───────────────
  function renderGreeting() {
    var nama = '';
    for (var i = 0; i < demo.arisan.length && !nama; i++) {
      var anggota = app.penggunaAnggota(demo.arisan[i]);
      if (anggota) nama = anggota.nama_tampil;
    }
    var band = d.bandSapa(d.jamJakarta());
    var sapa;
    if (band === 'pagi') sapa = t('home.greeting.morning', { name: nama });
    else if (band === 'siang') sapa = t('home.greeting.afternoon', { name: nama });
    else if (band === 'sore') sapa = t('home.greeting.evening', { name: nama });
    else sapa = t('home.greeting.night', { name: nama });
    document.getElementById('home-greeting').textContent = sapa;
  }

  // ── Hero: the pengguna's unpaid iuran, nearest due first ─────────────────
  function jatuhTempoText(arisan) {
    var jt = arisan.periode_aktif.tanggal_jatuh_tempo;
    var tanggal = d.formatTanggalPendek(jt, i18n.getLocale());
    var n = d.selisihHari(HARI_INI, jt);
    if (n === 0) return t('home.dueToday');
    if (n < 0) return t('home.pastDue', { days: -n });
    return t('home.dueIn', { date: tanggal, days: n });
  }

  function renderHero() {
    var belumBayar = demo.arisan
      .map(function (arisan) {
        var s = app.statusPengguna(arisan);
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
      arisanBayar = null;
      label.textContent = t('home.dueTitle');
      nama.textContent = t('home.allPaid');
      nominal.hidden = true;
      tempo.hidden = true;
      tombol.hidden = true;
      return;
    }

    var pilihan = belumBayar[0];
    arisanBayar = pilihan.arisan;
    label.textContent = t('home.dueTitle');
    nama.textContent = pilihan.arisan.nama;
    nominal.textContent = d.formatRupiah(pilihan.arisan.nominal);
    tempo.textContent = jatuhTempoText(pilihan.arisan);
    tombol.textContent = t('pay.action');
    nominal.hidden = false;
    tempo.hidden = false;
    tombol.hidden = false;
  }

  // ── "Arisan Anda": one row per arisan, tap opens Detail ──────────────────
  function renderDaftarArisan() {
    document.getElementById('arisan-anda-label').textContent = t('groups.title');
    document.getElementById('groups-explainer').textContent = t('groups.explainer');
    document.getElementById('btn-arisan-baru').textContent = t('home.newArisan');
    document.getElementById('demo-catatan').textContent = t('demo.note');
    document.getElementById('link-revisi').textContent = t('revisi.open');
    var ul = document.getElementById('daftar-arisan');
    ul.textContent = '';

    demo.arisan.forEach(function (arisan) {
      var milik = app.statusPengguna(arisan);
      var li = app.el('li', '');
      var a = app.el('a', 'list-row justify-between');
      a.href = '/arisan/' + arisan.id;

      var kiri = app.el('div', 'flex min-w-0 items-center gap-3');
      kiri.appendChild(app.avatarEl(milik.anggota.nama_tampil, milik.status, {
        text: d.inisialGrup(arisan.nama),
        silent: true,
      }));
      var teks = app.el('div', 'min-w-0');
      teks.appendChild(app.el('p', 'truncate text-body font-medium', arisan.nama));
      teks.appendChild(app.el('p', 'truncate text-small text-muted', t('groups.summary', {
        paid: d.hitungLunas(arisan),
        total: arisan.anggota.length,
        round: arisan.periode_aktif.nomor,
        rounds: arisan.total_periode,
      })));

      // When this member receives the pot, then who receives it this round
      // (hidden when that is the member themselves).
      var giliran = d.giliranPengguna(arisan, milik.anggota);
      if (giliran) {
        if (giliran.keadaan === 'nanti') {
          var when = arisan.periode === 'mingguan'
            ? d.formatTanggalPendek(giliran.tanggal, i18n.getLocale())
            : d.formatBulanTahun(giliran.tanggal, i18n.getLocale());
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurn', {
            round: giliran.nomor,
            when: when,
          })));
        } else if (giliran.keadaan === 'sekarang') {
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurnNow')));
        } else {
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurnPassed', {
            round: giliran.nomor,
          })));
        }
        var penerima = d.penerimaPeriode(arisan);
        if (penerima && penerima.id !== milik.anggota.id) {
          teks.appendChild(app.el('p', 'text-small text-muted',
            t('groups.recipientNow', { name: penerima.nama_tampil })));
        }
      }
      kiri.appendChild(teks);

      a.appendChild(kiri);
      a.appendChild(app.chipEl(milik.status));
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  // ── Language toggle: ID | EN at the top right of the header ──────────────
  function renderLanguage() {
    var group = document.getElementById('language-toggle');
    group.setAttribute('aria-label', t('language.title'));
    var short = { id: t('language.short.id'), en: t('language.short.en') };
    var names = { id: t('language.indonesian'), en: t('language.english') };
    Array.prototype.forEach.call(group.querySelectorAll('.toggle-option'), function (btn) {
      var lang = btn.getAttribute('data-lang');
      btn.textContent = short[lang];
      btn.setAttribute('aria-label', names[lang]);
      // What is actually showing: also highlights while a ?lang= link
      // forces the language for this visit.
      btn.setAttribute('aria-pressed', String(i18n.getLocale() === lang));
    });
  }

  function render() {
    renderGreeting();
    renderHero();
    renderDaftarArisan();
    renderLanguage();
  }

  // Static listeners: bound once, read the mutable module state.
  document.getElementById('btn-bayar').addEventListener('click', function () {
    if (arisanBayar) app.bukaSheetBayar(arisanBayar);
  });
  document.getElementById('btn-arisan-baru').addEventListener('click', function () {
    app.toast(t('home.newArisanDemo'));
  });
  document.getElementById('language-toggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.toggle-option');
    if (!btn) return;
    i18n.setChoice(btn.getAttribute('data-lang'));
    renderLanguage(); // the labels themselves, even if the locale did not change
  });

  window.TurnlyBeranda = { render: render };
})();
