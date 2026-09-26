/* =====================================================
   EC Companion — Main Application
   Vanilla JS SPA — no build step required
   ===================================================== */

const PDF_PATH = '/Users/fettermania/Library/Mobile Documents/iCloud~com~apple~iBooks/Documents/stanley_1_enu_comb_stanley_with_notes.pdf';

// ── State ─────────────────────────────────────────────
const state = {
  book:       null,
  techniques: null,
  sections:   {},   // sectionId → loaded JSON
  notes:      {},   // sectionId → markdown string
  progress:   {},   // exerciseId → 'not-started'|'attempted'|'solved'
  route:      'home',
};

// ── Bootstrap ──────────────────────────────────────────
async function init() {
  try {
    [state.book, state.techniques] = await Promise.all([
      fetchJSON('data/book.json'),
      fetchJSON('data/techniques.json'),
    ]);
  } catch (e) {
    document.getElementById('content-inner').innerHTML =
      `<div class="callout callout-warning"><strong>Could not load data files.</strong><br>
       Run <code>python3 -m http.server 8080</code> in the stanley-ec directory, then open
       <a href="http://localhost:8080">http://localhost:8080</a>.</div>`;
    return;
  }
  state.notes    = loadStorage('ec-notes')    || {};
  state.progress = loadStorage('ec-progress') || {};

  renderSidebar();
  setupSearch();
  setupExport();
  setupImport();

  window.addEventListener('hashchange', () => route(location.hash.slice(1)));
  route(location.hash.slice(1) || 'home');
}

// ── Routing ────────────────────────────────────────────
async function route(hash) {
  document.querySelectorAll('.nav-link, .nav-section-item').forEach(el => el.classList.remove('active'));
  state.route = hash;

  if (!hash || hash === 'home') {
    markNavActive('home');
    renderHome();
  } else if (hash === 'techniques') {
    markNavActive('techniques');
    renderTechniques();
  } else if (hash === 'index') {
    markNavActive('index');
    renderTheoremIndex();
  } else if (/^\d+\.\d+/.test(hash)) {
    await renderSection(hash);
  } else {
    renderHome();
  }
}

function markNavActive(id) {
  document.querySelectorAll(`[data-route="${id}"]`).forEach(el => el.classList.add('active'));
}

function navigate(hash) {
  location.hash = hash;
}

// ── Data loading ───────────────────────────────────────
async function fetchJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`);
  return r.json();
}

async function loadSection(id) {
  if (state.sections[id]) return state.sections[id];
  const [ch, sec] = id.split('.');
  const path = `data/sections/ch${ch.padStart(2,'0')}/s${id}.json`;
  try {
    state.sections[id] = await fetchJSON(path);
    return state.sections[id];
  } catch {
    return null;
  }
}

// ── LocalStorage helpers ────────────────────────────────
function loadStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

// ── Sidebar ────────────────────────────────────────────
function renderSidebar() {
  const el = document.getElementById('chapter-nav');
  if (!state.book) return;

  let html = '';
  for (const ch of state.book.chapters) {
    html += `<div class="nav-section">
      <div class="nav-chapter">Chapter ${ch.num}: ${ch.title}</div>`;
    for (const sec of ch.sections) {
      const dot = sec.status === 'done' ? 'done' : sec.status === 'partial' ? 'partial' : 'stub';
      html += `<a class="nav-section-item" data-route="${sec.id}"
                  onclick="navigate('${sec.id}'); return false;" href="#${sec.id}">
                <span class="nav-dot ${dot}"></span>
                §${sec.id} ${sec.title}
              </a>`;
    }
    html += '</div>';
  }
  el.innerHTML = html;
}

function updateSidebarActive(id) {
  document.querySelectorAll('.nav-section-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[data-route="${id}"]`).forEach(el => el.classList.add('active'));
}

