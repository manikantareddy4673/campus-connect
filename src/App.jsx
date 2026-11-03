import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin, Search, UserRound, CalendarPlus, ArrowLeft, Check, ArrowRight, Mail, LockKeyhole, X, Ticket, Users, Sparkles, ChevronDown, Menu, LogOut, LoaderCircle, QrCode, SlidersHorizontal } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { demoEvents } from './data/events'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const categories = ['All Events', 'Tech', 'Cultural', 'Sports', 'Workshops', 'Other']
const icons = { 'All Events': Sparkles, Tech: SlidersHorizontal, Cultural: CalendarDays, Sports: Users, Workshops: CalendarPlus, Other: Ticket }

function dateParts(value) {
  const d = new Date(value)
  return { day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d), month: new Intl.DateTimeFormat('en', { month: 'short' }).format(d), full: new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(d), time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(d) }
}
function money(value) { return Number(value) === 0 ? 'Free' : `₹ ${Number(value).toLocaleString('en-IN')}` }

function App() {
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [events, setEvents] = useState(demoEvents)
  const [view, setView] = useState('home')
  const [activeEvent, setActiveEvent] = useState(null)
  const [category, setCategory] = useState('All Events')
  const [search, setSearch] = useState('')
  const [authOpen, setAuthOpen] = useState(!isSupabaseConfigured)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [confirmation, setConfirmation] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadEvents() {
      if (!isSupabaseConfigured) return
      const { data, error } = await supabase.from('campus_events').select('*').eq('is_published', true).order('starts_at')
      if (!cancelled && !error && data?.length) setEvents(data.map(e => ({ ...e, date: e.starts_at, end_date: e.ends_at, image_url: e.image_url || demoEvents.find(x => x.category === e.category)?.image_url })))
    }
    loadEvents()
    return () => { cancelled = true }
  }, [])

  const shownEvents = useMemo(() => events.filter(e => (category === 'All Events' || e.category === category) && `${e.title} ${e.category} ${e.venue} ${dateParts(e.date).month} ${dateParts(e.date).full}`.toLowerCase().includes(search.toLowerCase())), [events, category, search])

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setNotice('')
    if (!isSupabaseConfigured) {
      setSession({ user: { email: authEmail || 'guest@campus.edu' } }); setAuthOpen(false); setBusy(false); setNotice('You’re exploring the preview. Connect Supabase to enable real accounts.'); return
    }
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword })
    setBusy(false)
    if (result.error) { setNotice(result.error.message); return }
    if (authMode === 'signup' && !result.data.session) setNotice('Account created. Check your email to confirm your account, then sign in.')
    else setAuthOpen(false)
  }

  async function signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setSession(null); setAuthOpen(true); setView('home'); setConfirmation(null)
  }

  async function reserveSpot() {
    if (!session) { setAuthOpen(true); return }
    setBusy(true); setNotice('')
    const code = `EH-${new Date(activeEvent.date).getDate()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('campus_registrations').insert({ event_id: activeEvent.id, user_id: session.user.id, confirmation_code: code, payment_method: Number(activeEvent.price) > 0 ? paymentMethod : null, amount_due: Number(activeEvent.price) })
      if (error) { setBusy(false); setNotice(error.code === '23505' ? 'You’re already registered for this event.' : error.message); return }
    }
    setConfirmation({ code, event: activeEvent, paymentMethod })
    setBusy(false); setView('confirmation'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEvent(event) { setActiveEvent(event); setView('detail'); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function goHome() { setView('home'); setActiveEvent(null); setConfirmation(null); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="app-shell">
    {authOpen ? <AuthScreen mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} submit={submitAuth} busy={busy} notice={notice} onClose={() => { setAuthOpen(false); if (!session) setNotice('Sign in to register. You can still browse events.') }} configured={isSupabaseConfigured} /> : <>
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="EventHub home"><span className="brand-mark"><CalendarDays size={19}/></span><span>Event<span className="brand-strong">Hub</span></span></button>
        <button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu/></button>
        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
          <button onClick={goHome} className={view === 'home' ? 'nav-link selected' : 'nav-link'}>Home</button>
          <button onClick={() => { setView('home'); document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' }) }} className={view === 'home' ? 'nav-link' : 'nav-link selected'}>Events</button>
          <button onClick={() => setNotice('EventHub brings your campus community together through events and shared experiences.')} className="nav-link">About</button>
          <a href="mailto:hello@eventhub.campus" className="nav-link">Contact</a>
        </nav>
        <button className="profile-button" onClick={() => session ? signOut() : setAuthOpen(true)} title={session ? 'Sign out' : 'Sign in'}>{session ? <LogOut size={18}/> : <UserRound size={19}/>}</button>
      </header>
      {notice && view !== 'detail' && view !== 'checkout' && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

      {view === 'home' && <main className="page-layout" id="event-list">
        <aside className="sidebar">
          <div className="sidebar-title">Explore</div>
          <div className="category-list">{categories.map(name => { const Icon = icons[name]; return <button key={name} onClick={() => setCategory(name)} className={`category-button ${category === name ? 'active' : ''}`}><Icon size={17}/><span>{name}</span>{category === name && <span className="active-dot"/>}</button> })}</div>
          <div className="sidebar-card"><span className="sidebar-card-icon"><Sparkles size={17}/></span><strong>Make campus memories</strong><span>Find your people. Try something new.</span><button onClick={() => setCategory('All Events')}>Explore events <ArrowRight size={14}/></button></div>
        </aside>
        <section className="event-content">
          <div className="page-heading"><div><div className="eyebrow">YOUR CAMPUS, YOUR MOMENTS</div><h1>Upcoming events</h1><p>Discover what’s happening and find your next favorite thing.</p></div><label className="search-box"><Search size={18}/><input aria-label="Search events" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button>}</label></div>
          <div className="mobile-categories">{categories.map(name => <button key={name} onClick={() => setCategory(name)} className={category === name ? 'chip active' : 'chip'}>{name}</button>)}</div>
          <div className="results-meta"><span>{category === 'All Events' ? 'All events' : category}<span className="result-count"> · {shownEvents.length} {shownEvents.length === 1 ? 'event' : 'events'}</span></span><button className="date-filter" onClick={() => setSearch(search === 'nov' ? '' : 'nov')}><CalendarDays size={15}/> November <ChevronDown size={14}/></button></div>
          {shownEvents.length ? <div className="event-grid">{shownEvents.map(event => <EventCard key={event.id} event={event} onClick={() => openEvent(event)}/>)}</div> : <div className="empty-state"><Search size={26}/><h3>No events found</h3><p>Try a different search or category.</p><button className="text-button" onClick={() => { setSearch(''); setCategory('All Events') }}>Clear filters</button></div>}
          <footer className="page-footer"><span>© 2026 EventHub · Made for campus life</span><span>Discover · Connect · Celebrate</span></footer>
        </section>
      </main>}

      {view === 'detail' && activeEvent && <main className="detail-wrap">
        <button className="back-link" onClick={goHome}><ArrowLeft size={16}/> Back to events</button>
        <div className="detail-grid">
          <section className="detail-main">
            <div className="detail-cover" style={{ backgroundImage: `linear-gradient(0deg,rgba(18,17,35,.6),transparent 70%),url("${activeEvent.image_url}")` }}><span className="cover-category">{activeEvent.category}</span></div>
            <div className="detail-copy"><div className="eyebrow">CAMPUS EVENT</div><h1>{activeEvent.title}</h1><div className="event-info-row"><span><CalendarDays size={16}/>{dateParts(activeEvent.date).full}</span><span><Clock3 size={16}/>{dateParts(activeEvent.date).time}{activeEvent.end_date ? ` – ${dateParts(activeEvent.end_date).time}` : ''}</span><span><MapPin size={16}/>{activeEvent.venue}</span></div><p className="detail-description">{activeEvent.description}</p><div className="what-you-get"><h3>What you’ll get</h3>{(activeEvent.perks || ['A memorable campus experience', 'Meet and connect with students', 'A welcoming community']).map(item => <div key={item}><Check size={16}/>{item}</div>)}</div><div className="organizer"><div className="organizer-avatar"><Users size={18}/></div><div><span>Event organizer</span><strong>{activeEvent.organizer || 'Campus Community'}</strong></div><button onClick={() => setNotice(`Organizer: ${activeEvent.organizer || 'Campus Community'}`)}>View profile <ArrowRight size={14}/></button></div></div>
          </section>
          <aside className="booking-card"><div className="booking-top"><span>Ticket price</span><strong>{money(activeEvent.price)}</strong></div><div className="seats-pill"><span className="seat-pulse"/>{activeEvent.seats_left || 18} spots remaining</div><div className="booking-divider"/><h3>Your registration</h3><div className="booking-fact"><CalendarDays size={16}/><span>{dateParts(activeEvent.date).full}<small>{dateParts(activeEvent.date).time}</small></span></div><div className="booking-fact"><MapPin size={16}/><span>{activeEvent.venue}<small>Campus venue</small></span></div>
            {Number(activeEvent.price) > 0 && <><div className="payment-title">Payment option <span>Demo only</span></div><div className="payment-options">{['UPI', 'Card', 'Net Banking', 'Wallet'].map((method, i) => <label key={method} className={`payment-option ${paymentMethod === method ? 'chosen' : ''}`}><input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)}/><span className="radio-dot"/><span className="payment-symbol">{['↗', '▣', '⌂', '◉'][i]}</span>{method}</label>)}</div><p className="payment-note">This is a visual demo. No real payment is collected.</p></>}
            {notice && <div className="inline-notice" role="alert">{notice}</div>}<button className="primary-button reserve-button" onClick={reserveSpot} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{busy ? 'Reserving...' : Number(activeEvent.price) > 0 ? 'Continue to registration' : 'Register for free'}<ArrowRight size={16}/></button><p className="secure-note"><LockKeyhole size={13}/> Your spot will be saved to your account</p></aside>
        </div>
      </main>}

      {view === 'confirmation' && confirmation && <main className="confirmation-page"><div className="confetti confetti-one"/><div className="confetti confetti-two"/><div className="success-check"><Check size={30}/></div><div className="eyebrow">YOU’RE ON THE LIST</div><h1>Thanks for registering!</h1><p className="confirmation-sub">Your place for <strong>{confirmation.event.title}</strong> is confirmed.</p><div className="ticket-card"><div className="qr-column"><QRCodeSVG value={`EVENTHUB:${confirmation.code}:${confirmation.event.id}`} size={130} level="M" includeMargin/><span><QrCode size={14}/> Scan at the event</span></div><div className="ticket-details"><span className="ticket-label"><MapPin size={13}/> YOUR EVENT PASS</span><small>Confirmation code</small><strong className="ticket-code">{confirmation.code}</strong><div className="ticket-line"><CalendarDays size={15}/>{dateParts(confirmation.event.date).full}</div><div className="ticket-line"><Clock3 size={15}/>{dateParts(confirmation.event.date).time}</div><div className="ticket-line"><MapPin size={15}/>{confirmation.event.venue}</div></div></div><button className="primary-button home-button" onClick={goHome}><ArrowLeft size={16}/> Back to events</button><p className="confirmation-caption">We can’t wait to see you there.</p></main>}
    </>}
    {!isSupabaseConfigured && !authOpen && <div className="demo-badge"><span/> Preview mode <button onClick={() => setAuthOpen(true)}>Connect account</button></div>}
  </div>
}

function EventCard({ event, onClick }) {
  const dt = dateParts(event.date)
  return <article className="event-card" onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick()} role="button" tabIndex={0}>
    <div className="event-image" style={{ backgroundImage: `linear-gradient(0deg,rgba(16,15,27,.08),transparent),url("${event.image_url}")` }}><span className="event-date"><strong>{dt.day}</strong><span>{dt.month}</span></span><span className="event-category">{event.category}</span><button className="save-event" aria-label={`View ${event.title}`} onClick={e => { e.stopPropagation(); onClick() }}><CalendarPlus size={16}/></button></div>
    <div className="event-card-body"><div className="card-title-row"><h2>{event.title}</h2><span className="card-price">{money(event.price)}</span></div><div className="card-meta"><span><Clock3 size={14}/>{dt.time}{event.end_date ? ` – ${dateParts(event.end_date).time}` : ''}</span><span><MapPin size={14}/>{event.venue}</span></div><div className="card-bottom"><span className="organizer-mini"><span className="mini-avatar">{(event.organizer || 'C')[0]}</span>{event.organizer || 'Campus Community'}</span><button className="details-link" onClick={e => { e.stopPropagation(); onClick() }}>View details <ArrowRight size={14}/></button></div></div>
  </article>
}

function AuthScreen({ mode, setMode, email, setEmail, password, setPassword, submit, busy, notice, onClose, configured }) {
  return <main className="auth-screen"><section className="auth-card"><div className="auth-form-panel"><div className="auth-brand"><span className="brand-mark"><CalendarDays size={19}/></span>Event<span className="brand-strong">Hub</span></div><div className="auth-copy"><span className="eyebrow">YOUR CAMPUS, CLOSER</span><h1>{mode === 'login' ? 'Welcome back!' : 'Join EventHub'}</h1><p>{mode === 'login' ? 'Log in to your account and continue to your favorite events.' : 'Create an account and discover what’s happening on campus.'}</p></div><form onSubmit={submit} className="auth-form"><label className="input-wrap"><Mail size={17}/><input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/></label><label className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label><button className="primary-button auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</button>{notice && <p className="auth-notice" role="alert">{notice}</p>}</form><div className="auth-switch">{mode === 'login' ? 'Don’t have an account?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login') }}>{mode === 'login' ? 'Sign up' : 'Log in'}</button></div><div className="auth-privacy"><LockKeyhole size={13}/>{configured ? 'Your account is secured by Supabase' : 'Preview mode — account setup pending'}</div></div><div className="auth-art"><div className="art-overlay"/><div className="art-topline"><span>✦ &nbsp; CAMPUS LIFE, CONNECTED</span><span className="art-orbit">✦</span></div><div className="art-message"><span className="art-kicker">THERE’S ALWAYS SOMETHING HAPPENING</span><h2>Great events.<br/>New friends.<br/><em>Great memories.</em></h2><span className="scribble"/><p>Your next favorite campus moment starts here.</p></div><div className="art-bottom"><span><Users size={15}/> Find your community</span><span><CalendarDays size={15}/> Make it memorable</span></div></div></section><button className="auth-close" onClick={onClose} aria-label="Close sign in"><X size={18}/></button></main>
}

export default App
