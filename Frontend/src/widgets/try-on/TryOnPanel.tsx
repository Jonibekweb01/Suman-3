import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../shared/ui';
import { cn } from '../../shared/lib/cn';
import type { Gender, ProductDetail } from '../../shared/types/product';

type FitPreference = 'SLIM' | 'REGULAR' | 'RELAXED';
type BodyShape = 'RECTANGLE' | 'TRIANGLE' | 'INVERTED_TRIANGLE' | 'OVAL' | 'HOURGLASS';

interface SmartFitProfile {
  heightCm: string;
  weightKg: string;
  age: string;
  chestCm: string;
  waistCm: string;
  hipCm: string;
  bodyShape: BodyShape;
  fitPreference: FitPreference;
}

interface SmartFitResult {
  size: string;
  score: number;
  alternative: { size: string; score: number } | null;
  notes: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

const EMPTY_PROFILE: SmartFitProfile = {
  heightCm: '', weightKg: '', age: '', chestCm: '', waistCm: '', hipCm: '',
  bodyShape: 'RECTANGLE', fitPreference: 'REGULAR',
};
const PROFILE_KEY = 'suman-smart-fit-profile';
const FIT_LABELS: Record<FitPreference, string> = { SLIM: 'Torroq', REGULAR: 'Standart', RELAXED: 'Erkin' };

function getInitialGender(gender: Gender): 'MEN' | 'WOMEN' { return gender === 'WOMEN' ? 'WOMEN' : 'MEN'; }
function readProfile(): SmartFitProfile {
  try {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    return stored ? { ...EMPTY_PROFILE, ...JSON.parse(stored) } : EMPTY_PROFILE;
  } catch { return EMPTY_PROFILE; }
}
function numberValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function normalise(value: string): string { return value.toLowerCase().replace(/[\s_-]+/g, ''); }
function isBottomProduct(product: ProductDetail): boolean {
  const value = normalise(`${product.category.slug} ${product.category.name} ${product.title}`);
  return /short|pant|trouser|jean|skirt|legging|ниж|брюк|шорт|юбк/.test(value);
}
function isTopProduct(product: ProductDetail): boolean {
  const value = normalise(`${product.category.slug} ${product.category.name} ${product.title}`);
  return /tshirt|shirt|top|hoodie|sweat|jacket|coat|blouse|dress|футбол|рубаш|толстов|куртк|пальто|плать/.test(value);
}
function scoreDimension(value: number | null, min: number, max: number, allowance: number): number {
  if (value === null) return 0.72;
  if (value >= min + allowance && value <= max + allowance) return 1;
  const distance = value < min + allowance ? min + allowance - value : value - (max + allowance);
  return Math.max(0, 1 - distance / 18);
}

function calculateRecommendation(product: ProductDetail, profile: SmartFitProfile): SmartFitResult | null {
  const sizes = product.sizes.filter(Boolean);
  if (sizes.length === 0) return null;
  const chest = numberValue(profile.chestCm);
  const waist = numberValue(profile.waistCm);
  const hip = numberValue(profile.hipCm);
  const height = numberValue(profile.heightCm);
  const weight = numberValue(profile.weightKg);
  const allowance = profile.fitPreference === 'SLIM' ? -1 : profile.fitPreference === 'RELAXED' ? 5 : 2;
  const top = isTopProduct(product);
  const bottom = isBottomProduct(product);

  const candidates = sizes.map((size, index) => {
    const ratio = sizes.length === 1 ? 0.5 : index / (sizes.length - 1);
    const shapeAdjustment = profile.bodyShape === 'HOURGLASS' ? 2 : profile.bodyShape === 'OVAL' ? 4 : 0;
    const estimatedChest = (weight ?? 68) * 0.62 + (height ?? 170) * 0.1 + ratio * 4 + shapeAdjustment;
    const estimatedWaist = (weight ?? 68) * 0.48 + (height ?? 170) * 0.035 + ratio * 5 + shapeAdjustment;
    const estimatedHip = (weight ?? 68) * 0.58 + (height ?? 170) * 0.08 + ratio * 4 + (profile.bodyShape === 'TRIANGLE' || profile.bodyShape === 'HOURGLASS' ? 3 : 0);
    const chestScore = scoreDimension(chest ?? estimatedChest, estimatedChest - 6, estimatedChest + 6, allowance);
    const waistScore = scoreDimension(waist ?? estimatedWaist, estimatedWaist - 5, estimatedWaist + 5, allowance);
    const hipScore = scoreDimension(hip ?? estimatedHip, estimatedHip - 6, estimatedHip + 6, allowance);
    const heightScore = height === null ? 0.8 : Math.max(0.55, 1 - Math.abs(height - (160 + ratio * 40)) / 80);
    const weighted = top && !bottom
      ? chestScore * 0.58 + waistScore * 0.18 + heightScore * 0.14 + hipScore * 0.1
      : bottom && !top
        ? waistScore * 0.42 + hipScore * 0.42 + heightScore * 0.1 + chestScore * 0.06
        : chestScore * 0.4 + waistScore * 0.25 + hipScore * 0.25 + heightScore * 0.1;
    return { size, score: Math.max(55, Math.min(98, Math.round(weighted * 100))) };
  });

  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const best = ordered[0]!;
  const notes: string[] = [];
  if (top && chest === null) notes.push('Aniqroq natija uchun ko‘krak o‘lchamingizni kiriting.');
  if (bottom && waist === null) notes.push('Bel o‘lchami kiritilmagani uchun natija taxminiy.');
  if (profile.fitPreference === 'SLIM') notes.push('Torroq fit afzalligingiz hisobga olindi.');
  if (profile.fitPreference === 'RELAXED') notes.push('Erkinroq fit afzalligingiz hisobga olindi.');
  if (best.score < 78) notes.push('Ikki o‘lcham oralig‘idasiz. Erkinroq kiyinish uchun keyingi o‘lchamni ko‘rib chiqing.');
  const providedMeasurements = [chest, waist, hip].filter((value) => value !== null).length;
  return {
    size: best.size,
    score: best.score,
    alternative: ordered[1] ?? null,
    notes,
    confidence: providedMeasurements >= 2 ? 'HIGH' : providedMeasurements === 1 ? 'MEDIUM' : 'LOW',
  };
}

function Field({ label, value, onChange, placeholder, suffix }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <span className="relative block">
        <input type="number" min="1" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-ink" />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export interface TryOnPanelProps {
  product: ProductDetail;
  selectedColor: string | null;
  selectedSize: string | null;
  onSelectSize?: (size: string) => void;
}

export function TryOnPanel({ product, selectedColor, selectedSize, onSelectSize }: TryOnPanelProps) {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState<'MEN' | 'WOMEN'>(() => getInitialGender(product.gender));
  const [profile, setProfile] = useState<SmartFitProfile>(readProfile);
  const [result, setResult] = useState<SmartFitResult | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(() => Boolean(window.localStorage.getItem(PROFILE_KEY)));
  const garmentColor = product.colors.find((color) => color.name === selectedColor)?.hex ?? '#c65f42';
  const previewSize = result?.size ?? selectedSize ?? product.sizes[0] ?? 'M';
  const previewScale = { S: 0.9, M: 0.96, L: 1, XL: 1.06, XXL: 1.13 }[previewSize] ?? 1;
  const fitLabel = result ? `${result.score}% mos keladi` : 'Shaxsiy o‘lchamingizni toping';
  const resultTone = result && result.score >= 90 ? 'bg-emerald-600' : result && result.score >= 75 ? 'bg-amber-500' : 'bg-rose-500';
  const confidenceLabel = result?.confidence === 'HIGH' ? 'Yuqori ishonchlilik' : result?.confidence === 'MEDIUM' ? 'O‘rta ishonchlilik' : 'Taxminiy natija';
  const productSummary = useMemo(() => {
    if (isBottomProduct(product) && !isTopProduct(product)) return 'Bel va bo‘ksa o‘lchovlari asosiy hisoblanadi';
    if (isTopProduct(product)) return 'Ko‘krak va yelka mosligi asosiy hisoblanadi';
    return 'Tana o‘lchovlaringiz va fit afzalligingiz hisoblanadi';
  }, [product]);

  useEffect(() => { if (!open) return; setResult(null); }, [open, product.id]);
  function updateProfile(key: keyof SmartFitProfile, value: string): void { setProfile((current) => ({ ...current, [key]: value })); }
  function calculate(): void {
    const nextResult = calculateRecommendation(product, profile);
    if (!nextResult) return;
    setResult(nextResult);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setHasSavedProfile(true);
  }

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-card border border-line bg-surface-sunken" aria-labelledby="smart-fit-title">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Smart Fit</p><h2 id="smart-fit-title" className="mt-1 text-xl font-semibold tracking-tight">{fitLabel}</h2></div>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-card bg-ink px-3.5 py-2.5 text-xs font-bold text-canvas transition-transform hover:-translate-y-0.5 active:translate-y-0">{result ? 'Qayta hisoblash' : 'O‘lchamimni topish'}</button>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[72px_1fr] sm:items-center">
          <div className="relative mx-auto flex h-20 w-16 items-end justify-center rounded-card bg-[#e8e1d6]"><div className="relative h-16 origin-bottom" style={{ transform: `scaleX(${previewScale})` }} aria-hidden="true"><div className="absolute left-1/2 top-0 size-3.5 -translate-x-1/2 rounded-full bg-[#b8896b]" /><div className="absolute left-1/2 top-3 h-8 w-6 -translate-x-1/2 rounded-lg bg-[#b8896b]" /><div className="absolute left-1 top-4 h-9 w-1.5 rotate-6 rounded-full bg-[#b8896b]" /><div className="absolute right-1 top-4 h-9 w-1.5 -rotate-6 rounded-full bg-[#b8896b]" /><div className="absolute left-[9px] bottom-0 h-7 w-1.5 rounded-full bg-[#b8896b]" /><div className="absolute right-[9px] bottom-0 h-7 w-1.5 rounded-full bg-[#b8896b]" /><div className="absolute left-1/2 top-3.5 h-6 w-7 -translate-x-1/2 rounded-md" style={{ backgroundColor: garmentColor }} /></div></div>
          <div><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{result ? `${result.size} o‘lcham tavsiya qilinadi` : 'Bu mahsulot sizga qanday mos keladi?'}</p><p className="mt-1 text-xs text-muted">{result ? confidenceLabel : productSummary}</p></div>{result && <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold text-white', resultTone)}>{result.score}%</span>}</div>{result?.notes[0] && <p className="mt-3 text-xs leading-relaxed text-ink-soft">{result.notes[0]}</p>}</div>
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Smart Fit: sizga mos o‘lcham" variant="sheet" size="lg">
        {!result ? <div className="space-y-6">
          <p className="text-sm leading-relaxed text-muted">Tana parametrlaringizni kiriting. Biz ularni shu mahsulotning o‘lcham jadvali va kiyinish afzalligingiz bilan taqqoslaymiz.</p>
          <div className="flex gap-2 rounded-card bg-surface-sunken p-1">{(['MEN', 'WOMEN'] as const).map((option) => <button key={option} type="button" onClick={() => setGender(option)} aria-pressed={gender === option} className={cn('flex-1 rounded-[5px] px-3 py-2.5 text-sm font-semibold transition-colors', gender === option ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>{option === 'MEN' ? 'Erkak' : 'Ayol'}</button>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bo‘y" value={profile.heightCm} onChange={(value) => updateProfile('heightCm', value)} placeholder="Masalan, 178" suffix="sm" />
            <Field label="Vazn" value={profile.weightKg} onChange={(value) => updateProfile('weightKg', value)} placeholder="Masalan, 74" suffix="kg" />
            <Field label="Yosh" value={profile.age} onChange={(value) => updateProfile('age', value)} placeholder="Masalan, 28" />
            <Field label="Ko‘krak aylanasi" value={profile.chestCm} onChange={(value) => updateProfile('chestCm', value)} placeholder="Ixtiyoriy" suffix="sm" />
            <Field label="Bel aylanasi" value={profile.waistCm} onChange={(value) => updateProfile('waistCm', value)} placeholder="Ixtiyoriy" suffix="sm" />
            <Field label="Bo‘ksa aylanasi" value={profile.hipCm} onChange={(value) => updateProfile('hipCm', value)} placeholder="Ixtiyoriy" suffix="sm" />
          </div>
          <div><p className="mb-2 text-xs font-semibold text-ink-soft">Tana shakli</p><select value={profile.bodyShape} onChange={(event) => updateProfile('bodyShape', event.target.value as BodyShape)} className="h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink"><option value="RECTANGLE">To‘g‘ri</option><option value="TRIANGLE">Uchburchak</option><option value="INVERTED_TRIANGLE">Teskari uchburchak</option><option value="OVAL">Oval</option><option value="HOURGLASS">Qum soati</option></select></div>
          <div><p className="mb-2 text-xs font-semibold text-ink-soft">Kiyim qanday turishini xohlaysiz?</p><div className="grid grid-cols-3 gap-2">{(Object.keys(FIT_LABELS) as FitPreference[]).map((option) => <button key={option} type="button" onClick={() => updateProfile('fitPreference', option)} aria-pressed={profile.fitPreference === option} className={cn('rounded-card border px-2 py-3 text-xs font-semibold transition-colors', profile.fitPreference === option ? 'border-ink bg-ink text-white' : 'border-line-strong hover:border-ink')}>{FIT_LABELS[option]}</button>)}</div></div>
          <div className="rounded-card bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">Aniq ko‘krak, bel va bo‘ksa o‘lchovlari natijani sezilarli yaxshilaydi. Sizning ma’lumotlaringiz brauzeringizda saqlanadi.</div>
          <button type="button" onClick={calculate} disabled={!numberValue(profile.heightCm) || !numberValue(profile.weightKg)} className="h-12 w-full rounded-card bg-ink text-sm font-bold text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">Menga mos o‘lchamni toping</button>
          {hasSavedProfile && <p className="text-center text-xs text-muted">Saqlangan profilingiz yuklandi. Qiymatlarni o‘zgartirishingiz mumkin.</p>}
        </div> : <div className="space-y-5">
          <div className="rounded-card bg-emerald-50 p-5 text-center"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Sizga tavsiya</p><p className="mt-2 text-5xl font-bold tracking-tight text-emerald-950">{result.size}</p><p className="mt-2 text-sm font-semibold text-emerald-800">{result.score}% mos keladi</p><p className="mt-1 text-xs text-emerald-700">{confidenceLabel}</p></div>
          <div><p className="mb-2 text-sm font-semibold">Nega bu o‘lcham?</p><div className="space-y-2 text-sm text-ink-soft"><p className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Tana parametrlaringiz mahsulot jadvali bilan taqqoslandi</p><p className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> {FIT_LABELS[profile.fitPreference]} fit afzalligingiz hisobga olindi</p>{result.notes.map((note) => <p key={note} className="flex items-start gap-2"><span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" /> {note}</p>)}</div></div>
          {result.alternative && <p className="rounded-card bg-surface-sunken px-4 py-3 text-sm text-ink-soft">Alternativ: <strong>{result.alternative.size}</strong> o‘lcham {result.alternative.score}% mos. Uni erkinroq kiyinish uchun tanlashingiz mumkin.</p>}
          <div className="flex gap-2"><button type="button" onClick={() => setResult(null)} className="h-11 flex-1 rounded-card border border-line-strong text-sm font-semibold hover:border-ink">Qayta kiritish</button><button type="button" onClick={() => { onSelectSize?.(result.size); setOpen(false); }} className="h-11 flex-1 rounded-card bg-ink text-sm font-bold text-canvas hover:opacity-90">{result.size} ni tanlash</button></div>
        </div>}
      </Modal>
    </>
  );
}
