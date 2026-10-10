/* Quick revision workshop (public/revisi.html): the owner's tool for
 * spotting small problems and turning them into clean, point-by-point
 * revision requests.
 *
 * Three sections, all rendered here into the static skeleton:
 *  - Preview: the app's real screens (Beranda, Detail arisan) framed at
 *    360 / 412 / 768 px, true size, each scanned for text that does not
 *    fit. The frames load /index.html — static GETs are ungated — with
 *    the hash route from app.js picking the screen.
 *  - Checklist: one point per revision instruction (revisi-store.js).
 *    Copy open points builds the numbered request to paste into the
 *    revision prompt.
 *  - Version history: every checklist change recorded, undoable.
 *
 * The screens inside the frames are never touched from here: the workshop
 * is a read-only observer of the app plus a self-contained store.
 */
(function () {
  'use strict';

  var i18n = window.TurnlyI18n;
  var t = i18n.t;
  var store = window.TurnlyRevisiStore;
  var un = window.unNative || null;

  var LEBAR = [360, 412, 768]; // small phone, large phone, tablet
  var tinggiFrame = 640;

  var layar = 'home'; // which app screen the frames show

  // ── Element helpers ──────────────────────────────────────────────────────

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

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

  function salinTeks(teks, selesai) {
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

  // ── Preview: the app at real widths ──────────────────────────────────────

  function sumberIframe() {
    var cari = '?lang=' + encodeURIComponent(i18n.getLocale());
    var tujuan = layar === 'detail' ? '#/arisan/demo-kb' : '';
    return '/index.html' + cari + tujuan;
  }

  // Elements whose visible text is clipped by a hidden/clip overflow — the
  // app's `truncate` pattern. A hint list for the owner, not a gate.
  function cariTerpotong(doc) {
    var hasil = [];
    var semua = doc.querySelectorAll('*');
    for (var i = 0; i < semua.length; i++) {
      var simpul = semua[i];
      var teksSendiri = '';
      for (var n = simpul.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) teksSendiri += n.nodeValue;
      }
      teksSendiri = teksSendiri.replace(/\s+/g, ' ').trim();
      if (!teksSendiri) continue;
      var gaya = doc.defaultView.getComputedStyle(simpul);
      var lebarKurang = simpul.scrollWidth > simpul.clientWidth + 1
        && (gaya.overflowX === 'hidden' || gaya.overflowX === 'clip');
      var tinggiKurang = simpul.scrollHeight > simpul.clientHeight + 1
        && (gaya.overflowY === 'hidden' || gaya.overflowY === 'clip');
      if (lebarKurang || tinggiKurang) {
        var kelas = typeof simpul.className === 'string' && simpul.className
          ? '.' + simpul.className.trim().split(/\s+/).join('.') : '';
        hasil.push({ teks: teksSendiri.slice(0, 80), penanda: simpul.tagName.toLowerCase() + kelas });
      }
    }
    return hasil;
  }

  function perbaruiLencana(panel, hasil) {
    var lencana = panel.querySelector('.lencana-pindai');
    var daftar = panel.querySelector('.daftar-terpotong');
    if (hasil === null) {
      // The frame could not be read: say what failed, what still works,
      // and offer Retry — the checklist and history keep working.
      lencana.hidden = true;
      daftar.hidden = true;
      var gagal = panel.querySelector('.pratinjau-gagal');
      gagal.hidden = false;
      return;
    }
    panel.querySelector('.pratinjau-gagal').hidden = true;
    lencana.hidden = false;
    if (!hasil.length) {
      lencana.textContent = t('preview.notClipped');
      lencana.className = 'chip chip-lunas lencana-pindai';
      daftar.hidden = true;
      return;
    }
    lencana.textContent = t('preview.clipped', { count: hasil.length });
    lencana.className = 'chip chip-telat lencana-pindai';
    lencana.setAttribute('aria-expanded', daftar.hidden ? 'false' : 'true');
    daftar.textContent = '';
    hasil.forEach(function (temuan) {
      var li = el('li', 'px-4 py-2');
      li.appendChild(el('p', 'text-small text-fg', temuan.teks));
      li.appendChild(el('p', 'text-small text-muted', temuan.penanda));
      daftar.appendChild(li);
    });
    daftar.hidden = !hasil.length ? true : daftar.hidden;
  }

  function buatPanel(lebar) {
    var panel = el('div', 'flex shrink-0 flex-col gap-1.5');

    var meta = el('div', 'flex items-center gap-2 px-1');
    meta.appendChild(el('span', 'text-small text-muted', t('preview.size', { width: lebar })));
    var lencana = el('button', 'chip chip-belum lencana-pindai');
    lencana.type = 'button';
    lencana.hidden = true; // set once the frame has loaded and been scanned
    meta.appendChild(lencana);
    panel.appendChild(meta);

    var bingkai = el('div', 'overflow-hidden rounded-xl border border-line bg-surface self-start');
    var iframe = document.createElement('iframe');
    iframe.title = t('preview.title');
    iframe.className = 'block border-0 bg-surface';
    // TRUE size is the point of the workshop: the viewport is exactly this
    // many pixels wide (the surrounding border sits outside it).
    iframe.style.width = lebar + 'px';
    iframe.style.height = tinggiFrame + 'px';
    iframe.src = sumberIframe();
    bingkai.appendChild(iframe);
    panel.appendChild(bingkai);

    var daftar = el('ul', 'list daftar-terpotong');
    daftar.hidden = true;
    panel.appendChild(daftar);

    lencana.addEventListener('click', function () {
      if (!daftar.children.length) return; // nothing clipped: nothing to list
      daftar.hidden = !daftar.hidden;
      lencana.setAttribute('aria-expanded', daftar.hidden ? 'false' : 'true');
    });

    var gagal = el('div', 'state-error pratinjau-gagal');
    gagal.hidden = true;
    gagal.appendChild(el('p', 'text-small text-muted', t('preview.scanError')));
    var coba = el('button', 'btn-secondary', t('preview.retry'));
    coba.type = 'button';
    coba.addEventListener('click', function () {
      gagal.hidden = true;
      iframe.src = sumberIframe();
    });
    gagal.appendChild(coba);
    panel.appendChild(gagal);

    iframe.addEventListener('load', function () {
      var hasil = null;
      try {
        var doc = iframe.contentDocument;
        // An initial empty-document load just waits for the real one; only
        // an unreadable document (null doc) counts as a failed preview.
        if (doc && doc.body && doc.body.children.length) hasil = cariTerpotong(doc);
        else if (doc && doc.body) return;
      } catch (e) { hasil = null; }
      perbaruiLencana(panel, hasil);
    });

    return panel;
  }

  function renderPratinjau() {
    document.getElementById('pratinjau-label').textContent = t('preview.title');
    var beranda = document.getElementById('pratinjau-home');
    var detail = document.getElementById('pratinjau-detail');
    beranda.textContent = t('preview.home');
    detail.textContent = t('preview.group');
    document.getElementById('pratinjau-muat').textContent = t('preview.reload');
    beranda.setAttribute('aria-pressed', layar === 'home' ? 'true' : 'false');
    detail.setAttribute('aria-pressed', layar === 'detail' ? 'true' : 'false');
    beranda.classList.toggle('border-accent', layar === 'home');
    detail.classList.toggle('border-accent', layar === 'detail');

    var strip = document.getElementById('strip-pratinjau');
    strip.textContent = '';
    LEBAR.forEach(function (lebar) {
      strip.appendChild(buatPanel(lebar));
    });
  }

  // ── Checklist ────────────────────────────────────────────────────────────

  function labelStatus(poin) {
    return poin.done ? t('revisi.pointDone') : t('revisi.pointOpen');
  }

  function renderChecklist() {
    var state = store.read();
    document.getElementById('checklist-label').textContent = t('revisi.checklist');
    document.getElementById('btn-tambah').textContent = t('revisi.add');
    document.getElementById('input-poin').placeholder = t('revisi.pointPlaceholder');
    document.getElementById('btn-salin').textContent = t('revisi.copyOpen');

    var terbuka = state.points.filter(function (p) { return !p.done; });
    document.getElementById('btn-salin').disabled = terbuka.length === 0;

    var ul = document.getElementById('daftar-poin');
    ul.textContent = '';
    document.getElementById('poin-kosong').hidden = state.points.length > 0;
    document.getElementById('poin-kosong-teks').textContent = t('revisi.empty');

    state.points.forEach(function (poin) {
      var li = el('li', 'flex flex-col gap-2 px-4 py-3');
      var atas = el('div', 'flex items-center gap-3');

      var kotak = el('input', 'h-5 w-5 shrink-0 accent-success');
      kotak.type = 'checkbox';
      kotak.checked = !!poin.done;
      kotak.setAttribute('aria-label', poin.text);
      kotak.addEventListener('change', function () {
        store.setDone(poin.id, kotak.checked);
        renderChecklist();
        renderVersi();
      });
      atas.appendChild(kotak);

      var teks = el('button', 'min-w-0 flex-1 truncate text-left text-body' + (poin.done ? ' text-muted line-through' : ''));
      teks.type = 'button';
      teks.textContent = poin.text;
      // Tap the point to edit it in place: one short instruction, rewritten
      // as the owner's own words change.
      teks.addEventListener('click', function () { suntingPoin(li, atas, poin); });
      atas.appendChild(teks);

      atas.appendChild(el('span', 'chip ' + (poin.done ? 'chip-lunas' : 'chip-belum'), labelStatus(poin)));

      var hapus = el('button', 'btn-secondary shrink-0 px-3', '×');
      hapus.type = 'button';
      hapus.setAttribute('aria-label', t('revisi.delete'));
      hapus.addEventListener('click', function () {
        store.removePoint(poin.id);
        renderChecklist();
        renderVersi();
      });
      atas.appendChild(hapus);

      li.appendChild(atas);
      ul.appendChild(li);
    });
  }

  function suntingPoin(li, atas, poin) {
    var masukan = el('input', 'field min-w-0 flex-1');
    masukan.type = 'text';
    masukan.maxLength = store.MAX_TEXT;
    masukan.value = poin.text;
    masukan.setAttribute('aria-label', t('revisi.pointPlaceholder'));

    var batal = el('button', 'btn-secondary shrink-0 px-3', '×');
    batal.type = 'button';
    batal.setAttribute('aria-label', t('revisi.delete'));

    atas.textContent = '';
    atas.appendChild(masukan);
    atas.appendChild(batal);

    var simpan = function () {
      var nilai = masukan.value;
      // Touch nothing when the edit was a no-op or abandoned empty.
      if (nilai.trim() && nilai.trim() !== poin.text) {
        store.editPoint(poin.id, nilai);
        renderChecklist();
        renderVersi();
      } else {
        renderChecklist();
      }
    };
    masukan.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') masukan.blur();
      if (e.key === 'Escape') { masukan.value = poin.text; masukan.blur(); }
    });
    masukan.addEventListener('blur', simpan);
    batal.addEventListener('click', function () {
      masukan.value = poin.text;
      masukan.blur();
    });
    masukan.focus();
  }

  function salinTerbuka() {
    var terbuka = store.read().points.filter(function (p) { return !p.done; });
    if (!terbuka.length) return;
    // The point texts are the owner's own words — data joined into the
    // request, the same way names go into messages, not glued sentences.
    var baris = terbuka.map(function (p, i) { return (i + 1) + '. ' + p.text; });
    var permintaan = [t('revisi.copyIntro')].concat(baris).join('\n');
    salinTeks(permintaan, function () {
      toast(t('revisi.copied'));
    });
  }

  // ── Version history ──────────────────────────────────────────────────────

  function labelAksi(aksi) {
    if (aksi === 'added') return t('versions.action.added');
    if (aksi === 'edited') return t('versions.action.edited');
    if (aksi === 'deleted') return t('versions.action.deleted');
    if (aksi === 'markedDone') return t('versions.action.markedDone');
    if (aksi === 'reopened') return t('versions.action.reopened');
    return t('versions.action.restored');
  }

  function formatWaktu(at) {
    try {
      return new Intl.DateTimeFormat(i18n.getLocale(), { hour: 'numeric', minute: '2-digit' }).format(new Date(at));
    } catch (e) {
      return '';
    }
  }

  function renderVersi() {
    var state = store.read();
    document.getElementById('versi-label').textContent = t('versions.title');
    document.getElementById('versi-kosong-teks').textContent = t('versions.empty');

    var urungkan = document.getElementById('btn-urungkan');
    urungkan.textContent = t('versions.undo');
    urungkan.disabled = state.versions.length === 0;

    var ul = document.getElementById('daftar-versi');
    ul.textContent = '';
    document.getElementById('versi-kosong').hidden = state.versions.length > 0;

    state.versions.forEach(function (versi) {
      var terbuka = (versi.points || []).filter(function (p) { return !p.done; }).length;
      var li = el('li', 'list-row justify-between');
      li.appendChild(el('p', 'min-w-0 truncate text-small text-muted', t('versions.entry', {
        action: labelAksi(versi.action),
        open: terbuka,
        time: formatWaktu(versi.at),
      })));
      var pulihkan = el('button', 'btn-secondary shrink-0 px-3', t('versions.restore'));
      pulihkan.type = 'button';
      pulihkan.addEventListener('click', function () {
        store.restoreVersion(versi.id);
        renderChecklist();
        renderVersi();
      });
      li.appendChild(pulihkan);
      ul.appendChild(li);
    });
  }

  // ── Wire-up and render ───────────────────────────────────────────────────

  document.getElementById('btn-kembali').setAttribute('aria-label', t('revisi.back'));
  document.getElementById('btn-kembali').addEventListener('click', function () {
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/');
  });
  document.getElementById('pratinjau-home').addEventListener('click', function () {
    if (layar === 'home') return;
    layar = 'home';
    renderPratinjau();
  });
  document.getElementById('pratinjau-detail').addEventListener('click', function () {
    if (layar === 'detail') return;
    layar = 'detail';
    renderPratinjau();
  });
  document.getElementById('pratinjau-muat').addEventListener('click', function () {
    renderPratinjau();
  });
  document.getElementById('btn-tambah').addEventListener('click', tambahDariInput);
  document.getElementById('input-poin').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tambahDariInput();
  });
  document.getElementById('btn-salin').addEventListener('click', salinTerbuka);
  document.getElementById('btn-urungkan').addEventListener('click', function () {
    store.undo();
    renderChecklist();
    renderVersi();
  });

  function tambahDariInput() {
    var input = document.getElementById('input-poin');
    if (!input.value.trim()) return;
    store.addPoint(input.value);
    input.value = '';
    renderChecklist();
    renderVersi();
  }

  function renderSemua() {
    document.title = t('app.name');
    document.getElementById('revisi-judul').textContent = t('revisi.title');
    renderPratinjau();
    renderChecklist();
    renderVersi();
  }

  i18n.onChange(renderSemua);
  renderSemua();
})();
