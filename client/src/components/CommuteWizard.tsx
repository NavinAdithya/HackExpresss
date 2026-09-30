/**
 * CommuteWizard — five short steps to save a recurring commute.
 *  1. Where do you usually start?   2. Where are you going?
 *  3. When do you usually travel?   4. How do you travel?   5. Auto-match + review
 */

import { useEffect, useRef, useState } from 'react';
import { GlassCard, GlassButton, GlassInput } from '../glass';
import { commuteAPI } from '../services/api';
import { searchPlaces, nearestAreaName, type PlaceSuggestion } from '../services/places';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme';
import type { DailyCommute, DayName, CommuteRole } from '../types';

type Place = { address: string; coordinates: [number, number] };

const DAYS: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const stepTitle = [
  'Where do you usually start?',
  'Where are you going?',
  'When do you usually travel?',
  'How do you travel?',
  'Automatic matching',
];

const chip = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: theme.radiusFull,
  background: active ? theme.primary : 'rgba(255, 248, 229, 0.05)',
  border: `1px solid ${active ? theme.primary : theme.glassBorder}`,
  color: active ? theme.cream : theme.mutedLight,
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
});

const fieldLabel: React.CSSProperties = { fontSize: '0.75rem', color: theme.muted, marginBottom: '6px', display: 'block' };

