import './base.css';
import './style.css';
import { h, uid, langToggle, icon, showSaveBanner, hideSaveBanner, confirmDialog } from './ui';
import { initDb, loadState, saveState } from './db';
import { dicts, type Lang, type Dict } from './i18n';
import { daysUntil, level, type Level } from './dates';

type Proc = '' | 'renew' | 'change';
interface Person {
  id: string;
  name: string;
  expiry: string;
  stayEnd: string;
  procedure: Proc;
  procedureDate: string;
  note: string;
}
interface State { lang: Lang; people: Person[] }

function blank(): Person {
  return { id: uid(), name: '', expiry: '', stayEnd: '', procedure: '', procedureDate: '', note: '' };
}
function fresh(): State {
  return { lang: 'ja', people: [] };
}
function isProc(v: unknown): v is Proc {
  return v === '' || v === 'renew' || v === 'change';
}
function sanitize(s: State): State {
  const people: Person[] = Array.isArray(s.people)
    ? s.people.filter((p) => p && typeof p.id === 'string').map((p) => ({
      id: p.id,
      name: typeof p.name === 'string' ? p.name : '',
      expiry: typeof p.expiry === 'string' ? p.expiry : '',
      stayEnd: typeof p.stayEnd === 'string' ? p.stayEnd : '',
      procedure: isProc(p.procedure) ? p.procedure : '',
      procedureDate: typeof p.procedureDate === 'string' ? p.procedureDate : '',
      note: typeof p.note === 'string' ? p.note : '',
    }))
    : [];
  return { lang: s.lang === 'en' ? 'en' : 'ja', people };
}

let state = fresh();
let t: Dict = dicts.ja;
let editing: string | null = null;
const app = document.getElementById('app')!;
let saveTimer = 0;

async function persist(): Promise<void> {
  const ok = await saveState(state);
  if (ok) hideSaveBanner();
  else showSaveBanner();
}
function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { void persist(); }, 250);
}
function setLang(l: Lang) {
  state.lang = l;
  t = dicts[l];
  document.documentElement.lang = l;
  document.title = t.app;
  void persist();
  render();
}
function personById(id: string): Person | undefined {
  return state.people.find((p) => p.id === id);
}
function procLabel(p: Proc): string {
  if (p === 'renew') return t.renew;
  if (p === 'change') return t.change;
  return t.procNone;
}
function countBlock(days: number | null): HTMLElement {
  if (days === null) {
    return h('div', {}, h('div', { class: 'word' }, t.noDate));
  }
  if (days === 0) {
    return h('div', {}, h('div', { class: 'num' }, '0'), h('div', { class: 'word' }, t.dueToday));
  }
  if (days > 0) {
    return h('div', {},
      h('div', { class: 'word' }, state.lang === 'ja' ? t.left : ''),
      h('div', { class: 'num' }, String(days)),
      h('div', { class: 'word' }, state.lang === 'ja' ? t.days : `${t.days} ${t.left}`),
    );
  }
  return h('div', {},
    h('div', { class: 'num' }, String(-days)),
    h('div', { class: 'word' }, `${t.overdue} · ${-days} ${t.days}`),
  );
}
function fmt(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return state.lang === 'ja' ? `${y}年${Number(m)}月${Number(d)}日` : iso;
}

async function removePerson(p: Person) {
  const ok = await confirmDialog(t.del, t.confirmDel, t.del, t.cancel, true);
  if (!ok) return;
  const idx = state.people.findIndex((x) => x.id === p.id);
  if (idx < 0) return;
  state.people.splice(idx, 1);
  editing = null;
  render();
  void persist();
}

