import { useState, useEffect, useRef, useCallback } from 'react'
import './UserSegmentation.css'
import ComparisonChart from './ComparisonChart'
import SegmentUsersTable from './SegmentUsersTable'
import API, { BASE_URL } from '../../services/api'

const SEGMENTS = [
  {
    key: 'new_active',
    label: 'New Active',
    description: 'Joined in the last 30 days & made a booking',
    icon: '✦',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.25)',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    key: 'new_inactive',
    label: 'New Inactive',
    description: 'Joined in the last 30 days & no booking yet',
    icon: '◈',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    key: 'active',
    label: 'Active',
    description: 'Booked within the last 30 days',
    icon: '⬡',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.25)',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
  },
  {
    key: 'dormant',
    label: 'Dormant',
    description: 'Last booking between 30–90 days ago',
    icon: '◎',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.25)',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
  },
  {
    key: 'churned',
    label: 'Churned',
    description: 'No booking in the last 90 days or never booked',
    icon: '✕',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.25)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
]

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function AnimatedCount({ value, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === null || value === undefined) return
    let start = 0
    const end = Math.floor(value)
    if (end === 0) { setDisplay(0); return }
    const duration = 1000
    const step = Math.ceil(end / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setDisplay(end)
        clearInterval(timer)
      } else {
        setDisplay(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{formatNumber(display)}{suffix}</span>
}

function SegmentCard({ segment, value, loading, total, onClick }) {
  const pct = total > 0 && value !== null && value !== undefined
    ? ((value / total) * 100).toFixed(1)
    : 0
  const isLoading = loading || value === null || value === undefined

  return (
    <div
      className="segment-card clickable"
      onClick={() => {
        console.log("Segment Card Clicked:", segment.key);
        if (onClick) onClick(segment);
      }}
      style={{
        '--card-color': segment.color,
        '--card-glow': segment.glow,
        '--card-bg': segment.bg,
        '--card-border': segment.border,
        cursor: 'pointer'
      }}
    >
      <div className="card-top">
        <span className="card-icon">{segment.icon}</span>
        <span className="card-pct">{isLoading ? '…' : `${pct}%`}</span>
      </div>
      <div className="card-count">
        {isLoading
          ? <span className="skeleton" />
          : <AnimatedCount value={value} />
        }
      </div>
      <div className="card-label">{segment.label} &rarr;</div>
      <div className="card-desc">{segment.description}</div>
      <div className="card-bar">
        <div
          className="card-bar-fill"
          style={{ width: isLoading ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

function TrendBadge({ value, isInverse = false }) {
  if (value === null || value === undefined || value === 0) return null
  const isPositive = value > 0
  const color = isPositive ? (isInverse ? '#ef4444' : '#22c55e') : (isInverse ? '#22c55e' : '#ef4444')
  const icon = isPositive ? '↗' : '↘'
  
  return (
    <div className="trend-badge" style={{ color, background: `${color}15`, borderColor: `${color}30` }}>
      {icon} {Math.abs(value)}%
    </div>
  )
}

function MetricCard({ label, value, subValue, prevValue, trend, loading, suffix = '', prefix = '', icon = '', isInverse = false }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className="metric-header-left">
          <span className="metric-icon">{icon}</span>
          <span className="metric-label">{label}</span>
        </div>
        <TrendBadge value={trend} isInverse={isInverse} />
      </div>
      <div className="metric-value-container">
        <div className="metric-value">
          {loading ? <span className="skeleton wide" /> : <AnimatedCount value={value} suffix={suffix} prefix={prefix} />}
        </div>
        {!loading && subValue && (
          <div className="metric-sub">{subValue}</div>
        )}
      </div>
      {!loading && prevValue !== undefined && (
        <div className="metric-prev">
          vs {prefix}{formatNumber(prevValue)}{suffix} prev.
        </div>
      )}
    </div>
  )
}


// --- ICONS ---
const IconSessions = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
  </svg>
)
const IconSuccess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IconRevenue = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)
const IconEnergy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconArpu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
)

const INITIAL_DATA = { new_active: null, new_inactive: null, active: null, dormant: null, churned: null }

export default function App() {
  const [data, setData] = useState(INITIAL_DATA)
  const [metrics, setMetrics] = useState(null)
  const [timeframe, setTimeframe] = useState('monthly')
  const [selectedRoles, setSelectedRoles] = useState(['customer', 'fleet'])
  const [done, setDone] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeSegmentView, setActiveSegmentView] = useState(null)
  const esRef = useRef(null)

  const toggleRole = (role) => {
    setSelectedRoles(prev => {
      const next = prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
      return next
    })
  }

  const roleQuery = selectedRoles.join(',')

  async function fetchMetrics() {
    setMetricsLoading(true)
    try {
      const res = await API.get(`/metrics?role=${roleQuery}`)
      const json = res.data
      setMetrics(json)
    } catch (e) {
      console.error('Failed to fetch metrics', e)
    } finally {
      setMetricsLoading(false)
    }
  }

  const startStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setData(INITIAL_DATA)
    setDone(false)
    setError(null)
    fetchMetrics()

    const token = localStorage.getItem('token');
    const es = new EventSource(`${BASE_URL}/segments/stream?role=${roleQuery}&token=${token}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const { key, value } = JSON.parse(e.data)
        if (key === '__done__') {
          setDone(true)
          setLastUpdated(new Date())
          es.close()
          esRef.current = null
        } else if (key === '__error__') {
          setError(value)
          es.close()
          esRef.current = null
        } else {
          setData(prev => ({ ...prev, [key]: value }))
        }
      } catch (_) {}
    }

    es.onerror = () => {
      if (esRef.current !== null) {
        setError('Connection lost. Is the server running?')
        es.close()
        esRef.current = null
      }
    }
  }, [roleQuery])

  useEffect(() => {
    startStream()
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [startStream])

  const totalUsers = Object.values(data).reduce((acc, v) => acc + (v ?? 0), 0)
  const allLoading = Object.values(data).every(v => v === null)

  const m = metrics?.[timeframe] || {}
  const cur = m.current || {}
  const prev = m.previous || {}
  const tr = m.trends || {}

  const getSuccessRate = (data) => {
    if (!data?.total_sessions || data.total_sessions === 0) return null
    return `${((data.successful_sessions / data.total_sessions) * 100).toFixed(1)}%`
  }
  const curSuccessRate = getSuccessRate(cur)

  if (activeSegmentView) {
    return (
      <SegmentUsersTable 
         segment={activeSegmentView} 
         selectedRoles={selectedRoles} 
         onClose={() => setActiveSegmentView(null)} 
      />
    );
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="header-left">
          <div className="header-badge">ANALYTICS</div>
          <h1>Platform Insights</h1>
          <p className="header-sub">Comprehensive overview of user health and charging metrics</p>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="role-filters">
            <label className="role-checkbox">
              <input 
                type="checkbox" 
                checked={selectedRoles.includes('customer')} 
                onChange={() => toggleRole('customer')} 
              />
              <span className="role-label">Customer</span>
            </label>
            <label className="role-checkbox">
              <input 
                type="checkbox" 
                checked={selectedRoles.includes('fleet')} 
                onChange={() => toggleRole('fleet')} 
              />
              <span className="role-label">Fleet</span>
            </label>
          </div>
          <button className="refresh-btn" onClick={startStream} disabled={!done && !error}>
            <span className={!done && !error ? 'spin' : ''}>↻</span>
            {!done && !error ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠ {error}
        </div>
      )}

      {/* User Segmentation Section */}
      <section className="dash-section">
        <div className="section-header">
          <h2>User Segmentation</h2>
          <div className="total-badge">
            {allLoading ? <span className="skeleton" /> : <AnimatedCount value={totalUsers} />} Users
          </div>
        </div>
        
        <div className="cards-grid">
          {SEGMENTS.map((seg) => (
            <SegmentCard
              key={seg.key}
              segment={seg}
              value={data[seg.key]}
              loading={data[seg.key] === null}
              total={totalUsers}
              onClick={setActiveSegmentView}
            />
          ))}
        </div>
      </section>

      {/* Platform Metrics Section */}
      <section className="dash-section">
        <div className="section-header">
          <h2>Performance Metrics</h2>
          <div className="tabs">
            {['daily', 'weekly', 'monthly'].map(t => (
              <button 
                key={t}
                className={`tab-btn ${timeframe === t ? 'active' : ''}`}
                onClick={() => setTimeframe(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard 
            label="Total Sessions" 
            value={cur.total_sessions} 
            prevValue={prev.total_sessions}
            trend={tr.total_sessions}
            loading={metricsLoading} 
            icon={<IconSessions />}
          />
          <MetricCard 
            label="Successful Sessions" 
            value={cur.successful_sessions} 
            subValue={curSuccessRate}
            prevValue={prev.successful_sessions}
            trend={tr.successful_sessions}
            loading={metricsLoading} 
            icon={<IconSuccess />}
          />

          <MetricCard 
            label="Revenue" 
            value={cur.total_revenue} 
            prevValue={prev.total_revenue}
            trend={tr.total_revenue}
            loading={metricsLoading} 
            prefix="₹" 
            icon={<IconRevenue />}
          />
          <MetricCard 
            label="Energy Consumed" 
            value={cur.total_units} 
            prevValue={prev.total_units}
            trend={tr.total_units}
            loading={metricsLoading} 
            suffix=" kWh" 
            icon={<IconEnergy />}
          />
          <MetricCard 
            label="Active Users" 
            value={cur.active_users} 
            prevValue={prev.active_users}
            trend={tr.active_users}
            loading={metricsLoading} 
            icon={<IconUsers />}
          />
          <MetricCard 
            label="ARPU" 
            value={cur.arpu} 
            prevValue={prev.arpu}
            trend={tr.arpu}
            loading={metricsLoading} 
            prefix="₹" 
            icon={<IconArpu />}
          />
        </div>
      </section>

      {/* Advanced Comparison Chart Section */}
      <section className="dash-section">
        <ComparisonChart selectedRoles={selectedRoles} />
      </section>

      <footer className="dash-footer">
        EV Charging Platform Dashboard · Data sourced live from MongoDB
        <div className="streaming-status">
          {!done && !error && <span className="streaming-badge">⚡ Streaming live data...</span>}
        </div>
      </footer>
    </div>
  )
}