function PlaceSearch({ value, onPick, placeholder }: { value: Place | null; onPick: (p: Place) => void; placeholder: string }) {
  const [text, setText] = useState(value?.address || '');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      setResults(await searchPlaces(v));
      setSearching(false);
    }, 250);
  };

  return (
    <div style={{ position: 'relative' }}>
      <GlassInput
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      {searching && <div style={{ fontSize: '0.75rem', color: theme.muted, marginTop: '6px' }}>Searching…</div>}
      {results.length > 0 && (
        <div style={{ marginTop: '8px', borderRadius: theme.radiusMd, border: `1px solid ${theme.glassBorder}`, background: 'rgba(20,13,11,0.95)', overflow: 'hidden' }}>
          {results.slice(0, 5).map((r) => (
            <button
              key={r.place_id}
              type="button"
              onClick={() => {
                onPick({ address: r.displayName, coordinates: [r.longitude, r.latitude] });
                setText(r.displayName);
                setResults([]);
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${theme.glassBorder}`, color: theme.cream, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {r.displayName}
              <span style={{ display: 'block', fontSize: '0.72rem', color: theme.muted }}>{r.formattedAddress}</span>
            </button>
          ))}
        </div>
      )}
      {value && results.length === 0 && (
        <div style={{ fontSize: '0.75rem', color: theme.success, marginTop: '6px' }}>✓ {value.address}</div>
      )}
    </div>
  );
}

export function CommuteWizard({
  initial,
  savedPlaces,
  onSaved,
  onCancel,
}: {
  initial?: DailyCommute;
  savedPlaces: Place[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState<Place | null>(initial ? initial.origin : null);
  const [destination, setDestination] = useState<Place | null>(initial ? initial.destination : null);
  const [originMode, setOriginMode] = useState<'current' | 'saved' | 'search'>('search');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const [departureTime, setDepartureTime] = useState(initial?.departureTime || '08:15');
  const [arrivalTime, setArrivalTime] = useState(initial?.arrivalTime || '');
  const [days, setDays] = useState<DayName[]>(initial?.days || WEEKDAYS);
  const [timeWindow, setTimeWindow] = useState(initial?.timeWindow || 20);

  const [role, setRole] = useState<CommuteRole>(initial?.role || 'PASSENGER');
  const [transportMode, setTransportMode] = useState<'BIKE' | 'CAR'>(
    initial?.transportMode || user?.vehicleDetails?.transportMode || 'CAR'
  );
  const [availableSeats, setAvailableSeats] = useState(initial?.availableSeats || 1);
  const [requiredSeats, setRequiredSeats] = useState(initial?.requiredSeats || 1);
  const [label, setLabel] = useState(initial?.label || '');
  const [autoMatch, setAutoMatch] = useState(initial ? initial.autoMatchEnabled : true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const offersSeats = role === 'TRAVELLER' || role === 'BOTH';
  const needsSeats = role === 'PASSENGER' || role === 'BOTH';
  const maxSeats = transportMode === 'BIKE' ? 1 : 6;
  const seatsShown = Math.min(availableSeats, maxSeats);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocError('Location is not available on this device.'); return; }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ address: nearestAreaName(pos.coords.latitude, pos.coords.longitude), coordinates: [pos.coords.longitude, pos.coords.latitude] });
        setLocating(false);
      },
      () => {
        setLocError('We could not read your location. Search for it instead.');
        setOriginMode('search');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toggleDay = (d: DayName) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const canNext = [
    !!origin,
    !!destination && (!origin || destination.address !== origin.address),
    /^\d{2}:\d{2}$/.test(departureTime) && days.length > 0,
    true,
    true,
  ][step];

  const save = async () => {
    if (!origin || !destination) return;
    setSaving(true);
    setError('');
    const payload = {
      label: label.trim(),
      origin,
      destination,
      departureTime,
      arrivalTime,
      days,
      timeWindow,
      role,
      transportMode,
      availableSeats: offersSeats ? seatsShown : 0,
      requiredSeats: needsSeats ? requiredSeats : 1,
      autoMatchEnabled: autoMatch,
      timezoneOffsetMin: -new Date().getTimezoneOffset(),
    };
    try {
      if (initial) await commuteAPI.update(initial._id, payload);
      else await commuteAPI.create(payload);
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Could not save your commute. Please try again.');
    }
    setSaving(false);
  };

  return (
    <GlassCard style={{ padding: '20px' }} whileHover={undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.6875rem', color: theme.muted, fontWeight: 700, letterSpacing: '0.08em' }}>
          STEP {step + 1} OF {stepTitle.length}
        </span>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '0.8125rem' }}>
          Cancel
        </button>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,248,229,0.08)', marginBottom: '18px' }}>
        <div style={{ width: `${((step + 1) / stepTitle.length) * 100}%`, height: '100%', background: theme.primary, borderRadius: '2px', transition: 'width .25s' }} />
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.cream, margin: '0 0 16px' }}>{stepTitle[step]}</h2>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={chip(originMode === 'current')} onClick={() => { setOriginMode('current'); detectLocation(); }}>
              📍 Current location
            </button>
            {savedPlaces.length > 0 && (
              <button type="button" style={chip(originMode === 'saved')} onClick={() => setOriginMode('saved')}>
                ⭐ Saved location
              </button>
            )}
            <button type="button" style={chip(originMode === 'search')} onClick={() => setOriginMode('search')}>
              🔎 Search
            </button>
          </div>
          {locating && <p style={{ fontSize: '0.8125rem', color: theme.muted, margin: 0 }}>Detecting your location…</p>}
          {locError && <p role="alert" style={{ fontSize: '0.8125rem', color: theme.warning, margin: 0 }}>{locError}</p>}
          {originMode === 'saved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedPlaces.map((p) => (
                <button key={`${p.address}-${p.coordinates.join()}`} type="button" onClick={() => setOrigin(p)}
                  style={{ ...chip(origin?.address === p.address), textAlign: 'left', borderRadius: theme.radiusMd }}>
                  {p.address}
                </button>
              ))}
            </div>
          )}
          {originMode === 'search' && <PlaceSearch value={origin} onPick={setOrigin} placeholder="Search your starting point" />}
          {originMode === 'current' && origin && <div style={{ fontSize: '0.85rem', color: theme.success }}>✓ {origin.address}</div>}
        </div>
      )}

      {step === 1 && (
        <div>
          <PlaceSearch value={destination} onPick={setDestination} placeholder="Search your destination (college, office…)" />
          {origin && destination && origin.address === destination.address && (
            <p role="alert" style={{ fontSize: '0.8125rem', color: theme.warning, marginTop: '8px' }}>Start and destination must differ.</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={fieldLabel} htmlFor="dep">Departure time</label>
              <GlassInput id="dep" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel} htmlFor="arr">Arrive by (optional)</label>
              <GlassInput id="arr" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </div>
          </div>
          <div>
            <span style={fieldLabel}>Days</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DAYS.map((d) => (
                <button key={d} type="button" aria-pressed={days.includes(d)} style={{ ...chip(days.includes(d)), padding: '8px 12px' }} onClick={() => toggleDay(d)}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setDays(WEEKDAYS)} style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Mon–Fri</button>
              <button type="button" onClick={() => setDays(DAYS)} style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Every day</button>
            </div>
          </div>
          <div>
            <label style={fieldLabel} htmlFor="win">Time flexibility: ± {timeWindow} min</label>
            <input id="win" type="range" min={5} max={60} step={5} value={timeWindow} onChange={(e) => setTimeWindow(Number(e.target.value))} style={{ width: '100%', accentColor: theme.primary }} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={chip(role === 'PASSENGER')} onClick={() => setRole('PASSENGER')}>I need a ride</button>
            <button type="button" style={chip(role === 'TRAVELLER')} onClick={() => setRole('TRAVELLER')}>I have a vehicle</button>
            <button type="button" style={chip(role === 'BOTH')} onClick={() => setRole('BOTH')}>Both</button>
          </div>

          {offersSeats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={fieldLabel}>Vehicle{user?.vehicleDetails?.vehicleModel ? ` · ${user.vehicleDetails.vehicleModel}` : ''}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" style={chip(transportMode === 'BIKE')} onClick={() => setTransportMode('BIKE')}>🏍️ Bike</button>
                  <button type="button" style={chip(transportMode === 'CAR')} onClick={() => setTransportMode('CAR')}>🚗 Car</button>
                </div>
              </div>
              <div>
                <span style={fieldLabel}>Seats you can offer</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" style={{ ...chip(seatsShown === n), padding: '8px 14px' }} onClick={() => setAvailableSeats(n)}>{n}</button>
                  ))}
                </div>
              </div>
              {user?.driverStatus !== 'APPROVED' && (
                <p style={{ fontSize: '0.78rem', color: theme.warning, margin: 0 }}>
                  Offering seats needs an approved Traveller verification.
                </p>
              )}
            </div>
          )}

          {needsSeats && (
            <div>
              <span style={fieldLabel}>Seats you need</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" style={{ ...chip(requiredSeats === n), padding: '8px 14px' }} onClick={() => setRequiredSeats(n)}>{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoMatch} onChange={(e) => setAutoMatch(e.target.checked)} style={{ marginTop: '3px', accentColor: theme.primary, width: '18px', height: '18px' }} />
            <span>
              <span style={{ color: theme.cream, fontWeight: 700, fontSize: '0.95rem' }}>Automatically find matches for my commute</span>
              <span style={{ display: 'block', color: theme.muted, fontSize: '0.8125rem', marginTop: '2px', lineHeight: 1.4 }}>
                On commute days we look for people on a compatible route and time. Nothing is booked without your confirmation.
              </span>
            </span>
          </label>

          <div>
            <label style={fieldLabel} htmlFor="lbl">Name (optional)</label>
            <GlassInput id="lbl" placeholder="e.g. College" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div style={{ padding: '12px 14px', borderRadius: theme.radiusMd, background: 'rgba(10,10,10,0.5)', fontSize: '0.85rem', color: theme.cream, lineHeight: 1.6 }}>
            <div>{origin?.address} → {destination?.address}</div>
            <div style={{ color: theme.mutedLight }}>
              {days.length === 7 ? 'Every day' : days.join(', ')} · around {departureTime}{arrivalTime ? ` · arrive by ${arrivalTime}` : ''}
            </div>
            <div style={{ color: theme.mutedLight }}>
              {role === 'PASSENGER' ? 'Looking for a ride' : role === 'TRAVELLER' ? `Offering ${seatsShown} seat${seatsShown === 1 ? '' : 's'}` : 'Ride or share'}
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ color: theme.danger, fontSize: '0.8125rem', marginTop: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', gap: '10px' }}>
        <GlassButton variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</GlassButton>
        {step < stepTitle.length - 1 ? (
          <GlassButton disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Next</GlassButton>
        ) : (
          <GlassButton loading={saving} onClick={save}>{initial ? 'Save changes' : 'Save my commute'}</GlassButton>
        )}
      </div>
    </GlassCard>
  );
}
