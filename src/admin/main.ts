import './admin.css';
import { API_BASE, DEFAULT_CONTENT } from '../content';
import { JOURNEY_SLOTS, LIMITS, type JourneySlot, type PhotoImage, type PhotoItem, type SiteContent } from '../types';
import { validateContent, ContentError } from '../validate';
import { processImage, titleFromFile } from './image';

// The admin always runs on the Netlify site (where the API lives). A copy hosted elsewhere forwards there.
if (API_BASE && location.origin !== API_BASE) location.replace(`${API_BASE}/admin/`);

/* ---------------- helpers ---------------- */
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** Built-in photos live at the site root (one level up from /admin/); uploads come from the API. */
const resolveUrl = (u: string) => (u.startsWith('/api/') ? `${API_BASE}${u}` : `../${u}`);
const pos = (img: PhotoImage) => `${(img.focus[0] * 100).toFixed(1)}% ${(img.focus[1] * 100).toFixed(1)}%`;
const SLOT_LABEL: Record<JourneySlot, string> = { street: 'Street', portraits: 'Portraits', vintage: 'Creative Vintage', nature: 'Nature', concerts: 'Concerts' };
const SLOT_NUM: Record<JourneySlot, string> = { street: '01', portraits: '02', vintage: '03', nature: '04', concerts: '05' };