// ── Home page ──────────────────────────────────────────
function renderHome() {
  const allSections = state.book.chapters.flatMap(ch => ch.sections);
  const done    = allSections.filter(s => s.status === 'done').length;
  const partial = allSections.filter(s => s.status === 'partial').length;
  const total   = allSections.length;

  const exerciseIds = Object.keys(state.progress);
  const solved = exerciseIds.filter(k => state.progress[k] === 'solved').length;

  let recentHtml = '';
  const recentSections = allSections.filter(s => s.status === 'done' || s.status === 'partial').slice(0,6);
  for (const sec of recentSections) {
    recentHtml += `<a class="conn-link" onclick="navigate('${sec.id}'); return false;" href="#${sec.id}">
                     §${sec.id} ${sec.title}</a>`;
  }

  setContent(`
    <div class="home-hero">
      <h1>Enumerative Combinatorics Vol. 1</h1>
      <p>Richard P. Stanley &nbsp;·&nbsp; Interactive Study Companion</p>
    </div>
    <div class="home-grid">
      <div class="stat-card"><div class="num">${done}</div><div class="lbl">Sections complete</div></div>
      <div class="stat-card"><div class="num">${partial}</div><div class="lbl">In progress</div></div>
      <div class="stat-card"><div class="num">${total - done - partial}</div><div class="lbl">Not yet started</div></div>
      <div class="stat-card"><div class="num">${solved}</div><div class="lbl">Exercises solved</div></div>
    </div>
    <h2>Covered Sections</h2>
    <div style="margin-bottom:24px">${recentHtml || '<em style="color:var(--text-light);font-family:sans-serif">No sections completed yet.</em>'}</div>
    <h2>Quick Navigation</h2>
    <p style="font-family:sans-serif;font-size:.88rem">
      Use the sidebar to navigate by section. Each section has six tabs:
      <strong>Overview</strong> (summary &amp; notation),
      <strong>Theorems &amp; Defs</strong> (expandable proofs),
      <strong>Examples</strong> (worked examples),
      <strong>Exercises</strong> (status tracking with hints),
      <strong>My Notes</strong> (personal annotations, saved locally),
      and <strong>Connections</strong> (cross-references to other sections).
    </p>
    <p style="font-family:sans-serif;font-size:.88rem">
      <a href="#techniques" style="color:var(--teal-dark)">Technique Library</a> catalogs recurring proof strategies.
      <a href="#index" style="color:var(--teal-dark)">Theorem Index</a> lists every theorem with its section.
    </p>
    <div class="callout callout-info" style="font-family:sans-serif;font-size:.85rem;margin-top:16px">
      <strong>Tip:</strong> Click any PDF page link to open the source text at that page. Notes are saved in your browser;
      use <strong>Export</strong> in the top bar to save a JSON snapshot for git.
    </div>
  `);
  typeset();
}

