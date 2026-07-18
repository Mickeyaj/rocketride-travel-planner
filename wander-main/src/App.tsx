import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import { fetchForecast, fetchPlaces } from './api'
import type { ForecastDay, PlaceData } from './api'

type IconName =
  | 'arrow-left' | 'arrow-up' | 'calendar' | 'car' | 'chevron-right' | 'close'
  | 'cloud-rain' | 'coffee' | 'compass' | 'external' | 'map-pin'
  | 'minus' | 'plane' | 'plus' | 'search' | 'sparkles' | 'utensils'

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    'arrow-left': <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    'arrow-up': <><path d="m6 11 6-6 6 6" /><path d="M12 5v14" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    car: <><path d="m5 17-2-2 2-6h14l2 6-2 2H5Z" /><path d="m7 9 2-4h6l2 4M7 17v2M17 17v2" /><circle cx="7.5" cy="14" r=".5" /><circle cx="16.5" cy="14" r=".5" /></>,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    'cloud-rain': <><path d="M7 17h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 2A3 3 0 0 0 7 17Z" /><path d="m8 20-1 2M12 20l-1 2M16 20l-1 2" /></>,
    coffee: <><path d="M4 8h14v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" /><path d="M18 10h1a3 3 0 0 1 0 6h-1M8 4v1M12 3v2M16 4v1" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    'map-pin': <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    minus: <path d="M5 12h14" />,
    plane: <path d="M22 16v-2l-8-5V3.5a2 2 0 0 0-4 0V9l-8 5v2l8-2.5V19l-2 1.5V22l4-1 4 1v-1.5L14 19v-5.5l8 2.5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></>,
    utensils: <><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18M17 3c-3 2-4 6-4 9h4" /></>,
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const samplePrompts = [
  'Plan a rainy weekend in Seattle for a food lover',
  'What car events are happening in Seattle next month?',
  'Build me a finals weekend itinerary in Seattle',
  'Find scenic hikes with a great lunch nearby',
]

const RESEARCH_STEP_COUNT = 4

function getResearchSteps(city: string) {
  return [
    { icon: 'search' as const, text: 'Finding experiences that match your interests' },
    { icon: 'cloud-rain' as const, text: `Checking ${city} weather for your dates` },
    { icon: 'calendar' as const, text: 'Verifying hours, events, and availability' },
    { icon: 'sparkles' as const, text: 'Shaping your personalized itinerary' },
  ]
}

const CATEGORY_KEYWORDS: [string[], string][] = [
  [
    [
      'restaurant', 'food', 'foodie', 'eat', 'eating', 'dine', 'dining',
      'meal', 'hungry', 'snack', 'bite', 'cuisine',
      'dinner', 'lunch', 'breakfast', 'brunch',
    ],
    'restaurant',
  ],
  [['coffee', 'cafe'], 'cafe'],
  [['beach', 'beaches', 'coast', 'coastal', 'shore', 'shoreline', 'seaside'], 'beach'],
  // Nominatim has no dedicated "hiking trail" tag that reliably returns results, so
  // hiking-flavored queries route to 'park', which surfaces real matches in practice.
  [['hike', 'hiking', 'trail', 'outdoor', 'nature', 'park'], 'park'],
  [['museum', 'art', 'gallery', 'culture'], 'museum'],
  [['attraction', 'sightseeing', 'sight', 'things to do'], 'attraction'],
]

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurants',
  cafe: 'Cafes',
  beach: 'Beaches',
  park: 'Parks & Hikes',
  museum: 'Museums',
  attraction: 'Attractions',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

// Finds every category the query touches (e.g. "hiking places, parks, restaurants"
// mentions two categories) instead of stopping at the first match, so a compound
// request can be answered with one section per category.
function categoriesForQuery(text: string): string[] {
  const lower = text.toLowerCase()
  const matches = CATEGORY_KEYWORDS
    // "s?" tolerates simple plurals (restaurant/restaurants, park/parks) without
    // having to list every plural form alongside its singular in the keyword lists.
    .filter(([keywords]) => keywords.some((keyword) => new RegExp(`\\b${keyword}s?\\b`).test(lower)))
    .map(([, category]) => category)

  const unique = Array.from(new Set(matches))
  return unique.length > 0 ? unique : ['attraction']
}

const MAX_RESULTS = 8
const DEFAULT_TIME = '09:00'
const TIMETABLE_STORAGE_KEY = 'wander-timetable'