function toast(msg: string, kind: 'ok' | 'error' | 'info' = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ---------------- session ---------------- */
const TOKEN_KEY = 'prasant-studio-session';
type Session = { token: string; expires: number };
function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as Session | null;
    return s && s.expires > Date.now() + 60_000 ? s : null;
  } catch { return null; }
}
function setSession(s: Session | null) {
  try { if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s)); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const s = getSession();
  if (s) headers.set('authorization', `Bearer ${s.token}`);
  if (init.body && typeof init.body === 'string') headers.set('content-type', 'application/json');
  let res: Response;
  try { res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' }); }
  catch { throw new ApiError('No connection. Check your internet and try again.', 0); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') { setSession(null); showLogin('Your session ended. Please sign in again.'); }
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Something went wrong (${res.status}).`, res.status);
  return data as T;
}

/** Upload with progress (fetch has no upload progress events). */
function upload(form: FormData, onProgress: (p: number) => void): Promise<{ id: string; src: string; md: string; sm: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload`);
    const s = getSession();
    if (s) xhr.setRequestHeader('authorization', `Bearer ${s.token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError('Upload failed: no connection.', 0));
    xhr.onload = () => {
      let data: { error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 401) { setSession(null); showLogin('Your session ended. Please sign in again.'); }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as never);
      else reject(new ApiError(data.error ?? `Upload failed (${xhr.status}).`, xhr.status));
    };
    xhr.send(form);
  });
}

/* ---------------- state ---------------- */
let published: SiteContent = clone(DEFAULT_CONTENT);
let draft: SiteContent = clone(DEFAULT_CONTENT);
let tab: 'collections' | 'frames' | 'featured' | 'journey' | 'text' = 'collections';
let busy = false;

const isDirty = () => JSON.stringify(draft) !== JSON.stringify(published);

function setStatus() {
  const st = $('status');
  if (busy) { st.dataset.state = 'busy'; $('statusText').textContent = 'Working…'; }
  else if (isDirty()) { st.dataset.state = 'dirty'; $('statusText').textContent = 'Unpublished changes'; }
  else {
    st.dataset.state = 'saved';
    const when = new Date(published.updatedAt);
    $('statusText').textContent = when.getTime() > 0 ? `All changes are live · published ${when.toLocaleString()}` : 'All changes are live';
  }
  ($('publishBtn') as HTMLButtonElement).disabled = busy || !isDirty();
  ($('discardBtn') as HTMLButtonElement).disabled = busy || !isDirty();
  $('countCollections').textContent = String(draft.collections.length);
  $('countFrames').textContent = String(draft.frames.length);
}

/** Where a photo id is already used (for duplicate protection). */
function whereUsed(id: string): string | null {
  for (const s of JOURNEY_SLOTS) if (draft.journey[s]?.img.id === id) return `Journey · ${SLOT_LABEL[s]}`;
  if (draft.featured.some((i) => i.img.id === id)) return 'Featured';
  if (draft.collections.some((i) => i.img.id === id)) return 'Collections';
  if (draft.frames.some((i) => i.img.id === id)) return 'Pujo Nights ring';
  return null;
}

/* ---------------- views ---------------- */
function showLogin(message = '') {
  $('appView').hidden = true;
  $('loginView').hidden = false;
  $('loginError').textContent = message;
  setTimeout(() => $('loginEmail').focus(), 50);
}

async function showApp() {
  $('loginView').hidden = true;
  $('appView').hidden = false;
  busy = true; setStatus();
  try {
    published = validateContent(await api<SiteContent>('/api/content'));
    draft = clone(published);
  } catch (err) {
    toast(`Could not load the current site: ${(err as Error).message}`, 'error');
  } finally {
    busy = false;
    render();
  }
}

function photoCard(item: PhotoItem, ref: string, index: number | null, opts: { remove?: boolean; move?: boolean; label?: string }): string {
  return `
  <article class="card" data-ref="${ref}" ${opts.move ? 'draggable="true"' : ''}>
    <div class="card__media" data-action="frame" title="Adjust framing">
      <img src="${resolveUrl(item.img.sm)}" alt="" loading="lazy" style="object-position:${pos(item.img)};background:${item.img.color} url(${item.img.lqip}) center/cover" />
      ${index !== null ? `<span class="card__index">${String(index + 1).padStart(2, '0')}</span>` : ''}
      <button class="btn btn--sm card__frame" data-action="frame">Framing</button>
    </div>
    <div class="card__body">
      ${opts.label ? `<span class="card__label">${esc(opts.label)}</span>` : ''}
      <input type="text" data-field="title" value="${esc(item.title)}" maxlength="${LIMITS.title}" placeholder="Title" aria-label="Title" />
      <input type="text" data-field="type" value="${esc(item.type ?? '')}" maxlength="${LIMITS.type}" placeholder="Subtitle (optional)" aria-label="Subtitle" />
      <div class="card__actions">
        <button class="btn btn--sm" data-action="replace">Replace</button>
        ${opts.move ? `<button class="btn btn--sm" data-action="left" aria-label="Move earlier">←</button><button class="btn btn--sm" data-action="right" aria-label="Move later">→</button>` : ''}
        ${opts.remove ? `<button class="btn btn--sm btn--danger" data-action="remove">Remove</button>` : ''}
      </div>
    </div>
  </article>`;
}

function render() {
  document.querySelectorAll<HTMLButtonElement>('#tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const panel = $('panel');
  if (tab === 'collections' || tab === 'frames') {
    const list = draft[tab];
    const lim = LIMITS[tab];
    const title = tab === 'collections' ? 'Collections' : 'Pujo Nights ring';
    const desc = tab === 'collections'
      ? 'The curved 3D gallery. Drag cards (or use the arrows) to change the order.'
      : `The rotating 3D ring. ${lim.min}–${lim.max} photos; 6 makes a perfect hexagon.`;
    panel.innerHTML = `
      <div class="panel__head"><div><h2>${title}</h2><p class="muted">${desc}</p></div></div>
      <div class="drop" id="drop">
        <span>Drop photos here, or</span>
        <button class="btn btn--primary btn--sm" data-action="add" ${list.length >= lim.max ? 'disabled' : ''}>Add photos</button>
        <span class="muted">${list.length} of max ${lim.max}</span>
      </div>
      <div class="grid" id="grid">${list.map((it, i) => photoCard(it, `${tab}:${i}`, i, { remove: list.length > lim.min, move: true })).join('')}</div>`;
  } else if (tab === 'featured') {
    panel.innerHTML = `
      <div class="panel__head"><div><h2>Featured</h2><p class="muted">The three cards that fly together. The middle card is the largest.</p></div></div>
      <div class="grid">${draft.featured.map((it, i) => photoCard(it, `featured:${i}`, null, { label: ['Left card', 'Centre card (large)', 'Right card'][i] })).join('')}</div>`;
  } else if (tab === 'journey') {
    panel.innerHTML = `
      <div class="panel__head"><div><h2>Journey</h2><p class="muted">One photo per chapter. A chapter without a photo shows its big number instead.</p></div></div>
      <div class="grid">${JOURNEY_SLOTS.map((s) => {
        const it = draft.journey[s];
        if (it) return photoCard(it, `journey:${s}`, null, { remove: true, label: `Chapter ${SLOT_NUM[s]} · ${SLOT_LABEL[s]}` });
        return `<article class="card" data-ref="journey:${s}">
          <div class="card__empty"><div><b>${SLOT_NUM[s]}</b>No photo yet</div></div>
          <div class="card__body"><span class="card__label">Chapter ${SLOT_NUM[s]} · ${SLOT_LABEL[s]}</span>
          <div class="card__actions"><button class="btn btn--sm btn--primary" data-action="replace">Choose photo</button></div></div>
        </article>`;
      }).join('')}</div>`;
  } else {
    panel.innerHTML = `
      <div class="panel__head"><div><h2>Words</h2><p class="muted">Text shown on the home screen and in the About section.</p></div></div>
      <div class="words">
        <label for="tHero">Home screen line</label>
        <textarea id="tHero" data-text="heroLead" maxlength="${LIMITS.heroLead}" rows="2">${esc(draft.text.heroLead)}</textarea>
        <p class="counter" data-counter="heroLead"></p>
        <label for="tAbout">About me</label>
        <textarea id="tAbout" data-text="aboutBody" maxlength="${LIMITS.aboutBody}" rows="7">${esc(draft.text.aboutBody)}</textarea>
        <p class="counter" data-counter="aboutBody"></p>
      </div>`;
    updateCounters();
  }
  setStatus();
}

function updateCounters() {
  document.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
    const k = el.dataset.counter as 'heroLead' | 'aboutBody';
    el.textContent = `${draft.text[k].length} / ${LIMITS[k]}`;
  });
}

/* ---------------- item refs ---------------- */
type Ref = { kind: 'collections' | 'frames' | 'featured'; index: number } | { kind: 'journey'; slot: JourneySlot };
function parseRef(ref: string): Ref {
  const [kind, key] = ref.split(':');
  if (kind === 'journey') return { kind, slot: key as JourneySlot };
  return { kind: kind as 'collections' | 'frames' | 'featured', index: Number(key) };
}
function getItem(r: Ref): PhotoItem | null { return r.kind === 'journey' ? draft.journey[r.slot] : draft[r.kind][r.index] ?? null; }
function setItem(r: Ref, it: PhotoItem | null) {
  if (r.kind === 'journey') draft.journey[r.slot] = it;
  else if (it) draft[r.kind][r.index] = it;
}

/* ---------------- uploads ---------------- */
async function uploadFile(file: File, onProgress: (p: number) => void): Promise<PhotoImage> {
  const p = await processImage(file);
  const form = new FormData();
  form.append('full', p.full, `full.${p.ext}`);
  form.append('md', p.md, `md.${p.ext}`);
  form.append('sm', p.sm, `sm.${p.ext}`);
  const r = await upload(form, onProgress);
  return { id: r.id, src: r.src, md: r.md, sm: r.sm, w: p.w, h: p.h, lqip: p.lqip, color: p.color, focus: [0.5, 0.42] };
}

function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = $<HTMLInputElement>('fileInput');
    input.multiple = multiple;
    input.value = '';
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.click();
  });
}

async function addPhotos(files: File[]) {
  if (tab !== 'collections' && tab !== 'frames') return;
  const list = draft[tab];
  const room = LIMITS[tab].max - list.length;
  if (room <= 0) { toast(`This section already has the maximum of ${LIMITS[tab].max} photos.`, 'error'); return; }
  const take = files.slice(0, room);
  if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} fit here; the rest were skipped.`, 'info');
  busy = true; setStatus();
  const drop = document.getElementById('drop');
  let added = 0;
  for (const [n, file] of take.entries()) {
    if (drop) drop.innerHTML = `<span>Uploading ${n + 1} of ${take.length}: ${esc(file.name)}</span><span class="muted" id="pct">0%</span>`;
    try {
      const img = await uploadFile(file, (p) => { const el = document.getElementById('pct'); if (el) el.textContent = `${Math.round(p * 100)}%`; });
      const used = whereUsed(img.id);
      if (used) { toast(`${file.name} is already on the site (${used}). Each photo can be used once.`, 'error', 6000); continue; }
      list.push({ img, title: titleFromFile(file.name) });
      added++;
    } catch (err) {
      toast((err as Error).message, 'error', 6000);
      if ((err as ApiError).status === 401) break;
    }
  }
  busy = false;
  render();
  if (added) toast(`Added ${added} photo${added === 1 ? '' : 's'}. Press Publish to put ${added === 1 ? 'it' : 'them'} on the website.`, 'ok');
}

