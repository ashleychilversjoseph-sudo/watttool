import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode } from 'react';
import {
  Activity, Archive, ArrowLeft, BookOpen, BriefcaseBusiness, Cable, Calculator, Camera, Check,
  ChevronRight, ClipboardList, CookingPot, Download, Fan, FileDown, Flashlight, Gauge, HardDriveDownload,
  Home, Images, Lightbulb, Menu, Moon, NotebookPen, Pencil, Pin, Plus, RotateCcw,
  Search, Settings, Share2, ShieldCheck, Sigma, Sparkles, Sun, Trash2, TrendingDown,
  Waypoints, Wrench, X, Zap,
} from 'lucide-react';
import { z } from 'zod';
import { calculatorById, calculators } from './lib/calculators';
import { preparePhoto } from './lib/images';
import { createJobPdf, saveOrSharePdf } from './lib/pdf';
import { defaultData, exportData, importData, loadData, saveData } from './lib/storage';
import { setTorch } from './lib/torch';
import type { AppData, CalculationResult, CalculatorDefinition, Job, JobEntry, NavTab, Note } from './types';

const iconMap = { Activity, Cable, Calculator, CookingPot, Fan, Gauge, Lightbulb, ShieldCheck, Sigma, TrendingDown, Waypoints, Zap };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const today = () => new Date().toISOString().slice(0, 10);

function ToolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? Wrench;
  return <Icon size={size} strokeWidth={1.9} />;
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        {children}
      </section>
    </div>
  );
}

function PhotoViewer({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  return <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}><button aria-label="Close photo"><X /></button><img src={src} alt={label} onClick={(event) => event.stopPropagation()} /><span>{label}</span></div>;
}

function SignatureEditor({ job, onClose, onSave }: { job: Job; onClose: () => void; onSave: (job: Job) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(job.signedBy ?? '');
  const [date, setDate] = useState(job.signedDate ?? today());
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext('2d'); if (!context) return; context.scale(ratio, ratio); context.strokeStyle = '#d7c0ff'; context.lineWidth = 2.2; context.lineCap = 'round'; context.lineJoin = 'round';
    if (job.signatureDataUrl) { const image = new Image(); image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height); image.src = job.signatureDataUrl; }
  }, [job.signatureDataUrl]);
  const point = (event: PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const start = (event: PointerEvent<HTMLCanvasElement>) => { const context = event.currentTarget.getContext('2d'); if (!context) return; event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); setDrawing(true); };
  const move = (event: PointerEvent<HTMLCanvasElement>) => { if (!drawing) return; const context = event.currentTarget.getContext('2d'); if (!context) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); };
  const clear = () => { const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height); };
  const save = () => { if (name.trim().length < 2) return; onSave({ ...job, signedBy: name.trim(), signedDate: date, signatureDataUrl: canvasRef.current?.toDataURL('image/png'), updatedAt: new Date().toISOString() }); };
  return <Modal title="Sign calculation record" onClose={onClose}><div className="signature-form"><label className="field"><span>Signed by *</span><div className="input-wrap"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" /></div></label><label className="field"><span>Date</span><div className="input-wrap"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></label><div className="signature-label"><span>Signature</span><button onClick={clear}>Clear</button></div><canvas ref={canvasRef} className="signature-pad" onPointerDown={start} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} /><p className="signature-note">This signs the calculation record only. It does not turn it into an electrical certificate.</p><button className="primary-button full" disabled={name.trim().length < 2} onClick={save}><Pencil size={17} /> Save signature</button></div></Modal>;
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading WATTtool">
      <strong>WATT<em>tool</em></strong>
      <span>Smart tools for the trade</span>
      <i aria-hidden="true" />
    </div>
  );
}

function Disclaimer({ accept }: { accept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Modal onClose={() => undefined} title="Before you start">
      <div className="disclaimer-mark"><ShieldCheck /><span>Use professional judgement</span></div>
      <p className="muted-copy">WATTtool is an educational calculation and record-keeping aid. Results are indicative and must be checked by a competent person against current regulations, manufacturer data, and on-site conditions.</p>
      <p className="muted-copy">It does not perform inspection or testing and does not create an electrical certificate.</p>
      <label className="consent-row"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>I understand that results require independent verification before they are used.</span></label>
      <button className="primary-button full" disabled={!checked} onClick={accept}>Continue <ChevronRight size={18} /></button>
    </Modal>
  );
}

function ToolCard({ tool, onOpen, pinned, onPin }: { tool: CalculatorDefinition; onOpen: () => void; pinned?: boolean; onPin?: () => void }) {
  return (
    <article className="tool-card" style={{ '--accent': tool.accent } as CSSProperties}>
      <button className="tool-main" onClick={onOpen} aria-label={`${tool.title}: ${tool.subtitle}`}>
        <span className="tool-icon"><ToolIcon name={tool.icon} /></span>
        <span><strong>{tool.title}</strong><small>{tool.subtitle}</small></span>
        <ChevronRight size={18} />
      </button>
      {onPin && <button className={`pin-button ${pinned ? 'active' : ''}`} onClick={onPin} aria-label={pinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}><Pin size={15} fill={pinned ? 'currentColor' : 'none'} /></button>}
    </article>
  );
}

