/**
 * Backup — export everything the app keeps on this device to one .json file, and import it back.
 *   • progress & settings  localStorage 'jee-prep:v1'  answers to every question, theme, motion, sound,
 *                                                     last lesson opened, library tab
 *   • interface            localStorage 'jee-prep:ui'  sidebar, ambient sound, pen-tool choices
 *   • handwritten notes    IndexedDB 'jee-prep-ink'     every stroke on every lesson (or its localStorage /
 *                                                     in-memory fallback)
 * A backup is plain JSON, so it moves between devices, browsers and builds (single file ⇄ website).
 * Importing replaces what is on this device; the page then reloads so every part starts from it.
 */
(function () {
  'use strict';
  var FORMAT = 'jee-prep-backup', VERSION = 1, FILE_PREFIX = '__FILE_PREFIX__';
  var ico = function (id) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  function toast(html, ms) { if (window.FX) FX.toast(html, ms || 4200); }
  function sound(name) { if (window.FX) FX.play(name); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); }
  function lsJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsWorks() { try { localStorage.setItem('jee-prep:bk-test', '1'); localStorage.removeItem('jee-prep:bk-test'); return true; } catch (e) { return false; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()); }
  function answersIn(d) { return d && d.progress && d.progress.answers ? Object.keys(d.progress.answers).length : 0; }
  function pagesIn(d) {
    var ink = d && d.ink || {};
    return Object.keys(ink).filter(function (k) { return ink[k] && ink[k].s && ink[k].s.length; }).length;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ── export ── */
  function collect() {
    var App = window.JEEApp, Tools = window.StudyTools, Ink = Tools && Tools.Ink;
    var data = {
      format: FORMAT, version: VERSION, exported: new Date().toISOString(),
      progress: App ? App.state() : (lsJSON('jee-prep:v1') || {}),
      ui: Tools && Tools.ui ? Tools.ui() : (lsJSON('jee-prep:ui') || {}),
      ink: {},
    };
    // write the lesson that is open right now first, so its latest strokes are in the file
    return Promise.resolve(Ink && Ink.flush ? Ink.flush() : null)
      .then(function () { return Ink && Ink.store ? Ink.store.all() : {}; })
      .then(function (ink) { data.ink = ink || {}; return data; });
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  function exportAll() {
    collect().then(function (data) {
      download(FILE_PREFIX + '-' + stamp(new Date()) + '.json', JSON.stringify(data));
      toast(ico('download') + '<span><b>Backup exported</b> · ' + plural(answersIn(data), 'answer', 'answers') + ', ' + plural(pagesIn(data), 'page', 'pages') + ' of notes</span>');
    }).catch(function () { toast('<span><b>Couldn’t export</b> · try again</span>'); sound('wrong'); });
  }

  /* ── import ── */
  var picker = document.createElement('input');
  picker.type = 'file'; picker.accept = '.json,application/json'; picker.hidden = true; picker.setAttribute('aria-hidden', 'true');
  document.body.appendChild(picker);
  picker.addEventListener('change', function () {
    var f = picker.files && picker.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { picker.value = ''; var d = null; try { d = JSON.parse(String(r.result)); } catch (e) { /* not JSON */ } apply(d); };
    r.onerror = function () { picker.value = ''; toast('<span><b>Couldn’t read that file</b></span>'); sound('wrong'); };
    r.readAsText(f);
  });
  function valid(d) { return !!d && d.format === FORMAT && typeof d.version === 'number' && !!d.progress && typeof d.progress === 'object'; }
  function apply(d) {
    if (!valid(d)) { toast('<span><b>That isn’t a backup file</b> · pick a .json made with Export backup</span>', 5200); sound('wrong'); return; }
    if (d.version > VERSION) { toast('<span><b>This backup is from a newer version</b> · update the app first</span>', 5200); sound('wrong'); return; }
    var when = d.exported ? new Date(d.exported) : null;
    var ok = window.confirm('Import this backup' + (when && !isNaN(when) ? ' from ' + when.toLocaleString() : '') + '?\n\n' +
      plural(answersIn(d), 'answer', 'answers') + ' · ' + plural(pagesIn(d), 'page', 'pages') + ' of handwritten notes\n\n' +
      'It replaces all progress, notes and settings currently on this device.');
    if (!ok) return;
    var App = window.JEEApp, Tools = window.StudyTools, Ink = Tools && Tools.Ink;
    var progress = clone(d.progress), ui = d.ui && typeof d.ui === 'object' ? clone(d.ui) : {}, ink = d.ink && typeof d.ink === 'object' ? d.ink : {};
    progress.answers = progress.answers && typeof progress.answers === 'object' ? progress.answers : {};
    // close the open lesson's ink first, so nothing can save the old strokes over the imported ones
    if (Ink && Ink.reset) Ink.reset();
    var durable = lsWorks();
    if (durable) {
      try { localStorage.setItem('jee-prep:v1', JSON.stringify(progress)); localStorage.setItem('jee-prep:ui', JSON.stringify(ui)); }
      catch (e) { durable = false; }
    }
    Promise.resolve(Ink && Ink.store ? Ink.store.replaceAll(ink) : true).then(function () {
      if (durable) {
        try { sessionStorage.setItem('jee-prep:imported', String(answersIn(d)) + '|' + pagesIn(d)); } catch (e) { /* no toast after reload, that's all */ }
        location.reload();
        return;
      }
      // storage is blocked in this view (private mode, some file viewers): use the backup for this session
      if (App && App.replace) App.replace(progress);
      if (Tools && Tools.refresh) Tools.refresh();
      toast(ico('upload') + '<span><b>Backup imported</b> · this view can’t save, so it lasts until you close it</span>', 6000);
      sound('complete');
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('#exportAll, #importAll') : null; if (!b) return;
    if (b.id === 'exportAll') exportAll(); else picker.click();
  });

  // after an import the page reloads; say that it worked
  try {
    var done = sessionStorage.getItem('jee-prep:imported');
    if (done) {
      sessionStorage.removeItem('jee-prep:imported');
      var n = done.split('|');
      setTimeout(function () {
        toast(ico('upload') + '<span><b>Backup imported</b> · ' + plural(+n[0] || 0, 'answer', 'answers') + ', ' + plural(+n[1] || 0, 'page', 'pages') + ' of notes</span>', 5000);
        sound('complete');
      }, 500);
    }
  } catch (e) { /* sessionStorage blocked */ }

  window.Backup = { collect: collect, exportAll: exportAll, apply: apply };
})();