async function replacePhoto(ref: string) {
  const [file] = await pickFiles(false);
  if (!file) return;
  const r = parseRef(ref);
  busy = true; setStatus();
  const card = document.querySelector<HTMLElement>(`[data-ref="${ref}"]`);
  card?.classList.add('is-uploading');
  card?.querySelector('.card__media, .card__empty')?.insertAdjacentHTML('beforeend', '<div class="progress"><i></i></div>');
  try {
    const img = await uploadFile(file, (p) => { const bar = card?.querySelector<HTMLElement>('.progress i'); if (bar) bar.style.width = `${p * 100}%`; });
    const current = getItem(r);
    const used = whereUsed(img.id);
    if (used && current?.img.id !== img.id) { toast(`That photo is already on the site (${used}). Each photo can be used once.`, 'error', 6000); return; }
    setItem(r, { title: current?.title ?? titleFromFile(file.name), ...(current?.type ? { type: current.type } : {}), img });
    toast('Photo replaced. Press Publish to update the website.', 'ok');
  } catch (err) {
    toast((err as Error).message, 'error', 6000);
  } finally {
    busy = false;
    render();
  }
}

/* ---------------- framing editor ---------------- */
let focusRef: Ref | null = null;
let focusValue: [number, number] = [0.5, 0.5];
function openFocus(ref: string) {
  const r = parseRef(ref);
  const it = getItem(r);
  if (!it) return;
  focusRef = r;
  focusValue = [...it.img.focus] as [number, number];
  const url = resolveUrl(it.img.md);
  $<HTMLImageElement>('focusImg').src = url;
  document.querySelectorAll<HTMLImageElement>('.focus__previews img').forEach((img) => { img.src = url; });
  $('focusTitle').textContent = `Adjust framing · ${it.title}`;
  $('focusModal').hidden = false;
  paintFocus();
}
function paintFocus() {
  const dot = $('focusDot');
  dot.style.left = `${focusValue[0] * 100}%`;
  dot.style.top = `${focusValue[1] * 100}%`;
  const p = `${(focusValue[0] * 100).toFixed(1)}% ${(focusValue[1] * 100).toFixed(1)}%`;
  document.querySelectorAll<HTMLImageElement>('.focus__previews img').forEach((img) => { img.style.objectPosition = p; });
}
function setFocusFromEvent(e: PointerEvent) {
  const r = $<HTMLImageElement>('focusImg').getBoundingClientRect();
  focusValue = [
    Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 1000) / 1000,
    Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 1000) / 1000,
  ];
  paintFocus();
}
const stage = $('focusStage');
let dragging = false;
stage.addEventListener('pointerdown', (e) => { dragging = true; stage.setPointerCapture(e.pointerId); setFocusFromEvent(e); });
stage.addEventListener('pointermove', (e) => { if (dragging) setFocusFromEvent(e); });
stage.addEventListener('pointerup', () => { dragging = false; });
$('focusReset').addEventListener('click', () => { focusValue = [0.5, 0.5]; paintFocus(); });
$('focusSave').addEventListener('click', () => {
  if (focusRef) {
    const it = getItem(focusRef);
    if (it) it.img.focus = focusValue;
  }
  $('focusModal').hidden = true;
  render();
});

