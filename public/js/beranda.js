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
    var ul = document.getElementById('daftar-arisan');
    ul.textContent = '';

    demo.arisan.forEach(function (arisan) {
      var milik = app.statusPengguna(arisan);
      var li = app.el('li', '');
      var a = app.el('a', 'list-row justify-between');
      a.href = '/arisan/' + arisan.id;

      var kiri = app.el('div', 'flex min-w-0 items-center gap-3');
      kiri.appendChild(app.avatarEl(milik.anggota.nama_tampil, milik.status, { mini: true }));
      var teks = app.el('div', 'min-w-0');
      teks.appendChild(app.el('p', 'truncate text-body font-medium', arisan.nama));
      teks.appendChild(app.el('p', 'truncate text-small text-muted', t('groups.summary', {
        paid: d.hitungLunas(arisan),
        total: arisan.anggota.length,
        round: arisan.periode_aktif.nomor,
        rounds: arisan.total_periode,
      })));
      kiri.appendChild(teks);

      a.appendChild(kiri);
      a.appendChild(app.chipEl(milik.status));
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  // ── Language setting ─────────────────────────────────────────────────────
  function renderLanguage() {
    document.getElementById('language-label').textContent = t('language.title');
    var select = document.getElementById('language-select');
    select.querySelector('option[value="en"]').textContent = t('language.english');
    select.querySelector('option[value="id"]').textContent = t('language.indonesian');
    select.querySelector('option[value="system"]').textContent = t('language.system');
    select.value = i18n.getEffectiveChoice();
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
  document.getElementById('language-select').addEventListener('change', function (e) {
    i18n.setChoice(e.target.value);
    renderLanguage(); // the select text itself, even if the locale did not change
  });

  window.TurnlyBeranda = { render: render };
})();