function HomePage({ data, openTool, navigate, togglePin, toggleTheme, torchOn, toggleTorch }: { data: AppData; openTool: (id: string) => void; navigate: (tab: NavTab) => void; togglePin: (id: string) => void; toggleTheme: () => void; torchOn: boolean; toggleTorch: () => void }) {
  const [query, setQuery] = useState('');
  const matches = calculators.filter((tool) => `${tool.title} ${tool.subtitle}`.toLowerCase().includes(query.toLowerCase()));
  const pinned = data.pinnedTools.map(calculatorById).filter(Boolean) as CalculatorDefinition[];
  return (
    <main className="page home-page">
      <header className="hero-header">
        <div><span className="eyebrow"><Sparkles size={14} /> WATTtool</span><h1>Good to go.</h1><p>Smart tools for the trade.</p></div>
      </header>

      <div className="quick-controls" aria-label="Site controls">
        <button className={torchOn ? 'active' : ''} onClick={toggleTorch} aria-pressed={torchOn}><Flashlight size={21} /><span>Torch <small>{torchOn ? 'On' : 'Off'}</small></span></button>
        <button onClick={toggleTheme} aria-label={data.theme === 'light' ? 'Switch to night mode' : 'Switch to day mode'}>{data.theme === 'light' ? <Moon size={21} /> : <Sun size={21} />}<span>{data.theme === 'light' ? 'Night mode' : 'Day mode'}<small>Switch appearance</small></span></button>
      </div>

      <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search calculators…" /></label>
      {query ? (
        <section><div className="section-title"><h2>Search results</h2><span>{matches.length}</span></div><div className="tool-grid">{matches.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={() => openTool(tool.id)} pinned={data.pinnedTools.includes(tool.id)} onPin={() => togglePin(tool.id)} />)}</div></section>
      ) : (
        <>
          <section>
            <div className="section-title"><h2>Quick access</h2><button onClick={() => navigate('tools')}>Edit</button></div>
            <div className="quick-scroll">{pinned.map((tool) => <button key={tool.id} className="quick-card" onClick={() => openTool(tool.id)} style={{ '--accent': tool.accent } as CSSProperties}><ToolIcon name={tool.icon} size={22} /><strong>{tool.title}</strong><small>{tool.subtitle}</small></button>)}</div>
          </section>
          <section>
            <div className="section-title"><h2>Popular tools</h2><button onClick={() => navigate('tools')}>View all</button></div>
            <div className="tool-grid">{calculators.slice(0, 4).map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={() => openTool(tool.id)} />)}</div>
          </section>
          <section className="stats-card">
            <div><BriefcaseBusiness /><span><strong>{data.jobs.length}</strong> saved jobs</span></div>
            <div><NotebookPen /><span><strong>{data.notes.length}</strong> notes</span></div>
          </section>
          <aside className="safety-card"><ShieldCheck /><div><strong>Designed for double-checking</strong><p>Every result shows the assumptions and working values you need to verify.</p></div></aside>
        </>
      )}
    </main>
  );
}