/* ---------------- events ---------------- */
$('tabs').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab as typeof tab;
  render();
});

$('panel').addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!btn || busy) return;
  const action = btn.dataset.action;
  if (action === 'add') { await addPhotos(await pickFiles(true)); return; }
  const ref = btn.closest<HTMLElement>('[data-ref]')?.dataset.ref;
  if (!ref) return;
  const r = parseRef(ref);
  if (action === 'frame') openFocus(ref);
  else if (action === 'replace') await replacePhoto(ref);
  else if (action === 'remove') {
    const it = getItem(r);
    if (!it || !window.confirm(`Remove “${it.title}” from this section?`)) return;
    if (r.kind === 'journey') draft.journey[r.slot] = null;
    else if (r.kind !== 'featured') draft[r.kind].splice(r.index, 1);
    render();
  } else if ((action === 'left' || action === 'right') && (r.kind === 'collections' || r.kind === 'frames')) {
    const list = draft[r.kind];
    const to = r.index + (action === 'left' ? -1 : 1);
    if (to < 0 || to >= list.length) return;
    [list[r.index], list[to]] = [list[to], list[r.index]];
    render();
  }
});

// title / subtitle / words edits
$('panel').addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (el.dataset.text) {
    draft.text[el.dataset.text as 'heroLead' | 'aboutBody'] = el.value;
    updateCounters(); setStatus(); return;
  }
  const field = el.dataset.field as 'title' | 'type' | undefined;
  const ref = el.closest<HTMLElement>('[data-ref]')?.dataset.ref;
  if (!field || !ref) return;
  const it = getItem(parseRef(ref));
  if (!it) return;
  if (field === 'type') { if (el.value.trim()) it.type = el.value; else delete it.type; }
  else it.title = el.value;
  setStatus();
});