const PLACE_ICONS: Partial<Record<string, IconName>> = {
  museum: 'sparkles',
  gallery: 'sparkles',
  artwork: 'sparkles',
  viewpoint: 'compass',
  attraction: 'compass',
  monument: 'compass',
  castle: 'compass',
  park: 'compass',
  beach: 'compass',
  cafe: 'coffee',
  restaurant: 'utensils',
  fast_food: 'utensils',
}

function iconForPlace(place: PlaceData): IconName {
  return PLACE_ICONS[place.type] ?? 'map-pin'
}

function labelForPlace(place: PlaceData): string {
  return place.type
    ? place.type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Point of Interest'
}

function titleForPlace(place: PlaceData): string {
  return place.name?.trim() || place.display_name.split(',')[0]
}

function buildItinerary(places: PlaceData[], city: string) {
  return places.slice(0, MAX_RESULTS).map((place) => ({
    id: `${place.osm_type}-${place.osm_id}`,
    title: titleForPlace(place),
    detail: `A notable ${labelForPlace(place).toLowerCase()} in ${city}, popular among visitors exploring the area.`,
    tag: labelForPlace(place),
    icon: iconForPlace(place),
    citations: [
      {
        label: 'View on OpenStreetMap',
        href: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
      },
    ],
  }))
}

type ItineraryItem = ReturnType<typeof buildItinerary>[number]

type TimetableEntry = {
  id: string
  city: string
  day: string
  time: string
  title: string
  tag: string
  icon: IconName
  citationHref?: string
}

function loadTimetable(): TimetableEntry[] {
  try {
    const raw = window.localStorage.getItem(TIMETABLE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TimetableEntry[]) : []
  } catch {
    return []
  }
}

function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function groupTimetableByDay(entries: TimetableEntry[]): [string, TimetableEntry[]][] {
  const byDay = new Map<string, TimetableEntry[]>()
  for (const entry of entries) {
    const existing = byDay.get(entry.day) ?? []
    existing.push(entry)
    byDay.set(entry.day, existing)
  }
  return Array.from(byDay.entries())
    .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
    .map(([day, dayEntries]) => [day, dayEntries.sort((a, b) => a.time.localeCompare(b.time))])
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10)
}