// ── Section rendering ──────────────────────────────────
async function renderSection(id) {
  setContent(`<div class="callout callout-info" style="font-family:sans-serif">Loading §${id}…</div>`);
  const sec = await loadSection(id);
  if (!sec) {
    setContent(`<div class="stub-notice">
      <strong>§${id} — not yet populated</strong><br><br>
      This section will be added as you work through the text.<br>
      Run <code>python3 scripts/add_section.py ${id}</code> to scaffold it.
    </div>`);
    return;
  }
  updateSidebarActive(id);
  markNavActive(id);

  const pdfLink = sec.pdf_pages
    ? `<a class="pdf-link" href="file://${PDF_PATH}#page=${sec.pdf_pages.start}" target="_blank">
         📄 pp. ${sec.pdf_pages.start}–${sec.pdf_pages.end}</a>`
    : '';
  const tags = (sec.technique_tags || []).map(t =>
    `<span class="technique-tag teal">${t}</span>`).join(' ');

  const html = `
    <div class="section-header">
      <h1>§${sec.id} — ${sec.title}</h1>
      <div class="section-meta">${pdfLink} ${tags}</div>
    </div>
    <div class="section-tabs">
      <button class="tab-btn" data-tab="read">Read</button>
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="content">Theorems &amp; Defs</button>
      <button class="tab-btn" data-tab="examples">Examples</button>
      <button class="tab-btn" data-tab="exercises">Exercises</button>
      <button class="tab-btn" data-tab="notes">My Notes</button>
      <button class="tab-btn" data-tab="connections">Connections</button>
    </div>
    <div id="tab-read"        class="tab-panel">${renderTextView(sec)}</div>
    <div id="tab-overview"    class="tab-panel active">${renderOverview(sec)}</div>
    <div id="tab-content"     class="tab-panel">${renderContent(sec)}</div>
    <div id="tab-examples"    class="tab-panel">${renderExamples(sec)}</div>
    <div id="tab-exercises"   class="tab-panel">${renderExercises(sec, id)}</div>
    <div id="tab-notes"       class="tab-panel">${renderNotes(sec, id)}</div>
    <div id="tab-connections" class="tab-panel">${renderConnections(sec)}</div>
  `;
  setContent(html);

  // Wire tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'notes') focusNotes();
      if (btn.dataset.tab === 'read') typeset();
    });
  });

  // Wire concept passage clicks in Read tab
  document.querySelectorAll('.clickable-passage').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.clickable-passage').forEach(p => p.classList.remove('selected'));
      el.classList.add('selected');
      const kind = el.dataset.kind;
      const number = el.dataset.number;
      const detail = document.getElementById('detail-panel');
      if (!detail) return;
      const items = [
        ...(sec.definitions   || []).map(x => ({...x, kind: 'definition'})),
        ...(sec.theorems      || []).map(x => ({...x, kind: 'theorem'})),
        ...(sec.propositions  || []).map(x => ({...x, kind: 'proposition'})),
        ...(sec.corollaries   || []).map(x => ({...x, kind: 'corollary'})),
      ];
      const item = items.find(x => x.kind === kind && String(x.number) === String(number));
      if (item) {
        detail.innerHTML = renderItem(item);
        if (window.MathJax) MathJax.typesetPromise([detail]).catch(()=>{});
      }
    });
  });

  // Wire proof toggles
  document.querySelectorAll('.proof-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = document.getElementById(btn.dataset.target);
      if (!body) return;
      const open = body.classList.toggle('visible');
      btn.classList.toggle('open', open);
      btn.querySelector('.label').textContent = open ? 'Hide proof' : 'Show proof';
      if (open) typeset();
    });
  });

  // Wire hint toggles
  document.querySelectorAll('.hint-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = document.getElementById(btn.dataset.target);
      if (!body) return;
      body.classList.toggle('visible');
    });
  });

  // Wire exercise status buttons
  document.querySelectorAll('.ex-status button').forEach(btn => {
    btn.addEventListener('click', () => {
      const exId  = btn.closest('.exercise-card').dataset.exid;
      const status = btn.dataset.status;
      state.progress[exId] = status;
      saveStorage('ec-progress', state.progress);
      updateExerciseUI(exId);
    });
  });

  typeset();
}