// drag to reorder
let dragRef: string | null = null;
$('panel').addEventListener('dragstart', (e) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.card[draggable]');
  if (!card) return;
  dragRef = card.dataset.ref ?? null;
  card.classList.add('is-dragging');
  e.dataTransfer?.setData('text/plain', dragRef ?? '');
});
$('panel').addEventListener('dragover', (e) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.card[draggable]');
  const files = e.dataTransfer?.types.includes('Files');
  if (card && dragRef) { e.preventDefault(); document.querySelectorAll('.is-drop-target').forEach((c) => c.classList.remove('is-drop-target')); card.classList.add('is-drop-target'); }
  else if (files) { e.preventDefault(); document.getElementById('drop')?.classList.add('is-over'); }
});
$('panel').addEventListener('dragleave', (e) => {
  if (!(e.relatedTarget as HTMLElement | null)?.closest?.('#panel')) document.getElementById('drop')?.classList.remove('is-over');
});
$('panel').addEventListener('drop', async (e) => {
  document.getElementById('drop')?.classList.remove('is-over');
  const card = (e.target as HTMLElement).closest<HTMLElement>('.card[draggable]');
  if (dragRef && card?.dataset.ref) {
    e.preventDefault();
    const a = parseRef(dragRef), b = parseRef(card.dataset.ref);
    if (a.kind === b.kind && (a.kind === 'collections' || a.kind === 'frames') && 'index' in b) {
      const list = draft[a.kind];
      const [moved] = list.splice(a.index, 1);
      list.splice(b.index, 0, moved);
      render();
    }
    return;
  }
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); if (!busy) await addPhotos(files); }
});
$('panel').addEventListener('dragend', () => {
  dragRef = null;
  document.querySelectorAll('.is-dragging, .is-drop-target').forEach((c) => c.classList.remove('is-dragging', 'is-drop-target'));
});