function tripDateList(startDate: string, days: number): string[] {
  const dates: string[] = []
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(`${startDate}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + offset)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

function TripControls({
  date,
  duration,
  onDateChange,
  onDurationChange,
}: {
  date: string
  duration: number
  onDateChange: (value: string) => void
  onDurationChange: (value: number) => void
}) {
  return (
    <div className="trip-controls" aria-label="Trip timing">
      <label className="date-control">
        <Icon name="calendar" size={16} />
        <span>
          <small>Starting</small>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </span>
      </label>
      <div className="control-divider" />
      <div className="duration-control">
        <span>
          <small>Trip length</small>
          <strong>{duration} {duration === 1 ? 'day' : 'days'}</strong>
        </span>
        <div className="duration-buttons">
          <button
            type="button"
            aria-label="Decrease trip duration"
            disabled={duration === 1}
            onClick={() => onDurationChange(Math.max(1, duration - 1))}
          >
            <Icon name="minus" size={14} />
          </button>
          <button
            type="button"
            aria-label="Increase trip duration"
            disabled={duration === 7}
            onClick={() => onDurationChange(Math.min(7, duration + 1))}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PromptBox({
  value,
  onChange,
  onSubmit,
  animatedPrompt,
  compact = false,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  animatedPrompt?: string
  compact?: boolean
}) {
  const active = value.trim().length > 0

  return (
    <form className={`prompt-box ${compact ? 'compact' : ''}`} onSubmit={onSubmit}>
      <div className="prompt-mark" aria-hidden="true">
        <Icon name="sparkles" size={17} />
      </div>
      <div className="input-wrap">
        {!value && animatedPrompt && (
          <span className="typed-placeholder">
            {animatedPrompt}
            <span className="cursor" />
          </span>
        )}
        <input
          aria-label="Describe your trip"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={animatedPrompt ? '' : 'Ask Wander to refine your trip…'}
        />
      </div>
      <button
        className={`send-button ${active ? 'active' : ''}`}
        type="submit"
        disabled={!active}
        aria-label="Plan my trip"
      >
        <Icon name="arrow-up" size={19} />
      </button>
    </form>
  )
}

function LocationField({ city, onChange }: { city: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(city)

  const commit = () => {
    const trimmed = draft.trim()
    onChange(trimmed || city)
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        className="location-button"
        onSubmit={(event) => {
          event.preventDefault()
          commit()
        }}
      >
        <Icon name="map-pin" size={15} />
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          aria-label="Destination city"
        />
      </form>
    )
  }

  return (
    <button
      className="location-button"
      type="button"
      onClick={() => {
        setDraft(city)
        setEditing(true)
      }}
    >
      <Icon name="map-pin" size={15} /> {city}
    </button>
  )
}

function AddToTimetable({
  item,
  city,
  tripDays,
  timetable,
  onAdd,
  onRemove,
}: {
  item: ItineraryItem
  city: string
  tripDays: string[]
  timetable: TimetableEntry[]
  onAdd: (entry: TimetableEntry) => void
  onRemove: (id: string, day: string) => void
}) {
  const [day, setDay] = useState(tripDays[0])
  const [time, setTime] = useState(DEFAULT_TIME)

  useEffect(() => {
    if (!tripDays.includes(day)) setDay(tripDays[0])
  }, [tripDays, day])

  const added = timetable.some((entry) => entry.id === item.id && entry.day === day)

  return (
    <div className="add-to-timetable">
      {tripDays.length > 1 && (
        <select value={day} onChange={(event) => setDay(event.target.value)} aria-label={`Day to visit ${item.title}`}>
          {tripDays.map((tripDay) => (
            <option key={tripDay} value={tripDay}>{formatShortDate(tripDay)}</option>
          ))}
        </select>
      )}
      <input
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
        aria-label={`Time to visit ${item.title}`}
      />
      {added ? (
        <button type="button" className="added" onClick={() => onRemove(item.id, day)}>
          <Icon name="close" size={12} /> Remove from timetable
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAdd({
            id: item.id,
            city,
            day,
            time,
            title: item.title,
            tag: item.tag,
            icon: item.icon,
            citationHref: item.citations[0]?.href,
          })}
        >
          <Icon name="plus" size={12} /> Add to timetable
        </button>
      )}
    </div>
  )
}

function TimetablePanel({
  entries,
  onClose,
  onRemove,
}: {
  entries: TimetableEntry[]
  onClose: () => void
  onRemove: (id: string, day: string) => void
}) {
  const groups = groupTimetableByDay(entries)

  return (
    <div className="timetable-overlay" role="dialog" aria-modal="true" aria-label="Your timetable" onClick={onClose}>
      <div className="timetable-panel" onClick={(event) => event.stopPropagation()}>
        <div className="timetable-header">
          <h2>Your timetable</h2>
          <button type="button" onClick={onClose} aria-label="Close timetable">
            <Icon name="close" size={16} />
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="timetable-empty">
            You haven't added any places yet. Pick a time on any recommendation to start building your schedule.
          </p>
        ) : (
          <div className="timetable-days">
            {groups.map(([day, dayEntries]) => (
              <div className="timetable-day" key={day}>
                <h3>{formatShortDate(day)}</h3>
                <ul>
                  {dayEntries.map((entry) => (
                    <li key={`${entry.id}-${entry.day}`}>
                      <span className="timetable-time">{formatTimeLabel(entry.time)}</span>
                      <span className="timetable-icon"><Icon name={entry.icon} size={15} /></span>
                      <span className="timetable-title">
                        {entry.title}
                        <small>{entry.city}</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(entry.id, entry.day)}
                        aria-label={`Remove ${entry.title} from timetable`}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState<'landing' | 'chat'>('landing')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [promptIndex, setPromptIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [tripDate, setTripDate] = useState(getDefaultDate)
  const [duration, setDuration] = useState(2)
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null)
  const [placesByCategory, setPlacesByCategory] = useState<{ category: string; places: PlaceData[] }[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [city, setCity] = useState('Seattle')
  const [timetable, setTimetable] = useState<TimetableEntry[]>(loadTimetable)
  const [showTimetable, setShowTimetable] = useState(false)

  const researchSteps = getResearchSteps(city)

  useEffect(() => {
    window.localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(timetable))
  }, [timetable])

  const addToTimetable = (entry: TimetableEntry) => {
    setTimetable((current) => [
      ...current.filter((existing) => !(existing.id === entry.id && existing.day === entry.day)),
      entry,
    ])
  }

  const removeFromTimetable = (id: string, day: string) => {
    setTimetable((current) => current.filter((entry) => !(entry.id === id && entry.day === day)))
  }

  useEffect(() => {
    if (screen !== 'landing' || input) return
    const prompt = samplePrompts[promptIndex]
    const atEnd = typed === prompt
    const atStart = typed.length === 0
    const delay = atEnd && !deleting ? 1450 : deleting ? 24 : 48

    const timer = window.setTimeout(() => {
      if (atEnd && !deleting) {
        setDeleting(true)
      } else if (deleting && atStart) {
        setDeleting(false)
        setPromptIndex((current) => (current + 1) % samplePrompts.length)
      } else {
        setTyped(
          deleting
            ? prompt.slice(0, Math.max(typed.length - 1, 0))
            : prompt.slice(0, typed.length + 1),
        )
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [deleting, input, promptIndex, screen, typed])

  useEffect(() => {
    if (screen !== 'chat' || showResults) return
    if (statusIndex >= RESEARCH_STEP_COUNT - 1) return
    const timer = window.setTimeout(() => setStatusIndex((current) => current + 1), 850)
    return () => window.clearTimeout(timer)
  }, [screen, showResults, statusIndex])

  useEffect(() => {
    if (screen !== 'chat' || showResults) return
    if ((forecast && placesByCategory) || loadError) setShowResults(true)
  }, [screen, showResults, forecast, placesByCategory, loadError])

  const startTrip = (event: FormEvent) => {
    event.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    setQuery(trimmedInput)
    setInput('')
    setStatusIndex(0)
    setShowResults(false)
    setForecast(null)
    setPlacesByCategory(null)
    setLoadError(null)
    setScreen('chat')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const categories = categoriesForQuery(trimmedInput)

    Promise.all([
      fetchForecast(city),
      Promise.allSettled(categories.map((category) => fetchPlaces(city, category))),
    ])
      .then(([forecastResult, settledPlaces]) => {
        const successful = categories
          .map((category, index) => ({ category, result: settledPlaces[index] }))
          .filter(
            (entry): entry is { category: string; result: PromiseFulfilledResult<PlaceData[]> } =>
              entry.result.status === 'fulfilled',
          )
          .map(({ category, result }) => ({ category, places: result.value }))

        setForecast(forecastResult)
        setPlacesByCategory(successful)

        if (successful.length === 0) {
          setLoadError(`Couldn't find any places for "${trimmedInput}" in ${city}.`)
        }
      })
      .catch((error: Error) => {
        setLoadError(error.message)
      })
  }

  if (screen === 'chat') {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${tripDate}T12:00:00Z`))

    const tripDays = tripDateList(tripDate, duration)
    const forecastByDate = new Map((forecast ?? []).map((day) => [day.date, day]))

    return (
      <main className="chat-page">
        <header className="topbar">
          <button className="brand" onClick={() => setScreen('landing')} type="button">
            <span className="brand-symbol"><Icon name="plane" size={19} /></span>
            Wander
          </button>
          <div className="topbar-actions">
            <button className="timetable-button" onClick={() => setShowTimetable(true)} type="button">
              <Icon name="calendar" size={16} /> My Timetable{timetable.length > 0 ? ` · ${timetable.length}` : ''}
            </button>
            <button className="new-trip" onClick={() => setScreen('landing')} type="button">
              <Icon name="plus" size={16} /> New trip
            </button>
          </div>
        </header>

        <div className="chat-shell">
          <button className="back-link" onClick={() => setScreen('landing')} type="button">
            <Icon name="arrow-left" size={15} /> Back to home
          </button>

          <section className="conversation">
            <div className="user-message">
              <span>{query}</span>
              <small><Icon name="calendar" size={12} /> {formattedDate} · {duration} {duration === 1 ? 'day' : 'days'}</small>
            </div>

            <div className="assistant-block">
              {!showResults ? (
                <div className="thinking">
                  <div className="thinking-mark" aria-hidden="true">
                    <Icon name="sparkles" size={22} />
                  </div>
                  <div className="thinking-copy">
                    <p key={statusIndex}>{researchSteps[statusIndex].text}</p>
                    <div className="thinking-meta">
                      <span className="thinking-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <small>Researching live sources</small>
                    </div>
                  </div>
                </div>
              ) : loadError ? (
                <div className="results">
                  <div className="result-intro">
                    <h1>Couldn't load your {city} trip.</h1>
                    <p>{loadError}</p>
                  </div>
                </div>
              ) : (
                <div className="results">
                  <div className="result-intro">
                    <div className="weather-row">
                      {tripDays.map((date) => {
                        const day = forecastByDate.get(date)
                        return (
                          <div className="weather-pill" key={date}>
                            <Icon name="cloud-rain" size={16} />{' '}
                            {formatShortDate(date)} ·{' '}
                            {day
                              ? `${Math.round(day.tempMin)}–${Math.round(day.tempMax)}°F · ${day.weather}`
                              : 'Forecast not available yet'}
                          </div>
                        )
                      })}
                    </div>
                    <h1>Your {city} {duration === 1 ? 'day' : 'trip'}, made around you.</h1>
                    <p>
                      I planned around the forecast for your {duration === 1 ? 'day' : `${duration}-day trip`} in {city}, starting {formattedDate}.
                    </p>
                  </div>

                  <div className="timeline-groups">
                    {(placesByCategory ?? []).map(({ category, places: categoryPlaces }) => (
                      <section className="timeline-group" key={category}>
                        {(placesByCategory?.length ?? 0) > 1 && (
                          <h2 className="timeline-group-title">{categoryLabel(category)}</h2>
                        )}
                        <div className="timeline">
                          {buildItinerary(categoryPlaces, city).map((item) => (
                              <article className="recommendation" key={item.id}>
                                <div className="timeline-dot"><Icon name={item.icon} size={17} /></div>
                                <div className="recommendation-card">
                                  <div className="card-heading">
                                    <h2>{item.title}</h2>
                                    <span>{item.tag}</span>
                                  </div>
                                  <p>{item.detail}</p>
                                  <div className="citations-panel">
                                    <div className="citations-label">
                                      <Icon name="external" size={12} />
                                      Verified sources
                                    </div>
                                    <div className="citation-links">
                                      {item.citations.map((citation, index) => (
                                        <a href={citation.href} target="_blank" rel="noreferrer" key={citation.href}>
                                          <span>{index + 1}</span>
                                          {citation.label}
                                          <Icon name="external" size={11} />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                  <AddToTimetable
                                    item={item}
                                    city={city}
                                    tripDays={tripDays}
                                    timetable={timetable}
                                    onAdd={addToTimetable}
                                    onRemove={removeFromTimetable}
                                  />
                                </div>
                              </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="chat-composer">
            <TripControls
              date={tripDate}
              duration={duration}
              onDateChange={setTripDate}
              onDurationChange={setDuration}
            />
            <PromptBox
              value={input}
              onChange={setInput}
              onSubmit={startTrip}
              compact
            />
            <span>Wander can make mistakes. Check linked sources before you go.</span>
          </div>
        </div>
        {showTimetable && (
          <TimetablePanel
            entries={timetable}
            onClose={() => setShowTimetable(false)}
            onRemove={removeFromTimetable}
          />
        )}
      </main>
    )
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-symbol"><Icon name="plane" size={19} /></span>
          Wander
        </div>
        <div className="landing-nav-actions">
          <button className="timetable-button" onClick={() => setShowTimetable(true)} type="button">
            <Icon name="calendar" size={16} /> My Timetable{timetable.length > 0 ? ` · ${timetable.length}` : ''}
          </button>
          <LocationField city={city} onChange={setCity} />
        </div>
      </header>

      <section className="hero-section">
        <div className="atmosphere" />
        <div className="globe" aria-hidden="true"><div /></div>
        <div className="hero-content">
          <h1>The city, <em>made for you.</em></h1>
          <PromptBox
            value={input}
            onChange={setInput}
            onSubmit={startTrip}
            animatedPrompt={typed}
          />
          <TripControls
            date={tripDate}
            duration={duration}
            onDateChange={setTripDate}
            onDurationChange={setDuration}
          />
          <p className="prompt-hint">Share your dates, interests, and destination</p>
        </div>
      </section>

      <section className="continue-section">
        <div className="section-title">
          <div>
            <span>Your journeys</span>
            <h2>Continue where you left off</h2>
          </div>
          <button type="button">View all · 0 <Icon name="chevron-right" size={15} /></button>
        </div>
        <div className="journey-grid">
          <button className="new-journey-card" onClick={() => document.querySelector('input')?.focus()} type="button">
            <span><Icon name="plus" size={21} /></span>
            <span className="sr-only">Start a new journey</span>
          </button>
        </div>
      </section>
      {showTimetable && (
        <TimetablePanel
          entries={timetable}
          onClose={() => setShowTimetable(false)}
          onRemove={removeFromTimetable}
        />
      )}
    </main>
  )
}

export default App