function ToolsPage({ data, openTool, togglePin }: { data: AppData; openTool: (id: string) => void; togglePin: (id: string) => void }) {
  const [filter, setFilter] = useState('All');
  const shown = filter === 'All' ? calculators : calculators.filter((tool) => tool.category === filter);
  return (
    <main className="page"><div className="page-heading"><span className="eyebrow"><Wrench size={14} /> WATTtool</span><h1>Calculators</h1><p>Tap the pin to customise quick access.</p></div>
      <div className="filter-pills">{['All', 'Design', 'Testing', 'General'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="tool-grid">{shown.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={() => openTool(tool.id)} pinned={data.pinnedTools.includes(tool.id)} onPin={() => togglePin(tool.id)} />)}</div>
    </main>
  );
}

function ScientificCalculator({ onBack }: { onBack: () => void }) {
  const [expression, setExpression] = useState('');
  const [answer, setAnswer] = useState('0');
  const [degrees, setDegrees] = useState(true);
  const run = () => {
    try {
      const safe = expression.replace(/π/g, `(${Math.PI})`).replace(/√/g, 'sqrt').replace(/\^/g, '**');
      const identifiers = safe.match(/[a-z]+/gi) ?? [];
      if (identifiers.some((name) => !['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(name))) throw new Error('Invalid');
      if (!/^[0-9a-z+\-*/().\s*]+$/i.test(safe)) throw new Error('Invalid');
      const angle = (value: number) => degrees ? value * Math.PI / 180 : value;
      const value = Function('sin', 'cos', 'tan', 'log', 'ln', 'sqrt', `"use strict"; return (${safe})`)(
        (x: number) => Math.sin(angle(x)), (x: number) => Math.cos(angle(x)), (x: number) => Math.tan(angle(x)),
        (x: number) => Math.log10(x), (x: number) => Math.log(x), (x: number) => Math.sqrt(x),
      ) as number;
      if (!Number.isFinite(value)) throw new Error('Invalid');
      setAnswer(String(Number(value.toPrecision(12))));
    } catch { setAnswer('Check expression'); }
  };
  const functions = ['sin', 'cos', 'tan', 'log', 'ln', '√'];
  const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', 'π', '0', '.', '^', '⌫', '='];
  const press = (key: string) => {
    if (key === 'C') { setExpression(''); setAnswer('0'); return; }
    if (key === '⌫') { setExpression((value) => value.slice(0, -1)); return; }
    if (key === '=') { run(); return; }
    setExpression((value) => value + ({ '÷': '/', '×': '*', '−': '-', '√': '√(', sin: 'sin(', cos: 'cos(', tan: 'tan(', log: 'log(', ln: 'ln(' }[key] ?? key));
  };
  return <main className="page calculator-page"><button className="back-button" onClick={onBack}><ArrowLeft /> All calculators</button><div className="calc-title"><span className="tool-icon" style={{ '--accent': '#0c85ff' } as CSSProperties}><Calculator /></span><div><h1>Scientific calculator</h1><p>Fast site calculations</p></div></div><section className="scientific"><div className="scientific-mode"><span>Trigonometry</span><button onClick={() => setDegrees((value) => !value)}>{degrees ? 'DEG' : 'RAD'}</button></div><div className="scientific-display"><small>{expression || 'Ready'}</small><strong>{answer}</strong></div><div className="function-keys">{functions.map((key) => <button key={key} onClick={() => press(key)}>{key}</button>)}</div><div className="keypad">{keys.map((key) => <button key={key} className={key === '=' ? 'equals' : ''} onClick={() => press(key)}>{key}</button>)}</div></section></main>;
}

type DiversityCircuit = { id: string; type: string; value: string; unit: 'kW' | 'A'; factor: string };
const diversityTypes = [
  ['lighting', 'Lighting'], ['sockets', 'Socket-outlets BS 1363'], ['cook', 'Cooking appliance'], ['cookSocket', 'Cooking appliance + socket'],
  ['shower', 'Shower / instantaneous heater'], ['heating', 'Space or water heating'], ['heatpump', 'Heat pump'], ['ev', 'EV charger'],
  ['aircon', 'Air conditioning'], ['motors', 'Motors'], ['fixed', 'Fixed equipment'], ['custom', 'Custom circuit'],
] as const;

function DiversityCalculator({ onBack, onSave }: { onBack: () => void; onSave: (tool: CalculatorDefinition, result: CalculationResult) => void }) {
  const tool = calculatorById('diversity')!;
  const [phase, setPhase] = useState<'1' | '3'>('1');
  const [premises, setPremises] = useState('dwelling');
  const [utilisation, setUtilisation] = useState('1');
  const [draft, setDraft] = useState<Omit<DiversityCircuit, 'id'>>({ type: 'lighting', value: '6', unit: 'A', factor: '1' });
  const [circuits, setCircuits] = useState<DiversityCircuit[]>([]);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const addCircuit = () => {
    if (!(Number(draft.value) > 0)) return;
    setCircuits((items) => [...items, { ...draft, id: uid() }]);
    setDraft((value) => ({ ...value, value: '' })); setCalculation(null);
  };
  const calculate = () => {
    if (!circuits.length) return;
    const voltage = phase === '3' ? 400 * Math.sqrt(3) : 230;
    const groups = new Map<string, DiversityCircuit[]>(); circuits.forEach((circuit) => groups.set(circuit.type, [...(groups.get(circuit.type) ?? []), circuit]));
    let connected = 0; let diversified = 0; const rows: CalculationResult['rows'] = [];
    groups.forEach((items, type) => {
      items.sort((a, b) => Number(b.value) - Number(a.value));
      items.forEach((circuit, index) => {
        const kw = circuit.unit === 'kW' ? Number(circuit.value) : Number(circuit.value) * voltage / 1000;
        let factor = 1;
        if (type === 'lighting') factor = premises === 'dwelling' ? .66 : premises === 'shops' ? .9 : .75;
        else if (type === 'sockets') factor = index === 0 ? 1 : premises === 'dwelling' ? .4 : .75;
        else if (type === 'cook' || type === 'cookSocket') { const amps = kw * 1000 / 230; factor = (10 + Math.max(0, amps - 10) * .3 + (type === 'cookSocket' ? 5 : 0)) / amps; }
        else if (type === 'shower') factor = index < 2 ? 1 : .25;
        else if (type === 'heating' || type === 'motors') factor = index === 0 ? 1 : .75;
        else if (type === 'custom') factor = Math.max(0, Number(circuit.factor));
        connected += kw; diversified += kw * factor;
        rows.push({ label: diversityTypes.find(([key]) => key === type)?.[1] ?? type, value: `${fCalc(kw, 2)} kW × ${fCalc(factor, 2)} = ${fCalc(kw * factor, 2)} kW` });
      });
    });
    const uf = Math.max(0.01, Number(utilisation) || 1); const designKw = diversified * uf; const demand = designKw * 1000 / voltage; const connectedA = connected * 1000 / voltage; const cutout = [60, 80, 100].find((rating) => rating >= demand);
    setCalculation({ headline: `${fCalc(demand, 1)} A`, summary: cutout ? `${cutout} A supply cut-out carries the diversified demand` : 'Over 100 A · discuss the incoming supply with the DNO', rows: [
      ...rows, { label: 'Connected load', value: `${fCalc(connected, 2)} kW · ${fCalc(connectedA, 1)} A` }, { label: 'DL1 diversified load', value: `${fCalc(diversified, 2)} kW` },
      { label: 'DL2 rule of thumb (40%)', value: `${fCalc(connected * .4, 2)} kW` }, { label: `DL3 with utilisation factor ${fCalc(uf, 2)}`, value: `${fCalc(designKw, 2)} kW · ${fCalc(demand, 1)} A` },
    ], warning: 'Distribution equipment must still be rated for the full connected load. Confirm diversity against the current On-Site Guide and the installation.' });
  };
  return <main className="page calculator-page"><button className="back-button" onClick={onBack}><ArrowLeft /> All calculators</button>
    <div className="calc-title"><span className="tool-icon" style={{ '--accent': tool.accent } as CSSProperties}><Gauge /></span><div><span>Design</span><h1>Diversity</h1><p>Build a full board circuit by circuit</p></div></div>
    <section className="calculator-form diversity-builder"><div className="field-pair"><label className="field"><span>Supply</span><div className="input-wrap"><select value={phase} onChange={(e) => setPhase(e.target.value as '1' | '3')}><option value="1">230 V single phase</option><option value="3">400 V three phase</option></select></div></label><label className="field"><span>Premises</span><div className="input-wrap"><select value={premises} onChange={(e) => setPremises(e.target.value)}><option value="dwelling">Dwelling</option><option value="shops">Shops / offices</option><option value="hotels">Hotel / guest house</option></select></div></label></div>
      <label className="field"><span>Utilisation factor (DL3)</span><div className="input-wrap"><input type="number" min="0.01" step="0.01" value={utilisation} onChange={(e) => setUtilisation(e.target.value)} /></div></label>
      <div className="circuit-composer"><strong>Add a circuit</strong><label className="field"><span>Circuit type</span><div className="input-wrap"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>{diversityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></label><div className="field-pair"><label className="field"><span>Connected load</span><div className="input-wrap"><input type="number" min="0.01" step="any" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></div></label><label className="field"><span>Unit</span><div className="input-wrap"><select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as 'kW' | 'A' })}><option>A</option><option>kW</option></select></div></label></div>{draft.type === 'custom' && <label className="field"><span>Custom diversity factor</span><div className="input-wrap"><input type="number" min="0" step="0.01" value={draft.factor} onChange={(e) => setDraft({ ...draft, factor: e.target.value })} /></div></label>}<button className="secondary-button full" type="button" onClick={addCircuit}><Plus size={17} /> Add circuit</button></div>
      {circuits.length > 0 && <div className="circuit-list">{circuits.map((circuit, index) => <div key={circuit.id}><span><small>Circuit {index + 1}</small><strong>{diversityTypes.find(([key]) => key === circuit.type)?.[1]}</strong></span><b>{circuit.value} {circuit.unit}</b><button onClick={() => { setCircuits((items) => items.filter((item) => item.id !== circuit.id)); setCalculation(null); }} aria-label={`Remove circuit ${index + 1}`}><Trash2 size={16} /></button></div>)}</div>}
      <button className="primary-button full" type="button" disabled={!circuits.length} onClick={calculate}><Calculator size={18} /> Calculate board demand</button></section>
    {calculation && <section className="result-card" aria-live="polite"><span>Maximum demand</span><h2>{calculation.headline}</h2><p>{calculation.summary}</p><div className="result-rows">{calculation.rows.map((row, index) => <div key={`${row.label}-${index}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div>{calculation.warning && <aside><ShieldCheck size={18} /><span>{calculation.warning}</span></aside>}<div className="result-actions"><button className="secondary-button" onClick={() => { setCircuits([]); setCalculation(null); }}><RotateCcw size={17} /> Reset</button><button className="primary-button" onClick={() => onSave(tool, calculation)}><Archive size={17} /> Save to job</button></div></section>}
  </main>;
}

const fCalc = (value: number, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';

function CalculatorPage({ tool, onBack, onSave, initialValues, onCarryToZs }: { tool: CalculatorDefinition; onBack: () => void; onSave: (tool: CalculatorDefinition, result: CalculationResult) => void; initialValues?: Record<string, string>; onCarryToZs?: (value: string) => void }) {
  const initial = { ...Object.fromEntries(tool.fields.map((field) => [field.key, field.defaultValue ?? ''])), ...initialValues };
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const schema = useMemo(() => z.record(z.string(), z.string()).superRefine((input, ctx) => {
    tool.fields.forEach((field) => {
      const visible = !field.showWhen || (Array.isArray(field.showWhen.equals) ? field.showWhen.equals : [field.showWhen.equals]).includes(input[field.showWhen.key]);
      if (!visible) return;
      if (field.required !== false && !input[field.key]) ctx.addIssue({ code: 'custom', message: 'Required', path: [field.key] });
      if (input[field.key] && field.type !== 'select' && field.type !== 'checkbox' && field.type !== 'text') {
        const value = Number(input[field.key]);
        if (!Number.isFinite(value)) ctx.addIssue({ code: 'custom', message: 'Enter a valid number', path: [field.key] });
        if (field.min !== undefined && value < field.min) ctx.addIssue({ code: 'custom', message: `Minimum ${field.min}`, path: [field.key] });
        if (field.max !== undefined && value > field.max) ctx.addIssue({ code: 'custom', message: `Maximum ${field.max}`, path: [field.key] });
      }
    });
  }), [tool]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({}); setCalculation(tool.calculate(values));
  };
  const downlightParts = calculation?.rows.find((row) => row.label === 'Suggested grid')?.value.split('×').map((part) => Number(part.trim()));
  const downlightCount = downlightParts && downlightParts.length === 2 ? Math.min(36, downlightParts[0] * downlightParts[1]) : 0;
  return (
    <main className="page calculator-page"><button className="back-button" onClick={onBack}><ArrowLeft /> All calculators</button>
      <div className="calc-title"><span className="tool-icon" style={{ '--accent': tool.accent } as CSSProperties}><ToolIcon name={tool.icon} size={24} /></span><div><span>{tool.category}</span><h1>{tool.title}</h1><p>{tool.subtitle}</p></div></div>
      <form className="calculator-form" onSubmit={submit} noValidate>{tool.fields.map((field) => {
        const visible = !field.showWhen || (Array.isArray(field.showWhen.equals) ? field.showWhen.equals : [field.showWhen.equals]).includes(values[field.showWhen.key]);
        if (!visible) return null;
        if (field.type === 'checkbox') return <label className="toggle-field" key={field.key}><input type="checkbox" checked={values[field.key] === 'true'} onChange={(event) => setValues((state) => ({ ...state, [field.key]: String(event.target.checked) }))} /><span><i />{field.label}</span></label>;
        return <label className="field field-enter" key={field.key}><span>{field.label}</span><div className={errors[field.key] ? 'input-wrap invalid' : 'input-wrap'}>{field.type === 'select' ? <select value={values[field.key]} onChange={(event) => setValues((state) => ({ ...state, [field.key]: event.target.value }))}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input inputMode={field.type === 'text' ? 'text' : 'decimal'} type={field.type === 'text' ? 'text' : 'number'} min={field.min} max={field.max} step={field.step ?? 'any'} value={values[field.key]} placeholder={field.placeholder} onChange={(event) => setValues((state) => ({ ...state, [field.key]: event.target.value }))} />}{field.unit && <em>{field.unit}</em>}</div>{errors[field.key] && <small className="error-text">{errors[field.key]}</small>}</label>;
      })}
        <button className="primary-button full" type="submit"><Calculator size={18} /> Calculate</button></form>
      {calculation && <section className="result-card" aria-live="polite"><span>Result</span><h2>{calculation.headline}</h2><p>{calculation.summary}</p><div className="result-rows">{calculation.rows.map((row) => <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div>{tool.id === 'downlights' && downlightCount > 0 && <div className="downlight-layout" style={{ gridTemplateColumns: `repeat(${Math.min(8, downlightParts![0])}, 1fr)` }}>{Array.from({ length: downlightCount }, (_, index) => <i key={index}><Lightbulb size={12} /></i>)}</div>}{calculation.warning && <aside><ShieldCheck size={18} /><span>{calculation.warning}</span></aside>}{tool.id === 'r1r2' && onCarryToZs && <button className="carry-button" onClick={() => onCarryToZs(calculation.headline.replace(/[^0-9.]/g, ''))}><Activity size={17} /> Carry R1 + R2 into Zs check <ChevronRight size={17} /></button>}<div className="result-actions"><button className="secondary-button" onClick={() => { setCalculation(null); setValues(initial); }}><RotateCcw size={17} /> Reset</button><button className="primary-button" onClick={() => onSave(tool, calculation)}><Archive size={17} /> Save to job</button></div></section>}
    </main>
  );
}

const jobSchema = z.object({ name: z.string().trim().min(2, 'Enter a job name'), customer: z.string(), reference: z.string(), address: z.string(), date: z.string().min(1, 'Choose a date'), notes: z.string() });

function JobEditor({ entry, job: editingJob, jobs, onClose, onSave }: { entry?: JobEntry; job?: Job; jobs: Job[]; onClose: () => void; onSave: (job: Job) => void }) {
  const [existing, setExisting] = useState('');
  const [form, setForm] = useState({ name: editingJob?.name ?? '', customer: editingJob?.customer ?? '', reference: editingJob?.reference ?? '', address: editingJob?.address ?? '', date: editingJob?.date ?? today(), notes: editingJob?.notes ?? '' });
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (existing) {
      const job = jobs.find((item) => item.id === existing);
      if (job && entry) onSave({ ...job, entries: [...job.entries, entry], updatedAt: new Date().toISOString() });
      return;
    }
    const parsed = jobSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the form'); return; }
    const stamp = new Date().toISOString();
    onSave(editingJob ? { ...editingJob, ...parsed.data, updatedAt: stamp } : { id: uid(), ...parsed.data, entries: entry ? [entry] : [], photos: [], createdAt: stamp, updatedAt: stamp });
  };
  return <Modal title={editingJob ? 'Edit job' : entry ? 'Save calculation' : 'New job'} onClose={onClose}><form className="sheet-form" onSubmit={submit}>
    {entry && jobs.length > 0 && <label className="field"><span>Add to an existing job</span><div className="input-wrap"><select value={existing} onChange={(event) => setExisting(event.target.value)}><option value="">Create a new job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}</select></div></label>}
    {!existing && <><label className="field"><span>Job name *</span><div className="input-wrap"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kitchen alteration" /></div></label><div className="field-pair"><label className="field"><span>Customer</span><div className="input-wrap"><input value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} /></div></label><label className="field"><span>Reference</span><div className="input-wrap"><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></div></label></div><label className="field"><span>Site address</span><div className="input-wrap"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div></label><label className="field"><span>Date *</span><div className="input-wrap"><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div></label><label className="field"><span>Notes</span><div className="input-wrap"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} /></div></label></>}
    {error && <p className="form-error">{error}</p>}<button className="primary-button full" type="submit"><Check size={18} /> {existing ? 'Add to job' : editingJob ? 'Update job' : 'Save job'}</button>
  </form></Modal>;
}

function PdfPreview({ job, onClose, onToast }: { job: Job; onClose: () => void; onToast: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const blobUrl = useMemo(() => URL.createObjectURL(createJobPdf(job)), [job]);
  useEffect(() => () => URL.revokeObjectURL(blobUrl), [blobUrl]);
  const save = async () => { setBusy(true); try { await saveOrSharePdf(job); onToast('PDF ready to save or share'); } catch { onToast('Could not create the PDF'); } finally { setBusy(false); } };
  return <Modal title="PDF preview" onClose={onClose}><div className="report-preview"><header><Zap fill="currentColor" /><div><strong>WATTTOOL</strong><small>Smart tools for the trade · Calculation record</small></div></header><h2>{job.name}</h2><p>{[job.customer, job.address].filter(Boolean).join(' · ') || 'No customer or site recorded'}</p>{job.entries.map((entry) => <article key={entry.id}><small>{entry.title}</small><h3>{entry.result.headline}</h3><p>{entry.result.summary}</p>{entry.result.rows.map((row) => <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}</article>)}{job.notes && <article><small>Job notes</small><p>{job.notes}</p></article>}{(job.photos ?? []).length > 0 && <article><small>Site photos</small><div className="preview-photos">{job.photos!.slice(0, 6).map((photo) => <img key={photo.id} src={photo.src} alt={photo.label} />)}</div></article>}{job.signedBy && <article className="preview-signature"><small>Signed calculation record</small>{job.signatureDataUrl && <img src={job.signatureDataUrl} alt="Record signature" />}<p>Signed by {job.signedBy} on {job.signedDate || job.date}</p></article>}<footer>Indicative calculation record — not an electrical certificate</footer></div><div className="preview-actions"><a className="secondary-button" href={blobUrl} target="_blank" rel="noreferrer"><BookOpen size={17} /> Open PDF</a><button className="primary-button" onClick={save} disabled={busy}><FileDown size={17} /> {busy ? 'Preparing…' : 'Save / share'}</button></div></Modal>;
}

function JobsPage({ jobs, newJob, deleteJob, preview, editJob, updateJob, signJob, toast }: { jobs: Job[]; newJob: () => void; deleteJob: (id: string) => void; preview: (job: Job) => void; editJob: (job: Job) => void; updateJob: (job: Job) => void; signJob: (job: Job) => void; toast: (message: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ src: string; label: string } | null>(null);
  const addPhoto = async (job: Job, file?: File) => { if (!file) return; try { const prepared = await preparePhoto(file, `${job.name} photo`); updateJob({ ...job, photos: [...(job.photos ?? []), prepared], updatedAt: new Date().toISOString() }); toast('Photo saved to job'); } catch (error) { toast(error instanceof Error ? error.message : 'Could not add photo'); } };
  return <main className="page"><div className="page-heading with-action"><div><span className="eyebrow"><BriefcaseBusiness size={14} /> Local records</span><h1>Jobs</h1><p>Calculations stay on this device.</p></div><button className="round-add" onClick={newJob} aria-label="New job"><Plus /></button></div>
    {jobs.length === 0 ? <div className="empty-state"><span><ClipboardList /></span><h2>No saved jobs</h2><p>Save a calculator result or create a blank job to get started.</p><button className="primary-button" onClick={newJob}><Plus size={18} /> Create job</button></div> : <div className="job-list">{jobs.map((job) => <article key={job.id} className="job-card"><button className="job-summary" onClick={() => setOpen(open === job.id ? null : job.id)}><span className="job-badge">{job.name.slice(0, 2).toUpperCase()}</span><span><strong>{job.name}</strong><small>{job.customer || job.address || 'No customer recorded'}</small></span><span className="job-count">{job.entries.length}</span><ChevronRight className={open === job.id ? 'rotated' : ''} /></button>{open === job.id && <div className="job-details"><div className="meta-grid"><span><small>Date</small>{job.date}</span><span><small>Reference</small>{job.reference || '—'}</span></div>{job.entries.length ? job.entries.map((entry) => <div className="saved-entry" key={entry.id}><span><small>{entry.title}</small><strong>{entry.result.headline}</strong></span><time>{new Date(entry.createdAt).toLocaleDateString('en-GB')}</time></div>) : <p className="empty-inline">No calculations attached yet.</p>}{job.notes && <p className="job-notes">{job.notes}</p>}{(job.photos ?? []).length > 0 && <div className="photo-grid">{job.photos!.map((item) => <div className="photo-tile" key={item.id}><button onClick={() => setPhoto(item)} style={{ backgroundImage: `url(${item.src})` }} aria-label={`View ${item.label}`} /><button className="photo-remove" onClick={() => updateJob({ ...job, photos: job.photos!.filter((image) => image.id !== item.id) })} aria-label={`Remove ${item.label}`}><X size={13} /></button></div>)}</div>}<div className="record-tools"><label className="secondary-button file-button"><Camera size={16} /> Add photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { void addPhoto(job, event.target.files?.[0]); event.target.value = ''; }} /></label><button className="secondary-button" onClick={() => editJob(job)}><Pencil size={16} /> Edit</button><button className="secondary-button" onClick={() => signJob(job)}><Pencil size={16} /> {job.signatureDataUrl ? 'Re-sign' : 'Sign'}</button></div>{job.signedBy && <div className="signed-badge"><Check size={15} /><span>Signed by {job.signedBy} on {new Date(job.signedDate || job.date).toLocaleDateString('en-GB')}</span></div>}<div className="card-actions"><button className="secondary-button danger" onClick={() => deleteJob(job.id)}><Trash2 size={16} /> Delete</button><button className="primary-button" onClick={() => preview(job)}><FileDown size={16} /> PDF</button></div></div>}</article>)}</div>}
    {photo && <PhotoViewer src={photo.src} label={photo.label} onClose={() => setPhoto(null)} />}
  </main>;
}

function NotesPage({ notes, saveNote, deleteNote }: { notes: Note[]; saveNote: (note: Note) => void; deleteNote: (id: string) => void }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [photo, setPhoto] = useState<{ src: string; label: string } | null>(null);
  const start = () => { const stamp = new Date().toISOString(); setEditing({ id: uid(), title: '', body: '', photos: [], createdAt: stamp, updatedAt: stamp }); };
  const closeAndSave = () => { if (editing && (editing.title.trim() || editing.body.trim())) saveNote({ ...editing, updatedAt: new Date().toISOString() }); setEditing(null); };
  const addPhoto = async (file?: File) => { if (!file || !editing) return; try { const prepared = await preparePhoto(file, `${editing.title || 'Note'} photo`); setEditing({ ...editing, photos: [...(editing.photos ?? []), prepared] }); } catch { /* The file picker remains usable after an unsupported photo. */ } };
  return <main className="page"><div className="page-heading with-action"><div><span className="eyebrow"><NotebookPen size={14} /> Scratchpad</span><h1>Notes</h1><p>Part numbers, readings, reminders.</p></div><button className="round-add" onClick={start} aria-label="New note"><Plus /></button></div>{notes.length === 0 ? <div className="empty-state"><span><NotebookPen /></span><h2>Nothing here yet</h2><p>Create a note and it will be stored locally for offline use.</p><button className="primary-button" onClick={start}><Plus size={18} /> New note</button></div> : <div className="notes-grid">{notes.map((note) => <article className="note-card" key={note.id} onClick={() => setEditing(note)}><div>{(note.photos ?? [])[0] && <div className="note-thumb" style={{ backgroundImage: `url(${note.photos![0].src})` }} />}<strong>{note.title || 'Untitled note'}</strong><p>{note.body || ((note.photos ?? []).length ? `${note.photos!.length} photo${note.photos!.length === 1 ? '' : 's'}` : 'No additional text')}</p></div><footer><time>{new Date(note.updatedAt).toLocaleDateString('en-GB')}</time><button onClick={(event) => { event.stopPropagation(); deleteNote(note.id); }} aria-label={`Delete ${note.title}`}><Trash2 size={16} /></button></footer></article>)}</div>}{editing && <Modal title="Edit note" onClose={closeAndSave}><div className="note-editor"><input autoFocus value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="Note title" /><textarea value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} placeholder="Type anything you need to remember…" />{(editing.photos ?? []).length > 0 && <div className="photo-grid">{editing.photos!.map((item) => <div className="photo-tile" key={item.id}><button onClick={() => setPhoto(item)} style={{ backgroundImage: `url(${item.src})` }} /><button className="photo-remove" onClick={() => setEditing({ ...editing, photos: editing.photos!.filter((image) => image.id !== item.id) })}><X size={13} /></button></div>)}</div>}<label className="secondary-button file-button"><Camera size={16} /> Add photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { void addPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label><button className="primary-button full" onClick={closeAndSave}><Check size={18} /> Save note</button></div></Modal>}{photo && <PhotoViewer src={photo.src} label={photo.label} onClose={() => setPhoto(null)} />}</main>;
}

function SettingsPage({ data, replaceData, toast }: { data: AppData; replaceData: (data: AppData) => void; toast: (message: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const downloadBackup = () => { const url = URL.createObjectURL(new Blob([exportData(data)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `watttool-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url); toast('Backup downloaded'); };
  const loadBackup = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { replaceData(importData(await file.text())); toast('Backup restored'); } catch (error) { toast(error instanceof Error ? error.message : 'Could not restore backup'); } finally { event.target.value = ''; } };
  return <main className="page"><div className="page-heading"><span className="eyebrow"><Settings size={14} /> App</span><h1>Settings</h1><p>Data, safety and release information.</p></div><section className="settings-section"><h2>Appearance</h2><button className="settings-row" onClick={() => replaceData({ ...data, theme: data.theme === 'light' ? 'dark' : 'light' })}><span>{data.theme === 'light' ? <Sun /> : <Moon />}<span><strong>{data.theme === 'light' ? 'Light theme' : 'Dark theme'}</strong><small>Tap to switch appearance</small></span></span><ChevronRight /></button></section><section className="settings-section"><h2>Your data</h2><button className="settings-row" onClick={downloadBackup}><span><HardDriveDownload /><span><strong>Export backup</strong><small>Jobs, notes, photos and preferences</small></span></span><Download /></button><button className="settings-row" onClick={() => fileRef.current?.click()}><span><Share2 /><span><strong>Restore backup</strong><small>Import a WATTtool JSON file</small></span></span><ChevronRight /></button><input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={loadBackup} /></section><section className="settings-section"><h2>About</h2><div className="about-card"><div className="brand-mark"><Zap fill="currentColor" /></div><div><strong>WATTtool</strong><small>Smart tools for the trade · Version 2.0.0 test</small></div></div><p className="settings-copy">Offline first. All app records are stored locally. No analytics, accounts, or cloud upload are included. Calculations are indicative and require independent verification.</p><div className="credit-block"><strong>Designed by Ashley Chilvers</strong><a href="https://www.chilverselectricalservices.co.uk" target="_blank" rel="noreferrer">chilverselectricalservices.co.uk</a><span>© 2026 Ashley Chilvers. All rights reserved.</span></div></section></main>;
}

function BottomNav({ active, navigate }: { active: NavTab; navigate: (tab: NavTab) => void }) {
  const items: Array<{ id: NavTab; label: string; Icon: typeof Home }> = [{ id: 'home', label: 'Home', Icon: Home }, { id: 'tools', label: 'Tools', Icon: Calculator }, { id: 'jobs', label: 'Jobs', Icon: BriefcaseBusiness }, { id: 'notes', label: 'Notes', Icon: NotebookPen }, { id: 'settings', label: 'More', Icon: Menu }];
  return <nav className="bottom-nav" aria-label="Main navigation">{items.map(({ id, label, Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>;
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [tab, setTab] = useState<NavTab>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [savingEntry, setSavingEntry] = useState<JobEntry | undefined>();
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [signingJob, setSigningJob] = useState<Job | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [toast, setToast] = useState('');
  const [splash, setSplash] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [carriedR1R2, setCarriedR1R2] = useState<string | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setSplash(false), 1250); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!saveData(data)) setToast('Storage is full — export a backup'); }, [data]);
  useEffect(() => { document.documentElement.dataset.theme = data.theme ?? 'dark'; }, [data.theme]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);

  const navigate = (next: NavTab) => { setTab(next); setActiveTool(null); window.scrollTo({ top: 0 }); };
  const openTool = (id: string) => { setActiveTool(id); setTab('tools'); window.scrollTo({ top: 0 }); };
  const togglePin = (id: string) => setData((state) => ({ ...state, pinnedTools: state.pinnedTools.includes(id) ? state.pinnedTools.filter((item) => item !== id) : [...state.pinnedTools, id].slice(-6) }));
  const saveJob = (job: Job) => { setData((state) => ({ ...state, jobs: [job, ...state.jobs.filter((item) => item.id !== job.id)] })); setSavingEntry(undefined); setNewJobOpen(false); setEditingJob(undefined); setSigningJob(null); setToast('Job saved locally'); };
  const saveCalculation = (tool: CalculatorDefinition, calculation: CalculationResult) => setSavingEntry({ id: uid(), calculatorId: tool.id, title: tool.title, result: calculation, createdAt: new Date().toISOString() });
  const saveNote = (note: Note) => { setData((state) => ({ ...state, notes: [note, ...state.notes.filter((item) => item.id !== note.id)] })); setToast('Note saved locally'); };
  const removeJob = (id: string) => { if (window.confirm('Delete this job and its saved calculations?')) setData((state) => ({ ...state, jobs: state.jobs.filter((job) => job.id !== id) })); };
  const removeNote = (id: string) => { if (window.confirm('Delete this note?')) setData((state) => ({ ...state, notes: state.notes.filter((note) => note.id !== id) })); };
  const toggleTheme = () => setData((state) => ({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' }));
  const toggleTorch = async () => { try { const enabled = await setTorch(!torchOn); setTorchOn(enabled); setToast(enabled ? 'Torch on' : 'Torch off'); } catch (error) { setToast(error instanceof Error ? error.message : 'Torch unavailable'); } };
  const tool = activeTool ? calculatorById(activeTool) : undefined;

  return <div className="app-shell">
    {splash && <Splash />}
    {!data.disclaimerAccepted && !splash && <Disclaimer accept={() => setData((state) => ({ ...state, disclaimerAccepted: true }))} />}
    {activeTool === 'scientific' ? <ScientificCalculator onBack={() => setActiveTool(null)} /> : activeTool === 'diversity' ? <DiversityCalculator onBack={() => setActiveTool(null)} onSave={saveCalculation} /> : tool ? <CalculatorPage key={`${tool.id}-${carriedR1R2 ?? ''}`} tool={tool} initialValues={tool.id === 'zs-pfc' && carriedR1R2 ? { r1r2: carriedR1R2 } : undefined} onCarryToZs={(value) => { setCarriedR1R2(value); setActiveTool('zs-pfc'); window.scrollTo({ top: 0 }); setToast('R1 + R2 carried into the Zs check'); }} onBack={() => setActiveTool(null)} onSave={saveCalculation} /> : <>{tab === 'home' && <HomePage data={data} openTool={openTool} navigate={navigate} togglePin={togglePin} toggleTheme={toggleTheme} torchOn={torchOn} toggleTorch={() => { void toggleTorch(); }} />}{tab === 'tools' && <ToolsPage data={data} openTool={openTool} togglePin={togglePin} />}{tab === 'jobs' && <JobsPage jobs={data.jobs} newJob={() => setNewJobOpen(true)} deleteJob={removeJob} preview={setPreviewJob} editJob={setEditingJob} updateJob={saveJob} signJob={setSigningJob} toast={setToast} />}{tab === 'notes' && <NotesPage notes={data.notes} saveNote={saveNote} deleteNote={removeNote} />}{tab === 'settings' && <SettingsPage data={data} replaceData={setData} toast={setToast} />}</>}
    {!activeTool && <BottomNav active={tab} navigate={navigate} />}
    {(savingEntry || newJobOpen || editingJob) && <JobEditor entry={savingEntry} job={editingJob} jobs={data.jobs} onClose={() => { setSavingEntry(undefined); setNewJobOpen(false); setEditingJob(undefined); }} onSave={saveJob} />}
    {signingJob && <SignatureEditor job={signingJob} onClose={() => setSigningJob(null)} onSave={saveJob} />}
    {previewJob && <PdfPreview job={previewJob} onClose={() => setPreviewJob(null)} onToast={setToast} />}
    {toast && <div className="toast"><Check size={17} /> {toast}</div>}
  </div>;
}