// publish / discard
$('publishBtn').addEventListener('click', async () => {
  let clean: SiteContent;
  try { clean = validateContent(draft); }
  catch (err) { toast(err instanceof ContentError ? err.message : 'Something is not right with the content.', 'error', 7000); return; }
  busy = true; setStatus();
  try {
    published = validateContent(await api<SiteContent>('/api/content', { method: 'PUT', body: JSON.stringify(clean) }));
    draft = clone(published);
    toast('Published. The website now shows your changes.', 'ok');
  } catch (err) {
    toast((err as Error).message, 'error', 7000);
  } finally {
    busy = false;
    render();
  }
});
$('discardBtn').addEventListener('click', () => {
  if (!window.confirm('Discard all unpublished changes?')) return;
  draft = clone(published);
  render();
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

// modals
document.querySelectorAll<HTMLElement>('.modal').forEach((m) => {
  m.addEventListener('click', (e) => { if (e.target === m || (e.target as HTMLElement).closest('[data-close]')) m.hidden = true; });
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll<HTMLElement>('.modal').forEach((m) => { m.hidden = true; }); });

// account menu
$('menuBtn').addEventListener('click', () => {
  const open = $('menuList').hidden;
  $('menuList').hidden = !open;
  $('menuBtn').setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.menu')) $('menuList').hidden = true; });
$('logoutBtn').addEventListener('click', () => {
  if (isDirty() && !window.confirm('You have unpublished changes. Sign out anyway?')) return;
  setSession(null);
  draft = clone(published);
  showLogin('You are signed out.');
});
$('pwBtn').addEventListener('click', () => {
  $('menuList').hidden = true;
  $('pwError').textContent = '';
  ($('pwForm') as HTMLFormElement).reset();
  $('pwModal').hidden = false;
  setTimeout(() => $('pwCurrent').focus(), 50);
});
$('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = $<HTMLInputElement>('pwCurrent').value;
  const next = $<HTMLInputElement>('pwNext').value;
  if (next.length < 8) { $('pwError').textContent = 'Use at least 8 characters for the new password.'; return; }
  ($('pwSave') as HTMLButtonElement).disabled = true;
  try {
    setSession(await api<Session>('/api/password', { method: 'POST', body: JSON.stringify({ current, next }) }));
    $('pwModal').hidden = true;
    toast('Password changed.', 'ok');
  } catch (err) {
    $('pwError').textContent = (err as Error).message;
  } finally {
    ($('pwSave') as HTMLButtonElement).disabled = false;
  }
});

// sign in
$('pwToggle').addEventListener('click', () => {
  const input = $<HTMLInputElement>('loginPassword');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('pwToggle').textContent = show ? 'Hide' : 'Show';
});
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $<HTMLInputElement>('loginEmail').value.trim();
  const password = $<HTMLInputElement>('loginPassword').value;
  if (!email || !password) { $('loginError').textContent = 'Enter your email and password.'; return; }
  const btn = $<HTMLButtonElement>('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    setSession(await api<Session>('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
    $<HTMLInputElement>('loginPassword').value = '';
    await showApp();
  } catch (err) {
    $('loginError').textContent = (err as Error).message;
  } finally {
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

/* ---------------- boot ---------------- */
(async () => {
  if (!getSession()) { showLogin(); return; }
  try { await api('/api/session'); await showApp(); }
  catch { showLogin(); }
})();
