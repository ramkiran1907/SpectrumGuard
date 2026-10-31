import React, { useState, useEffect } from 'react';
import './aerovision.css';
import VideoLandingPage from './VideoLandingPage';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Activity, 
  Wifi, 
  Satellite, 
  Clock, 
  Cpu, 
  RefreshCw, 
  Play, 
  RotateCcw,
  Sliders,
  Terminal,
  Zap,
  Eye,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function App() {
  // Navigation / View Tabs: 'video' | 'showcase' | 'spectrumguard' | 'both'
  const [activeTab, setActiveTab] = useState('video');
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Telemetry Form State
  const [telemetry, setTelemetry] = useState({
    packet_loss_percent: 45,
    rssi_dbm: -89,
    latency_ms: 420,
    gps_satellites: 6,
  });

  // Analysis Result State
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Operator Approval Workflow State: null | 'approved' | 'rejected'
  const [approvalState, setApprovalState] = useState(null);
  const [approvalTimestamp, setApprovalTimestamp] = useState(null);

  // Simulated RF Interference State: 'normal' | 'degraded' | 'jammed'
  const [simulatedState, setSimulatedState] = useState('degraded');
  const [isSimulatingTimeline, setIsSimulatingTimeline] = useState(false);

  // Presets
  const presets = {
    normal: {
      name: 'Normal Flight',
      desc: 'Clear ISM environment, strong signal & full GPS constellation',
      data: { packet_loss_percent: 2, rssi_dbm: -58, latency_ms: 35, gps_satellites: 14 },
    },
    degraded: {
      name: 'Degraded Link',
      desc: 'Multipath interference, rising packet loss & elevated latency',
      data: { packet_loss_percent: 28, rssi_dbm: -86, latency_ms: 310, gps_satellites: 9 },
    },
    jammed: {
      name: 'Jammed State',
      desc: 'High-power barrage jammer detected across 2.4 GHz band',
      data: { packet_loss_percent: 68, rssi_dbm: -97, latency_ms: 550, gps_satellites: 3 },
    },
  };

  // Toast Helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2400);
  };

  // Check backend health on mount
  useEffect(() => {
    fetchHealth();
    runAnalysis(telemetry);
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/`);
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('error');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  // Run POST /analyze
  const runAnalysis = async (inputData = telemetry) => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysis(result);
      setApprovalState(null);
      setApprovalTimestamp(null);
    } catch (err) {
      console.error('Analysis error:', err);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (key) => {
    const preset = presets[key];
    if (preset) {
      setSimulatedState(key);
      setTelemetry(preset.data);
      runAnalysis(preset.data);
      triggerToast(`Applied ${preset.name} telemetry`);
    }
  };

  const handleApprove = () => {
    setApprovalState('approved');
    setApprovalTimestamp(new Date().toLocaleTimeString());
    triggerToast('Countermeasure Approved by Operator');
  };

  const handleReject = () => {
    setApprovalState('rejected');
    setApprovalTimestamp(new Date().toLocaleTimeString());
    triggerToast('Countermeasure Rejected');
  };

  // Timeline Auto-Step Simulator
  useEffect(() => {
    if (!isSimulatingTimeline) return;
    const states = ['normal', 'degraded', 'jammed'];
    const timer = setInterval(() => {
      setSimulatedState((prev) => {
        const nextIdx = (states.indexOf(prev) + 1) % states.length;
        const nextState = states[nextIdx];
        const nextData = presets[nextState].data;
        setTelemetry(nextData);
        runAnalysis(nextData);
        return nextState;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [isSimulatingTimeline]);

  // Risk styling
  const getRiskStyle = (risk) => {
    switch (risk) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/40',
          border: 'border-rose-500/50',
          text: 'text-rose-400',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
          badge: 'bg-rose-600 text-white',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          badge: 'bg-amber-500 text-black font-bold',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-950/40',
          border: 'border-yellow-500/50',
          text: 'text-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.25)]',
          badge: 'bg-yellow-500 text-black font-semibold',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          badge: 'bg-emerald-500 text-black font-bold',
        };
    }
  };

  const riskStyle = analysis ? getRiskStyle(analysis.risk) : getRiskStyle('LOW');

  return (
    <>
      {activeTab === 'video' ? (
        <VideoLandingPage 
          onNavigateTab={setActiveTab} 
          backendStatus={backendStatus} 
          activeTab={activeTab} 
        />
      ) : (
        <div className="poster-wrapper">
          {/* ── TOP CONTROL & NAVIGATION BAR ── */}
          <nav className="top-nav">
            <div className="nav-brand">
              <span>DRONE X4</span>
              <span className="nav-badge">AEROVISION</span>
            </div>

            <div className="nav-links">
              <button 
                onClick={() => setActiveTab('video')}
                className={`nav-btn ${activeTab === 'video' ? 'active' : ''}`}
                style={{ background: '#06b6d4', color: '#000', fontWeight: 'bold' }}
              >
                🎬 Video Landing Page
              </button>
              <button 
                onClick={() => setActiveTab('showcase')}
                className={`nav-btn ${activeTab === 'showcase' ? 'active' : ''}`}
              >
                Product Showcase
              </button>
              <button 
                onClick={() => setActiveTab('both')}
                className={`nav-btn ${activeTab === 'both' ? 'active' : ''}`}
              >
                Showcase + RF Monitor
              </button>
              <button 
                onClick={() => setActiveTab('spectrumguard')}
                className={`nav-btn ${activeTab === 'spectrumguard' ? 'active' : ''}`}
              >
                🛡️ SpectrumGuard™ Copilot
              </button>
              <button 
                onClick={() => setShowReferenceModal(true)}
                className="nav-btn flex items-center gap-1"
                title="Inspect original UI design reference"
              >
                <Eye className="w-3.5 h-3.5" />
                Reference
              </button>
            </div>

            <button 
              onClick={() => {
                if (activeTab === 'spectrumguard') {
                  setActiveTab('video');
                  triggerToast('Switched to Video Landing Page');
                } else {
                  setActiveTab('spectrumguard');
                  triggerToast('Opened SpectrumGuard Mission Monitor');
                }
              }}
              className="nav-cta"
            >
              {activeTab === 'spectrumguard' ? (
                <>View Video Page</>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  Live RF Monitor
                </>
              )}
            </button>
          </nav>

      {/* ── AEROVISION DRONE POSTER UI ── */}
      {(activeTab === 'showcase' || activeTab === 'both') && (
        <main className="poster" id="showcase-poster">
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-copy">
              <h1>MORE FEATURES.<br /><span>MORE POSSIBILITIES.</span></h1>
              <h2>Designed for performance.<br />Built for explorers.</h2>
              <p className="intro">
                Packed with intelligent features<br />
                to make every flight easier,<br />
                safer, and more exciting.
              </p>
              <div className="hero-rule" />
              <div className="hero-benefits">
                <div 
                  onClick={() => {
                    setActiveTab('spectrumguard');
                    triggerToast('Opening SpectrumGuard RF Safe Flight Subsystem');
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Click to inspect SpectrumGuard Safe Flight Subsystem"
                >
                  <span className="benefit-icon">♧</span>
                  <b>SAFE FLIGHT</b>
                  <small>TECHNOLOGY ↗</small>
                </div>
                <div>
                  <span className="benefit-icon">▣</span>
                  <b>STUNNING</b>
                  <small>FOOTAGE</small>
                </div>
                <div>
                  <span className="benefit-icon">⌖</span>
                  <b>SMART & EASY</b>
                  <small>TO USE</small>
                </div>
              </div>
            </div>

            <div className="hero-photo">
              <img 
                src="https://images.unsplash.com/photo-1506947411487-a56738267384?auto=format&fit=crop&w=1400&q=90" 
                alt="Drone flying above a scenic landscape" 
              />
            </div>

            <div className="camera-badge">
              <strong>4K</strong>
              <span>ULTRA HD<br />CAMERA</span>
            </div>
          </section>

          {/* Smart Features Strip */}
          <section className="features">
            <div className="section-title">
              <span />
              <h2>SMART FEATURES FOR BETTER FLIGHTS</h2>
              <span />
            </div>

            <div className="feature-grid">
              {/* Feature 1: Optical Flow */}
              <article className="feature">
                <div className="feature-heading">
                  <span className="feature-icon">◉</span>
                  <div>
                    <h3>OPTICAL FLOW<br />POSITIONING</h3>
                    <p>Stay stable indoors and outdoors with precise hovering.</p>
                  </div>
                </div>
                <div className="feature-image optical">
                  <div className="floor-grid" />
                  <div className="mini-drone">✣</div>
                  <span className="beam" />
                </div>
              </article>

              {/* Feature 2: Battery */}
              <article className="feature">
                <div className="feature-heading">
                  <span className="feature-icon">▣</span>
                  <div>
                    <h3>LONG BATTERY LIFE</h3>
                    <p>Enjoy extended flight time and explore more without limits.</p>
                  </div>
                </div>
                <div className="battery">
                  <strong>18</strong>
                  <span>MINS<br />FLIGHT TIME*</span>
                </div>
                <small className="disclaimer">
                  *Actual flight time may vary<br />based on environment.
                </small>
              </article>

              {/* Feature 3: Waypoint Flight */}
              <article className="feature">
                <div className="feature-heading">
                  <span className="feature-icon">⌖</span>
                  <div>
                    <h3>WAYPOINT<br />FLIGHT</h3>
                    <p>Plan a route, set waypoints, and let the drone fly for you.</p>
                  </div>
                </div>
                <div className="feature-image waypoint">
                  <svg viewBox="0 0 220 120" aria-hidden="true">
                    <path 
                      d="M22 95 C55 20 100 110 135 55 S185 25 200 12" 
                      fill="none" 
                      stroke="#fff" 
                      strokeWidth="2" 
                      strokeDasharray="5 5" 
                    />
                    <circle cx="22" cy="95" r="6" fill="#fff" />
                    <circle cx="200" cy="12" r="6" fill="#fff" />
                    <path d="M135 55 l-5 -12 m5 12 l12 -4" stroke="#fff" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </article>

              {/* Feature 4: Follow Me */}
              <article className="feature">
                <div className="feature-heading">
                  <span className="feature-icon">♧</span>
                  <div>
                    <h3>FOLLOW ME<br />MODE</h3>
                    <p>The drone follows you automatically wherever you go.</p>
                  </div>
                </div>
                <div className="feature-image follow">
                  <span className="tracking-frame" />
                  <span className="walker">●</span>
                  <small>SUBJECT TRACKING</small>
                </div>
              </article>

              {/* Feature 5: Gesture Control */}
              <article className="feature">
                <div className="feature-heading">
                  <span className="feature-icon">♧</span>
                  <div>
                    <h3>GESTURE<br />CONTROL</h3>
                    <p>Take photos or videos with simple hand gestures.</p>
                  </div>
                </div>
                <div className="feature-image gesture">
                  <span className="peace">✌</span>
                  <span className="tracking-frame" />
                </div>
              </article>
            </div>
          </section>

          {/* Details Dual Columns */}
          <section className="details">
            <article className="detail stability">
              <div className="detail-copy">
                <h2>ENHANCED STABILITY,<br />SMOOTHER FOOTAGE</h2>
                <p>Advanced gyroscope and wind resistance for stable flights even in breezy conditions.</p>
                <div className="wind">
                  <span>≋</span>
                  <b>WIND RESISTANCE<br />LEVEL 5</b>
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=900&q=85" 
                alt="Compact drone in flight" 
              />
            </article>

            <article className="detail control">
              <div className="detail-copy">
                <h2>ONE KEY. TOTAL CONTROL.</h2>
                <p>Take off, land, or return home with a single press. Flying has never been easier.</p>
                <ul>
                  <li><span>⌖</span> ONE KEY TAKE OFF / LANDING</li>
                  <li><span>⌂</span> AUTO RETURN HOME</li>
                  <li><span>▣</span> LOW BATTERY RETURN</li>
                </ul>
              </div>
              <div className="home-scene">
                <div className="drone-mark">✣</div>
                <div className="home-ring">
                  <b>H</b>
                </div>
              </div>
            </article>
          </section>

          {/* What's In The Box */}
          <section className="box-content">
            <h2>WHAT'S IN THE BOX</h2>
            <div className="kit-grid">
              <div className="kit">
                <div className="kit-visual drone-kit">✣</div>
                <b>DRONE</b>
              </div>
              <div className="kit">
                <div className="kit-visual remote-kit">▤</div>
                <b>REMOTE<br />CONTROLLER</b>
              </div>
              <div className="kit">
                <div className="kit-visual battery-kit">▮</div>
                <b>BATTERY</b>
              </div>
              <div className="kit">
                <div className="kit-visual prop-kit">✳</div>
                <b>SPARE<br />PROPELLERS</b>
              </div>
              <div className="kit">
                <div className="kit-visual cable-kit">⌁</div>
                <b>USB<br />CHARGING CABLE</b>
              </div>
              <div className="kit">
                <div className="kit-visual tool-kit">╱</div>
                <b>SCREWDRIVER</b>
              </div>
              <div className="kit">
                <div className="kit-visual case-kit">▰</div>
                <b>CARRYING<br />CASE</b>
              </div>
              <div className="kit">
                <div className="kit-visual manual-kit">▧</div>
                <b>USER<br />MANUAL</b>
              </div>
            </div>
          </section>

          {/* Trust Footer */}
          <footer className="footer">
            <div>
              <span>♧</span>
              <p><b>PREMIUM QUALITY</b><small>BUILT TO LAST</small></p>
            </div>
            <div>
              <span>♧</span>
              <p><b>EXCELLENT SUPPORT</b><small>WE'RE HERE TO HELP</small></p>
            </div>
            <div>
              <span>♙</span>
              <p><b>SECURE PAYMENT</b><small>SAFE & TRUSTED</small></p>
            </div>
            <div>
              <span>▱</span>
              <p><b>FAST SHIPPING</b><small>DELIVERED TO YOU</small></p>
            </div>
          </footer>
        </main>
      )}

      {/* ── SPECTRUMGUARD RF SAFETY MONITOR & AI COPILOT ── */}
      {(activeTab === 'spectrumguard' || activeTab === 'both') && (
        <section className="max-w-[1040px] mx-auto mt-8 bg-neutral-900 border border-neutral-700/80 rounded-xl p-6 text-neutral-100 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
                <Shield className="w-6 h-6 text-neutral-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-condensed tracking-wide uppercase text-white">
                    SpectrumGuard™ Safety Subsystem
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    RF Shield v0.1
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Autonomous RF Spectrum Safety Monitor & Gemma AI Incident Copilot for Drone X4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-neutral-400">API:</span>
              <span className="text-neutral-300">{API_URL}/analyze</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                backendStatus === 'online' 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Preset Buttons & Auto-Simulator */}
          <div className="my-6 p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-neutral-400">Flight Environment Preset:</span>
              <div className="flex items-center gap-2 mt-2">
                {Object.keys(presets).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`px-3 py-1.5 rounded text-xs font-medium uppercase font-mono transition-all ${
                      simulatedState === key
                        ? 'bg-white text-black font-bold shadow'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {presets[key].name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setIsSimulatingTimeline(!isSimulatingTimeline);
                triggerToast(isSimulatingTimeline ? 'Timeline Simulation Paused' : 'Timeline Simulation Started');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                isSimulatingTimeline
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {isSimulatingTimeline ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Auto-Cycling Scenarios (6s)
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Auto-Simulate Interference Loop
                </>
              )}
            </button>
          </div>

          {/* Operator Action / Approval Banner */}
          {analysis && analysis.risk !== 'LOW' && (
            <div className={`mb-6 p-4 rounded-lg border transition-all ${riskStyle.bg} ${riskStyle.border} ${riskStyle.glow}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-6 h-6 mt-0.5 ${riskStyle.text}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase font-bold ${riskStyle.badge}`}>
                        {analysis.risk} RISK
                      </span>
                      <span className="text-sm font-semibold text-white">
                        Recommended Action: {analysis.recommended_action}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">
                      Critical telemetry breach detected. Operator intervention or safety override required.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {approvalState === null ? (
                    <>
                      <button
                        onClick={handleApprove}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Action
                      </button>
                      <button
                        onClick={handleReject}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium border border-neutral-700 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Hold / Dismiss
                      </button>
                    </>
                  ) : (
                    <div className="text-xs font-mono px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 flex items-center gap-2">
                      <span className="text-neutral-400">STATUS:</span>
                      <span className={approvalState === 'approved' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {approvalState.toUpperCase()} at {approvalTimestamp}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form & Spectrum Visualizer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Telemetry Sliders */}
            <div className="lg:col-span-5 bg-neutral-950 p-5 rounded-lg border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-neutral-300" />
                  <span className="text-sm font-semibold uppercase tracking-wider font-mono">Live UAV Downlink</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">2.4 GHz ISM</span>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  runAnalysis();
                }}
                className="space-y-4"
              >
                {/* Packet Loss */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-400">Packet Loss:</span>
                    <span className="text-white font-bold">{telemetry.packet_loss_percent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={telemetry.packet_loss_percent}
                    onChange={(e) => setTelemetry({ ...telemetry, packet_loss_percent: parseFloat(e.target.value) })}
                    className="w-full accent-white bg-neutral-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Signal RSSI */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-400">Signal RSSI:</span>
                    <span className="text-white font-bold">{telemetry.rssi_dbm} dBm</span>
                  </div>
                  <input
                    type="range"
                    min="-110"
                    max="-30"
                    value={telemetry.rssi_dbm}
                    onChange={(e) => setTelemetry({ ...telemetry, rssi_dbm: parseFloat(e.target.value) })}
                    className="w-full accent-white bg-neutral-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Latency */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-400">Round-Trip Latency:</span>
                    <span className="text-white font-bold">{telemetry.latency_ms} ms</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={telemetry.latency_ms}
                    onChange={(e) => setTelemetry({ ...telemetry, latency_ms: parseFloat(e.target.value) })}
                    className="w-full accent-white bg-neutral-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* GPS Satellites */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-neutral-400">GPS Satellites Locked:</span>
                    <span className="text-white font-bold">{telemetry.gps_satellites} sats</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={telemetry.gps_satellites}
                    onChange={(e) => setTelemetry({ ...telemetry, gps_satellites: parseInt(e.target.value, 10) })}
                    className="w-full accent-white bg-neutral-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-white text-black font-semibold rounded text-xs uppercase tracking-wider font-mono hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Telemetry...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Analyze Telemetry (POST /analyze)
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: RF Spectrum Visualizer */}
            <div className="lg:col-span-7 bg-neutral-950 p-5 rounded-lg border border-neutral-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-neutral-300" />
                    <span className="text-sm font-semibold uppercase tracking-wider font-mono">
                      RF Spectrum & FFT Synthesis
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    STATUS: {simulatedState.toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 bg-black rounded border border-neutral-800/80 p-3">
                  <svg viewBox="0 0 600 220" className="w-full h-48">
                    <defs>
                      <linearGradient id="rfNormal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="rfDegraded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="rfJammed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Grids */}
                    {[-100, -80, -60, -40, -20].map((dbm, idx) => {
                      const y = 25 + idx * 36;
                      return (
                        <g key={dbm}>
                          <line x1="40" y1={y} x2="580" y2={y} stroke="#262626" strokeDasharray="3 3" />
                          <text x="32" y={y + 4} fill="#666" fontSize="9" textAnchor="end" fontFamily="monospace">
                            {dbm}
                          </text>
                        </g>
                      );
                    })}

                    {/* Freqs */}
                    {['2400', '2420', '2440', '2460', '2483.5'].map((freq, idx) => {
                      const x = 50 + idx * 125;
                      return (
                        <text key={freq} x={x} y="195" fill="#666" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          {freq} MHz
                        </text>
                      );
                    })}

                    {/* RF Curves */}
                    {simulatedState === 'normal' && (
                      <>
                        <path
                          d="M 50 175 Q 120 170 180 172 Q 230 170 240 50 Q 250 170 320 172 Q 400 170 410 70 Q 420 170 570 175 L 570 180 L 50 180 Z"
                          fill="url(#rfNormal)"
                        />
                        <path
                          d="M 50 175 Q 120 170 180 172 Q 230 170 240 50 Q 250 170 320 172 Q 400 170 410 70 Q 420 170 570 175"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                        />
                        <text x="240" y="40" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          Control Link (-48 dBm)
                        </text>
                        <text x="410" y="60" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          4K HD Video (-58 dBm)
                        </text>
                      </>
                    )}

                    {simulatedState === 'degraded' && (
                      <>
                        <path
                          d="M 50 150 Q 100 130 160 140 Q 210 120 240 85 Q 270 135 340 120 Q 380 105 410 100 Q 450 135 570 150 L 570 180 L 50 180 Z"
                          fill="url(#rfDegraded)"
                        />
                        <path
                          d="M 50 150 Q 100 130 160 140 Q 210 120 240 85 Q 270 135 340 120 Q 380 105 410 100 Q 450 135 570 150"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                        />
                        <text x="240" y="75" fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          Degraded Link (-72 dBm)
                        </text>
                        <text x="340" y="110" fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          Multipath Spikes
                        </text>
                      </>
                    )}

                    {simulatedState === 'jammed' && (
                      <>
                        <path
                          d="M 50 100 Q 150 35 250 40 Q 350 30 450 42 Q 520 55 570 90 L 570 180 L 50 180 Z"
                          fill="url(#rfJammed)"
                        />
                        <path
                          d="M 50 100 Q 150 35 250 40 Q 350 30 450 42 Q 520 55 570 90"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                        />
                        <text x="300" y="24" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                          ⚠️ BARRAGE JAMMER DETECTED (-32 dBm OVER 60 MHz BW)
                        </text>
                      </>
                    )}
                  </svg>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Center: 2441.7 MHz</span>
                <span>Span: 83.5 MHz</span>
                <span className={simulatedState === 'jammed' ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                  Jammer: {simulatedState === 'jammed' ? 'ACTIVE' : 'NONE'}
                </span>
              </div>
            </div>
          </div>

          {/* Gemma 4 Explanation Briefing */}
          {analysis && (
            <div className="mt-6 p-4 rounded-lg bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-neutral-300" />
                  <span className="text-xs font-mono uppercase font-bold text-neutral-200">
                    Gemma 4 Safety Copilot Briefing
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  Source: <strong className="text-neutral-300">{analysis.source}</strong>
                </span>
              </div>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed whitespace-pre-line bg-neutral-900/60 p-3 rounded border border-neutral-800/80">
                {analysis.gemma_explanation}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── DESIGN REFERENCE MODAL ── */}
      {showReferenceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-neutral-300" />
                <h3 className="text-sm font-bold uppercase font-condensed tracking-wider text-white">
                  Design Reference (AeroVision X4 Poster UI)
                </h3>
              </div>
              <button 
                onClick={() => setShowReferenceModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-300">
              <p>
                This website faithfully implements the monochrome editorial drone design specification:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400">
                <li>Editorial Barlow Condensed headline &amp; 4K camera corner badge</li>
                <li>Grayscale drone photography with soft tonal blending</li>
                <li>Five-column high-contrast smart features strip</li>
                <li>Side-by-side product detail cards with stability &amp; home waypoint</li>
                <li>Eight-item accessory kit lineup &amp; dark trust footer</li>
              </ul>
              <div className="mt-4 border border-neutral-800 rounded overflow-hidden">
                <img 
                  src="/assets/design-reference.png" 
                  alt="Original Design Reference" 
                  className="w-full object-contain bg-black"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
        </div>
      )}
    </>
  );
}
