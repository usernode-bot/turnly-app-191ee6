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

  // ── Greeting: the signed-in username, else the demo member's name, by the
  // Jakarta clock ──────────────────────────────────────────────────────────
  // The username is asked once per page load; until (and if) the answer
  // arrives the demo member's name shows, so the greeting never goes blank.
  // The ask only happens when the page carries the platform's identity token
  // (the iframe adds ?token=… on load): without one there is nobody to
  // identify, and a request would only draw a 401 into the console.
  var namaPengguna = null;
  var mintaNama = false;

  function renderGreeting() {
    var nama = namaPengguna;
    if (!nama) {
      for (var i = 0; i < demo.arisan.length && !nama; i++) {
        var anggota = app.penggunaAnggota(demo.arisan[i]);
        if (anggota) nama = anggota.nama_tampil;
      }
    }
    var band = d.bandSapa(d.jamJakarta());
    var sapa;
    if (band === 'pagi') sapa = t('home.greeting.morning', { name: nama });
    else if (band === 'siang') sapa = t('home.greeting.afternoon', { name: nama });
    else if (band === 'sore') sapa = t('home.greeting.evening', { name: nama });
    else sapa = t('home.greeting.night', { name: nama });
    document.getElementById('home-greeting').textContent = sapa;

    if (!mintaNama) {
      mintaNama = true;
      var token = new URLSearchParams(location.search).get('token');
      if (token) {
        fetch('/api/me', { headers: { 'x-usernode-token': token } })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (body) {
            if (body && typeof body.username === 'string' && body.username) {
              namaPengguna = body.username;
              renderGreeting();
            }
          })
          .catch(function () {});
      }
    }
  }

  // ── Hero: the pengguna's unpaid iuran, nearest due first ─────────────────
  // The due line splits in two: the date line (hidden on the due day, so
  // "Due today" does not repeat it) and the emphasised days line.
  function jatuhTempo(arisan) {
    var jt = arisan.periode_aktif.tanggal_jatuh_tempo;
    var tanggal = d.formatTanggalPendek(jt, i18n.getLocale());
    var n = d.selisihHari(HARI_INI, jt);
    if (n === 0) return { tanggal: null, sisa: t('home.dueToday') };
    var due = t('home.dueOn', { date: tanggal });
    if (n < 0) return { tanggal: due, sisa: t('home.pastDue', { days: -n }) };
    return { tanggal: due, sisa: t('home.daysLeft', { days: n }) };
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
    var sisa = document.getElementById('hero-sisa-hari');
    var tombol = document.getElementById('btn-bayar');

    if (!belumBayar.length) {
      arisanBayar = null;
      label.textContent = t('home.dueTitle');
      nama.textContent = t('home.allPaid');
      nominal.hidden = true;
      tempo.hidden = true;
      sisa.hidden = true;
      tombol.hidden = true;
      return;
    }

    var pilihan = belumBayar[0];
    arisanBayar = pilihan.arisan;
    label.textContent = t('home.dueTitle');
    nama.textContent = pilihan.arisan.nama;
    nominal.textContent = d.formatRupiah(pilihan.arisan.nominal);
    var jt = jatuhTempo(pilihan.arisan);
    tempo.textContent = jt.tanggal || '';
    tempo.hidden = !jt.tanggal;
    sisa.textContent = jt.sisa;
    sisa.hidden = false;
    tombol.textContent = t('pay.action');
    nominal.hidden = false;
    tombol.hidden = false;
  }

  // ── Your turn to receive: the nearest pot still ahead of the viewer ───────
  // The counterweight to the payment block: what the group pays out, when,
  // and how far it has got through its rounds. Read-only, so no button.
  // Hidden when the viewer is in no group or every turn has passed.
  function renderGiliran() {
    var kartu = document.getElementById('giliran-card');
    var pasangan = demo.arisan
      .map(function (arisan) {
        var anggota = app.penggunaAnggota(arisan);
        return anggota ? { arisan: arisan, anggota: anggota } : null;
      })
      .filter(Boolean);
    var pilihan = d.giliranTerdekat(pasangan, HARI_INI);

    if (!pilihan) {
      kartu.hidden = true;
      return;
    }

    var arisan = pilihan.arisan;
    var putaran = arisan.periode_aktif.nomor;
    var totalPutaran = arisan.total_periode;
    var sisa;
    if (pilihan.giliran.keadaan === 'sekarang') sisa = t('home.turnCard.thisRound');
    else if (pilihan.sisaHari <= 0) sisa = t('home.turnCard.today');
    else sisa = t('home.daysLeft', { days: pilihan.sisaHari });

    document.getElementById('giliran-label').textContent = t('home.turnCard.title');
    document.getElementById('giliran-nama').textContent = arisan.nama;
    document.getElementById('giliran-nominal').textContent = d.formatRupiah(pilihan.dana);
    document.getElementById('giliran-tanggal').textContent = t('home.turnCard.on', {
      date: d.formatTanggalPendek(pilihan.tanggal, i18n.getLocale()),
    });
    document.getElementById('giliran-sisa').textContent = sisa;

    // "Turn 2 of 6", the same words the group screen uses, plus the bar.
    var progres = t('detail.turnOf', { round: putaran, rounds: totalPutaran });
    document.getElementById('giliran-progres').textContent = progres;
    document.getElementById('giliran-bar-isi').style.width = (putaran / totalPutaran * 100) + '%';
    var bar = document.getElementById('giliran-bar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(totalPutaran));
    bar.setAttribute('aria-valuenow', String(putaran));
    bar.setAttribute('aria-label', progres);
    kartu.hidden = false;
  }

  // ── Read aloud (Bacakan): the hero block's status, spoken ────────────────
  // Whole sentences built from the same data renderHero shows, one message
  // key each. The amount goes in as plain digits so the voice reads it as a
  // number ("500000 rupiah"); the screen keeps Rp500.000.
  function kalimatHero() {
    if (!arisanBayar) return [t('home.allPaid')];
    var jt = arisanBayar.periode_aktif.tanggal_jatuh_tempo;
    var n = d.selisihHari(HARI_INI, jt);
    var dasar = { name: arisanBayar.nama, amount: String(arisanBayar.nominal) };
    var kalimat = [];
    if (n === 0) {
      kalimat.push(t('read.dueToday', { name: dasar.name, amount: dasar.amount }));
    } else if (n < 0) {
      kalimat.push(t('read.late', {
        name: dasar.name,
        amount: dasar.amount,
        date: d.formatTanggalPendek(jt, i18n.getLocale()),
        days: -n,
      }));
    } else {
      kalimat.push(t('read.dueIn', {
        name: dasar.name,
        amount: dasar.amount,
        date: d.formatTanggalPendek(jt, i18n.getLocale()),
        days: n,
      }));
    }
    var penerima = d.penerimaPeriode(arisanBayar);
    var milik = app.statusPengguna(arisanBayar);
    if (penerima && milik) {
      if (penerima.id === milik.anggota.id) kalimat.push(t('read.recipientYou'));
      else kalimat.push(t('read.recipient', { name: penerima.nama_tampil }));
    }
    return kalimat;
  }

  function renderBacakan() {
    var tombol = document.getElementById('btn-bacakan');
    var suara = window.TurnlySpeech;
    if (!suara || !suara.isSupported()) {
      tombol.hidden = true;
      return;
    }
    tombol.hidden = false;
    tombol.textContent = suara.isSpeaking() ? t('read.stop') : t('read.start');
  }

  // A turn's date the way the group's rounds are spaced: a short date in a
  // weekly group ("Oct 25"), month and year in a monthly one ("Nov 2026").
  function waktuGiliran(arisan, iso) {
    return arisan.periode === 'mingguan'
      ? d.formatTanggalPendek(iso, i18n.getLocale())
      : d.formatBulanTahun(iso, i18n.getLocale());
  }

  // Every member's turn under one group's row, or null when there is no
  // active round. Compact lines, in turn order; past turns carry their round
  // number instead of a date, and the viewer's own name carries the You tag.
  function kotakJadwal(arisan) {
    var jadwal = d.jadwalGiliran(arisan);
    if (!jadwal.length) return null;
    var kotak = app.el('div', 'px-4 pb-3 pl-[68px]');
    kotak.appendChild(app.el('p', 'text-small font-medium text-muted', t('groups.schedule')));
    var ol = app.el('ol', 'text-small');
    ol.setAttribute('aria-label', t('groups.schedule'));
    jadwal.forEach(function (baris) {
      if (!baris.giliran) return;
      var giliran = baris.giliran;
      var li = app.el('li', 'flex min-h-7 items-center justify-between gap-2');

      var nama = app.el('span', 'flex min-w-0 items-center gap-2'
        + (giliran.keadaan === 'lewat' ? ' text-muted'
          : giliran.keadaan === 'sekarang' ? ' font-medium' : ''));
      nama.appendChild(app.el('span', 'truncate', baris.anggota.nama_tampil));
      if (baris.anggota.user_id === app.PENGGUNA_ID) nama.appendChild(app.tagEl(t('tag.you')));
      li.appendChild(nama);

      if (giliran.keadaan === 'nanti') {
        li.appendChild(app.el('span', 'shrink-0 tabular-nums', waktuGiliran(arisan, giliran.tanggal)));
      } else if (giliran.keadaan === 'sekarang') {
        li.appendChild(app.tagEl(t('turns.current')));
      } else {
        li.appendChild(app.el('span', 'shrink-0 text-muted', t('groups.turnDone', { round: giliran.nomor })));
      }
      ol.appendChild(li);
    });
    kotak.appendChild(ol);
    return kotak;
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

    // Groups the viewer still owes come first: late, unpaid, awaiting
    // confirmation, paid; the demo order stays inside each group.
    var baris = d.urutkanMenurutStatus(demo.arisan.map(function (arisan) {
      var milik = app.statusPengguna(arisan);
      return { arisan: arisan, milik: milik, status: milik && milik.status };
    }));

    baris.forEach(function (row) {
      var arisan = row.arisan;
      var milik = row.milik;
      var li = app.el('li', '');
      var a = app.el('a', 'list-row items-start justify-between');
      a.href = '/arisan/' + arisan.id;

      var kiri = app.el('div', 'flex min-w-0 flex-1 items-start gap-3');
      kiri.appendChild(app.avatarEl(milik.anggota.nama_tampil, milik.status, {
        text: d.inisialGrup(arisan.nama),
        silent: true,
      }));
      var teks = app.el('div', 'flex min-w-0 flex-1 flex-col gap-1');
      teks.appendChild(app.el('p', 'line-clamp-2 break-words text-body font-medium', arisan.nama));

      // Who has paid this round, as a bar with the count beside it.
      var paid = d.hitungLunas(arisan);
      var total = arisan.anggota.length;
      var jumlah = t('groups.paidCount', { paid: paid, total: total });
      var progressRow = app.el('div', 'flex items-center gap-2');
      var progress = app.el('div', 'progress');
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(total));
      progress.setAttribute('aria-valuenow', String(paid));
      progress.setAttribute('aria-valuetext', jumlah);
      progress.setAttribute('aria-label', jumlah);
      var fill = app.el('div', 'progress-fill');
      fill.style.width = (total ? Math.round(paid / total * 100) : 0) + '%';
      progress.appendChild(fill);
      progressRow.appendChild(progress);
      progressRow.appendChild(app.el('span', 'shrink-0 whitespace-nowrap text-small text-muted', jumlah));
      teks.appendChild(progressRow);

      teks.appendChild(app.el('p', 'text-small text-muted', t('groups.round', {
        round: arisan.periode_aktif.nomor,
        rounds: arisan.total_periode,
      })));

      // When this round's pot is handed over, and to whom. Unlike the old
      // "Recipient" line it also shows when the viewer is the recipient.
      var penerima = d.penerimaPeriode(arisan);
      if (penerima) {
        var tanggalBayar = d.formatTanggalPendek(
          arisan.periode_aktif.tanggal_jatuh_tempo, i18n.getLocale());
        teks.appendChild(app.el('p', 'text-small text-muted',
          penerima.id === milik.anggota.id
            ? t('groups.payoutYou', { date: tanggalBayar })
            : t('groups.payout', { date: tanggalBayar, name: penerima.nama_tampil })));
      }

      var giliran = d.giliranPengguna(arisan, milik.anggota);
      if (giliran) {
        if (giliran.keadaan === 'nanti') {
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurn', {
            round: giliran.nomor,
            when: waktuGiliran(arisan, giliran.tanggal),
          })));
        } else if (giliran.keadaan === 'sekarang') {
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurnNow')));
        } else {
          teks.appendChild(app.el('p', 'text-small text-muted', t('groups.yourTurnPassed', {
            round: giliran.nomor,
          })));
        }
      }
      kiri.appendChild(teks);

      a.appendChild(kiri);
      a.appendChild(app.chipEl(milik.status));
      li.appendChild(a);

      // Every member's turn, under the row and outside its link: reading
      // only, so the row above stays the one thing that opens the group.
      var jadwal = kotakJadwal(arisan);
      if (jadwal) li.appendChild(jadwal);
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
    renderGiliran();
    renderDaftarArisan();
    renderLanguage();
    renderBacakan();
  }

  // Static listeners: bound once, read the mutable module state.
  document.getElementById('btn-bayar').addEventListener('click', function () {
    if (arisanBayar) app.bukaSheetBayar(arisanBayar);
  });
  // Read aloud: the button the spec puts under Pay now. Tapping again stops
  // the reading; the label flips through renderBacakan, also from the
  // speak() end callback.
  document.getElementById('btn-bacakan').addEventListener('click', function () {
    var suara = window.TurnlySpeech;
    if (!suara || !suara.isSupported()) return;
    if (suara.isSpeaking()) {
      suara.stop();
    } else {
      suara.speak(kalimatHero(), i18n.getLocale(), renderBacakan);
    }
    renderBacakan();
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