// ── Tab: Overview ──────────────────────────────────────
function renderOverview(sec) {
  let html = '';

  if (sec.key_idea) {
    html += `<div class="key-idea">${esc(sec.key_idea)}</div>`;
  }
  if (sec.summary) {
    html += `<div class="summary-box">${markdownToHtml(sec.summary)}</div>`;
  }

  if (sec.notation && sec.notation.length) {
    html += `<h2>Key Notation</h2>
      <table class="notation-table">
        <thead><tr><th>Symbol</th><th>Meaning</th></tr></thead>
        <tbody>`;
    for (const n of sec.notation) {
      html += `<tr><td>$${n.latex || n.symbol}$</td><td>${esc(n.description)}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  return html || '<p style="color:var(--text-light);font-family:sans-serif">Overview coming soon.</p>';
}

// ── Tab: Theorems & Definitions ────────────────────────
function renderContent(sec) {
  let html = '';
  const items = [
    ...(sec.definitions   || []).map(x => ({...x, kind: 'definition'})),
    ...(sec.theorems      || []).map(x => ({...x, kind: 'theorem'})),
    ...(sec.propositions  || []).map(x => ({...x, kind: 'proposition'})),
    ...(sec.corollaries   || []).map(x => ({...x, kind: 'corollary'})),
  ].sort((a,b) => (a.order||0) - (b.order||0));

  for (const item of items) {
    html += renderItem(item);
  }
  return html || '<p style="color:var(--text-light);font-family:sans-serif">Content coming soon.</p>';
}

function renderItem(item) {
  const kind = item.kind || 'theorem';
  const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
  const num = item.number ? ` ${item.number}` : '';
  const title = item.title ? ` (${item.title})` : '';

  let proofHtml = '';
  if (item.proof_sketch || item.proof_detailed) {
    const pid = `proof-${item.id}`;
    proofHtml = `
      <button class="proof-toggle" data-target="${pid}">
        <span class="arrow">▶</span> <span class="label">Show proof</span>
      </button>
      <div class="proof-body" id="${pid}">`;
    if (item.proof_sketch && item.proof_detailed) {
      proofHtml += `<p><strong>Sketch:</strong> ${markdownToHtml(item.proof_sketch)}</p>
        <details><summary style="cursor:pointer;font-family:sans-serif;font-size:.85rem">Full proof</summary>
        <div style="margin-top:10px">${markdownToHtml(item.proof_detailed)}</div></details>`;
    } else {
      proofHtml += markdownToHtml(item.proof_sketch || item.proof_detailed);
    }
    proofHtml += `</div>`;
  }

  const techTags = (item.techniques || []).map(t =>
    `<span class="technique-tag" style="font-size:.72rem">${t}</span>`).join(' ');
  const crossRefs = (item.cross_refs || []).map(r =>
    `<a class="conn-link" style="font-size:.75rem" onclick="navigate('${r}'); return false;" href="#${r}">§${r}</a>`
  ).join(' ');

  return `<div class="card card-${kind}">
    <div class="card-label ${kind}">${kindLabel}${num}${title}</div>
    <div class="statement">${markdownToHtml(item.statement)}</div>
    ${proofHtml}
    ${techTags || crossRefs ? `<div style="margin-top:10px">${techTags} ${crossRefs}</div>` : ''}
  </div>`;
}

// ── Tab: Examples ──────────────────────────────────────
function renderExamples(sec) {
  if (!sec.examples || !sec.examples.length)
    return '<p style="color:var(--text-light);font-family:sans-serif">Examples coming soon.</p>';

  return sec.examples.map(ex => {
    const pid = `ex-body-${ex.id}`;
    const solutionHtml = ex.solution ? `
      <button class="proof-toggle" data-target="${pid}">
        <span class="arrow">▶</span> <span class="label">Show solution</span>
      </button>
      <div class="proof-body" id="${pid}">${markdownToHtml(ex.solution)}</div>` : '';
    return `<div class="card card-example">
      <div class="card-label example">Example ${ex.id || ''}</div>
      <h3>${esc(ex.title || '')}</h3>
      <div>${markdownToHtml(ex.content)}</div>
      ${solutionHtml}
    </div>`;
  }).join('');
}

// ── Tab: Exercises ─────────────────────────────────────
function renderExercises(sec, sectionId) {
  if (!sec.exercises || !sec.exercises.length)
    return `<div class="callout callout-info" style="font-family:sans-serif">
      Exercises for §${sectionId} not yet populated. Add them to
      <code>data/sections/ch0${sectionId.split('.')[0]}/s${sectionId}.json</code>.
    </div>`;

  return sec.exercises.map(ex => {
    const exId = `${sectionId}-ex${ex.number}`;
    const status = state.progress[exId] || 'not-started';
    const techTags = (ex.techniques||[]).map(t=>`<span class="technique-tag" style="font-size:.72rem">${t}</span>`).join(' ');
    const refs = (ex.relevant_theorems||[]).map(r=>`<a class="conn-link" style="font-size:.75rem" onclick="navigate('${r}');return false;" href="#${r}">§${r}</a>`).join(' ');

    let hintsHtml = '';
    if (ex.hints && ex.hints.length) {
      ex.hints.forEach((h,i) => {
        const hid = `hint-${exId}-${i}`;
        hintsHtml += `<button class="hint-toggle" data-target="${hid}">Hint ${i+1} ▸</button>
          <div class="hint-body" id="${hid}">${markdownToHtml(h)}</div>`;
      });
    }

    return `<div class="exercise-card" data-exid="${exId}">
      <div class="exercise-header">
        <span class="ex-num">Exercise ${ex.number}</span>
        ${techTags} ${refs}
        <div class="ex-status">
          <button data-status="not-started" class="${status==='not-started'?'active-not-started':''}">Not started</button>
          <button data-status="attempted"   class="${status==='attempted'?'active-attempted':''}">Attempted</button>
          <button data-status="solved"      class="${status==='solved'?'active-solved':''}">Solved ✓</button>
        </div>
      </div>
      <div class="ex-body">${markdownToHtml(ex.statement)}</div>
      <div class="ex-hints">${hintsHtml}</div>
    </div>`;
  }).join('');
}

function updateExerciseUI(exId) {
  const card = document.querySelector(`.exercise-card[data-exid="${exId}"]`);
  if (!card) return;
  const status = state.progress[exId] || 'not-started';
  card.querySelectorAll('.ex-status button').forEach(btn => {
    btn.className = btn.dataset.status === status ? `active-${status}` : '';
  });
}

// ── Tab: Notes ─────────────────────────────────────────
function renderNotes(sec, id) {
  const saved = state.notes[id] || '';
  return `
    <p style="font-family:sans-serif;font-size:.85rem;color:var(--text-mid);margin-bottom:10px">
      Notes are saved automatically in your browser. Use <strong>Export</strong> to save a JSON file for git.
      Markdown is supported.
    </p>
    <textarea id="notes-editor" placeholder="Write notes for §${id} here… (Markdown supported)">${esc(saved)}</textarea>
    <div class="notes-actions">
      <button id="notes-render-toggle">Preview</button>
      <span id="notes-saved-indicator" style="display:none">Saved ✓</span>
    </div>
    <div id="notes-preview" class="notes-rendered" style="display:none"></div>
  `;
}

function focusNotes() {
  const editor = document.getElementById('notes-editor');
  const sectionId = state.route;
  if (!editor) return;

  let saveTimer;
  editor.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.notes[sectionId] = editor.value;
      saveStorage('ec-notes', state.notes);
      const ind = document.getElementById('notes-saved-indicator');
      if (ind) { ind.style.display = ''; setTimeout(() => ind.style.display = 'none', 2000); }
    }, 600);
  });

  const toggle = document.getElementById('notes-render-toggle');
  const preview = document.getElementById('notes-preview');
  if (toggle && preview) {
    toggle.addEventListener('click', () => {
      const show = preview.style.display === 'none';
      preview.style.display = show ? '' : 'none';
      editor.style.display  = show ? 'none' : '';
      toggle.textContent = show ? 'Edit' : 'Preview';
      if (show) {
        preview.innerHTML = markdownToHtml(editor.value || '_No notes yet._');
        typeset();
      }
    });
  }
}

// ── Tab: Connections ───────────────────────────────────
function renderConnections(sec) {
  const conn = sec.connections || {};
  const techniques = (sec.technique_tags || []).map(t => {
    const tech = state.techniques ? state.techniques.techniques.find(x => x.id === t) : null;
    const name = tech ? tech.name : t;
    return `<a class="conn-link" onclick="navigate('techniques'); return false;" href="#techniques">${name}</a>`;
  });

  const requires = (conn.requires||[]).map(r =>
    `<a class="conn-link" onclick="navigate('${r}'); return false;" href="#${r}">§${r}</a>`);
  const usedBy = (conn.used_by||[]).map(r =>
    `<a class="conn-link" onclick="navigate('${r}'); return false;" href="#${r}">§${r}</a>`);
  const related = (conn.related||[]).map(r =>
    `<a class="conn-link" onclick="navigate('${r}'); return false;" href="#${r}">§${r}</a>`);

  return `
    <div class="connections-grid">
      <div class="conn-group">
        <h4>Requires (prerequisites)</h4>
        ${requires.join('') || '<em style="font-family:sans-serif;font-size:.85rem">None</em>'}
      </div>
      <div class="conn-group">
        <h4>Used by (later sections)</h4>
        ${usedBy.join('') || '<em style="font-family:sans-serif;font-size:.85rem">None noted yet</em>'}
      </div>
      <div class="conn-group">
        <h4>Related sections</h4>
        ${related.join('') || '<em style="font-family:sans-serif;font-size:.85rem">None noted</em>'}
      </div>
      <div class="conn-group">
        <h4>Proof techniques used</h4>
        ${techniques.join('') || '<em style="font-family:sans-serif;font-size:.85rem">None tagged</em>'}
      </div>
    </div>`;
}

// ── Tab: Read (Split View) ─────────────────────────────
function renderTextView(sec) {
  if (!sec.text_passages || !sec.text_passages.length) {
    return `<div class="split-placeholder">
      <p>No text passages available for this section yet.</p>
      <p style="font-size:.85rem;color:var(--text-light)">Add a <code>text_passages</code> array to this section's JSON file.</p>
    </div>`;
  }

  const passagesHtml = sec.text_passages.map((p, i) => {
    if (p.type === 'heading') {
      return `<h3 class="text-section-heading">${p.text}</h3>`;
    }
    if (p.type === 'prose') {
      return `<div class="text-passage prose-passage">${markdownToHtml(p.text)}</div>`;
    }
    if (p.type === 'concept') {
      const kindClass = p.kind || 'theorem';
      return `<div class="text-passage clickable-passage concept-passage-${kindClass}"
                   data-kind="${p.kind}" data-number="${esc(String(p.number))}"
                   title="Click to see full details">
        <div class="passage-concept-label ${kindClass}">${esc(p.label)}</div>
        <div class="passage-preview">${markdownToHtml(p.preview)}</div>
        <div class="passage-click-hint">Click for details →</div>
      </div>`;
    }
    return '';
  }).join('');

  return `<div class="split-view">
    <div class="text-panel" id="text-panel">
      ${passagesHtml}
    </div>
    <div class="detail-panel" id="detail-panel">
      <div class="detail-placeholder">
        <div class="detail-placeholder-icon">◈</div>
        <p>Click any highlighted concept on the left to see the full theorem, definition, or proposition here.</p>
      </div>
    </div>
  </div>`;
}

// ── Technique Library ──────────────────────────────────
function renderTechniques() {
  if (!state.techniques) return;
  let html = '<h2 style="margin-top:0">Proof Technique Library</h2>';
  for (const tech of state.techniques.techniques) {
    const refs = (tech.appears_in || []).map(r =>
      `<a onclick="navigate('${r}'); return false;" href="#${r}">§${r}</a>`).join(' · ');
    html += `<div class="technique-entry">
      <h3>${esc(tech.name)}</h3>
      <p>${markdownToHtml(tech.description)}</p>
      ${tech.when_to_use ? `<p><strong>When to use:</strong> ${esc(tech.when_to_use)}</p>` : ''}
      ${refs ? `<div class="refs">Appears in: ${refs}</div>` : ''}
    </div>`;
  }
  setContent(html);
  typeset();
}

// ── Theorem Index ──────────────────────────────────────
function renderTheoremIndex() {
  const allSections = state.book.chapters.flatMap(ch => ch.sections);
  const loaded = allSections.filter(s => state.sections[s.id]);

  let rows = '';
  for (const sec of loaded) {
    const data = state.sections[sec.id];
    const items = [
      ...(data.theorems     || []).map(x => ({...x, kind:'Theorem'})),
      ...(data.propositions || []).map(x => ({...x, kind:'Proposition'})),
      ...(data.corollaries  || []).map(x => ({...x, kind:'Corollary'})),
      ...(data.definitions  || []).map(x => ({...x, kind:'Definition'})),
    ];
    for (const item of items) {
      rows += `<tr>
        <td class="num-col">${item.kind} ${item.number||''}</td>
        <td>${esc(item.title||'')}</td>
        <td style="font-size:.85rem;max-width:340px">${esc((item.statement||'').substring(0,120))}…</td>
        <td><a onclick="navigate('${sec.id}'); return false;" href="#${sec.id}">§${sec.id}</a></td>
      </tr>`;
    }
  }

  setContent(`
    <h2 style="margin-top:0">Theorem Index</h2>
    ${loaded.length < allSections.length
      ? `<div class="callout callout-warning" style="font-family:sans-serif;font-size:.85rem;margin-bottom:16px">
           Showing ${loaded.length} of ${allSections.length} sections — navigate to a section to load it.
         </div>` : ''}
    <table class="index-table">
      <thead><tr><th>Number</th><th>Name</th><th>Statement</th><th>Section</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-light);font-family:sans-serif">Navigate to sections to populate the index.</td></tr>'}</tbody>
    </table>
  `);
  typeset();
}

// ── Search ─────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(input.value.trim()), 250);
  });
  input.addEventListener('blur', () => setTimeout(() => results.classList.add('hidden'), 200));
  input.addEventListener('focus', () => { if (input.value.trim()) doSearch(input.value.trim()); });
}

function doSearch(q) {
  const results = document.getElementById('search-results');
  if (!q) { results.classList.add('hidden'); return; }
  const ql = q.toLowerCase();

  const hits = [];
  for (const [id, sec] of Object.entries(state.sections)) {
    const search = (text, kind, label) => {
      if (text && text.toLowerCase().includes(ql)) {
        hits.push({ id, kind, label, preview: text.substring(0, 120) });
      }
    };
    search(sec.title, 'section', `§${id} ${sec.title}`);
    for (const t of (sec.theorems||[])) {
      search(t.statement, 'theorem', `Thm ${t.number}: ${t.title||''}`);
      search(t.title, 'theorem', `Thm ${t.number}: ${t.title||''}`);
    }
    for (const d of (sec.definitions||[])) {
      search(d.statement, 'definition', `Def: ${d.term}`);
      search(d.term, 'definition', `Def: ${d.term}`);
    }
    for (const e of (sec.examples||[])) {
      search(e.content, 'example', `Ex: ${e.title||''}`);
    }
  }
  // Also search techniques
  if (state.techniques) {
    for (const tech of state.techniques.techniques) {
      if (tech.name.toLowerCase().includes(ql) || (tech.description||'').toLowerCase().includes(ql)) {
        hits.push({ id: 'techniques', kind: 'technique', label: tech.name, preview: tech.description });
      }
    }
  }

  if (!hits.length) {
    results.innerHTML = '<div class="search-hit" style="color:var(--text-light)">No results found.</div>';
  } else {
    results.innerHTML = hits.slice(0,10).map(h =>
      `<div class="search-hit" onclick="navigate('${h.id}'); document.getElementById('search-input').value=''; document.getElementById('search-results').classList.add('hidden')">
        <strong>${esc(h.label)}</strong>
        <em>${esc(h.preview.substring(0,100))}…</em>
      </div>`
    ).join('');
  }
  results.classList.remove('hidden');
}

// ── Export / Import ────────────────────────────────────
function setupExport() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = {
      exported: new Date().toISOString(),
      notes: state.notes,
      progress: state.progress,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ec-companion-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  });
}

function setupImport() {
  const btn  = document.getElementById('btn-import');
  const file = document.getElementById('import-file');
  btn.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.notes)    { state.notes    = data.notes;    saveStorage('ec-notes', state.notes); }
        if (data.progress) { state.progress = data.progress; saveStorage('ec-progress', state.progress); }
        alert('Data imported successfully.');
        route(state.route);
      } catch {
        alert('Invalid file — expected JSON from the Export button.');
      }
    };
    reader.readAsText(f);
    file.value = '';
  });
}

// ── Helpers ────────────────────────────────────────────
function setContent(html) {
  document.getElementById('content-inner').innerHTML = html;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// Minimal Markdown: bold, italic, code, blockquote, line breaks, links
function markdownToHtml(md) {
  if (!md) return '';
  let html = String(md)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // Restore $ for MathJax (don't escape them)
    ;
  // We need raw $ in the output for MathJax, so we do a different approach:
  // Just pass through as-is but escape HTML entities that aren't math
  html = String(md);
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`.replace(/<p><\/p>/g,'');
}

function typeset() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([document.getElementById('content-inner')]).catch(()=>{});
  }
}

// ── Start ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