function renderEditor(p: Person) {
  const name = h('input', { class: 'input', value: p.name, placeholder: t.namePh, 'aria-label': t.name, autocomplete: 'off' });
  const expiry = h('input', { class: 'input', type: 'date', value: p.expiry, 'aria-label': t.expiry });
  const stay = h('input', { class: 'input', type: 'date', value: p.stayEnd, 'aria-label': t.stayEnd });
  const proc = h('select', { class: 'input', 'aria-label': t.procedure },
    h('option', { value: '', selected: p.procedure === '' }, t.procNone),
    h('option', { value: 'renew', selected: p.procedure === 'renew' }, t.renew),
    h('option', { value: 'change', selected: p.procedure === 'change' }, t.change),
  );
  const procDate = h('input', { class: 'input', type: 'date', value: p.procedureDate, 'aria-label': t.procDate });
  const note = h('textarea', { class: 'input', 'aria-label': t.note, placeholder: t.notePh });
  note.value = p.note;
  const hero = h('div', { class: 'hero' });
  const paint = () => {
    const days = daysUntil(p.expiry);
    const lv: Level = level(days);
    hero.className = `hero ${lv}`;
    hero.replaceChildren(countBlock(days), days === null ? h('p', { class: 'muted sub' }, t.missing) : h('p', { class: 'sub' }, `${t.expiry}: ${fmt(p.expiry)}`));
  };
  const sync = () => {
    p.name = name.value;
    p.expiry = expiry.value;
    p.stayEnd = stay.value;
    p.procedure = isProc(proc.value) ? proc.value : '';
    p.procedureDate = procDate.value;
    p.note = note.value;
    paint();
    persistSoon();
  };
  for (const el of [name, expiry, stay, procDate, note]) el.addEventListener('input', sync);
  proc.addEventListener('change', () => {
    sync();
    render();
  });
  paint();
  const fields = [
    h('label', { class: 'field' }, t.name, name),
    h('label', { class: 'field' }, t.expiry, expiry),
    h('label', { class: 'field' }, t.stayEnd, stay),
    h('label', { class: 'field' }, t.procedure, proc),
    p.procedure ? h('label', { class: 'field' }, t.procDate, procDate) : null,
    h('label', { class: 'field' }, t.note, note),
    h('button', { class: 'btn danger block', type: 'button', onclick: () => { void removePerson(p); } }, t.del),
  ];
  app.replaceChildren(
    h('header', { class: 'topbar' },
      h('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': t.back,
        onclick: () => { sync(); editing = null; render(); void persist(); },
      }, icon('back')),
      h('h1', {}, t.app),
      langToggle(state.lang, (l) => { sync(); setLang(l); }),
    ),
    h('main', {},
      hero,
      ...fields,
      h('p', { class: 'foot' }, t.privacy),
    ),
  );
}

function renderList() {
  const sorted = state.people.slice().sort((a, b) => {
    const da = daysUntil(a.expiry);
    const db = daysUntil(b.expiry);
    return (da ?? 99999) - (db ?? 99999);
  });
  const list = sorted.length
    ? sorted.map((p) => {
      const days = daysUntil(p.expiry);
      const btn = h('button', { class: `person ${level(days)}`, type: 'button' },
        h('div', { class: 'who' }, p.name.trim() || t.unnamed),
        countBlock(days),
        p.expiry ? h('p', { class: 'sub' }, `${t.expiry}: ${fmt(p.expiry)}`) : null,
        p.stayEnd ? h('p', { class: 'muted sub' }, `${t.stay}: ${fmt(p.stayEnd)}（${daysUntil(p.stayEnd) ?? '—'}）`) : null,
        p.procedure ? h('p', { class: 'muted sub' }, `${t.next}: ${procLabel(p.procedure)}${p.procedureDate ? ' · ' + fmt(p.procedureDate) : ''}`) : null,
        p.note.trim() ? h('p', { class: 'sub' }, p.note) : null,
      );
      btn.addEventListener('click', () => { editing = p.id; render(); });
      return btn;
    })
    : [h('section', { class: 'card' }, h('h2', { style: 'margin:0 0 6px' }, t.emptyTitle), h('p', { class: 'muted', style: 'margin:0' }, t.emptyBody))];

  app.replaceChildren(
    h('header', { class: 'topbar' },
      h('h1', {}, t.app),
      langToggle(state.lang, setLang),
    ),
    h('main', {},
      h('p', { class: 'info' }, t.info),
      ...list,
      h('button', {
        class: 'btn primary block',
        type: 'button',
        onclick: () => {
          const p = blank();
          state.people.push(p);
          editing = p.id;
          render();
          void persist();
        },
      }, t.add),
      h('p', { class: 'note muted small' }, t.legend),
      h('p', { class: 'foot' }, t.privacy),
    ),
  );
}

function render() {
  t = dicts[state.lang];
  const current = editing ? personById(editing) : undefined;
  if (current) renderEditor(current);
  else renderList();
}

async function boot() {
  const ok = await initDb('zairyu-reminder');
  if (!ok) showSaveBanner();
  state = sanitize(await loadState(fresh()));
  t = dicts[state.lang];
  document.documentElement.lang = state.lang;
  document.title = t.app;
  render();
  window.addEventListener('pagehide', () => { void persist(); });
}
void boot();
