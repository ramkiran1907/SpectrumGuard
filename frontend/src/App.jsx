import React, { useState, useEffect } from 'react';
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
  Server, 
  Cpu, 
  RefreshCw, 
  Play, 
  RotateCcw,
  Sliders,
  Terminal,
  Zap,
  Info
} from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function App() {
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

  // Preset Configurations
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

  // Check backend health on mount
  useEffect(() => {
    fetchHealth();
    // Auto-analyze initial preset
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
    } catch (e) {
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
      setApprovalState(null); // Reset operator approval for new incident
      setApprovalTimestamp(null);
    } catch (err) {
      console.error('Analysis error:', err);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Preset Selection
  const applyPreset = (key) => {
    const preset = presets[key];
    if (preset) {
      setSimulatedState(key);
      setTelemetry(preset.data);
      runAnalysis(preset.data);
    }
  };

  // Handle Operator Approval
  const handleApprove = () => {
    setApprovalState('approved');
    setApprovalTimestamp(new Date().toLocaleTimeString());
  };

  const handleReject = () => {
    setApprovalState('rejected');
    setApprovalTimestamp(new Date().toLocaleTimeString());
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

  // Risk Color Mapping
  const getRiskStyle = (risk) => {
    switch (risk) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/50',
          text: 'text-rose-400',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
          badge: 'bg-rose-500 text-white',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          badge: 'bg-amber-500 text-slate-950 font-bold',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/50',
          text: 'text-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.25)]',
          badge: 'bg-yellow-500 text-slate-950 font-semibold',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          badge: 'bg-emerald-500 text-slate-950 font-bold',
        };
    }
  };

  const riskStyle = analysis ? getRiskStyle(analysis.risk) : getRiskStyle('LOW');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">SpectrumGuard</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                v0.1.0
              </span>
            </div>
            <p className="text-sm text-slate-400">
              RF Spectrum Safety Monitor & Gemma AI Incident Copilot
            </p>
          </div>
        </div>

        {/* Backend status & telemetry indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">ENDPOINT:</span>
            <span className="text-indigo-400">{API_URL}/analyze</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            backendStatus === 'online' 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{backendStatus === 'online' ? 'API ONLINE' : 'API OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* ── SIMULATED INTERFERENCE TIMELINE BANNER ── */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-200">
              Simulated RF Interference Timeline
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider font-semibold">
              ⚠️ Simulated Data
            </span>
          </div>

          <button
            onClick={() => setIsSimulatingTimeline(!isSimulatingTimeline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSimulatingTimeline 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {isSimulatingTimeline ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Auto-Cycle: Active
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Start Auto-Cycle
              </>
            )}
          </button>
        </div>

        {/* Timeline States Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(presets).map(([key, item]) => {
            const isSelected = simulatedState === key;
            const stateColors = {
              normal: 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70',
              degraded: 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70',
              jammed: 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/70',
            };
            const activeColors = {
              normal: 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30',
              degraded: 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30',
              jammed: 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30',
            };

            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`text-left p-4 rounded-xl border transition-all relative ${
                  isSelected ? activeColors[key] : stateColors[key]
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      key === 'normal' ? 'bg-emerald-400' : key === 'degraded' ? 'bg-amber-400' : 'bg-rose-500'
                    }`} />
                    <span className="font-semibold text-sm capitalize text-white">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    [SIMULATED]
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{item.desc}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-slate-300">
                  <span>Loss: {item.data.packet_loss_percent}%</span>
                  <span>RSSI: {item.data.rssi_dbm}dBm</span>
                  <span>GPS: {item.data.gps_satellites}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── OPERATOR APPROVAL CARD (USER REQUEST REQUIREMENT) ── */}
      {analysis && (
        <section className={`rounded-2xl border p-6 transition-all ${riskStyle.bg} ${riskStyle.border} ${riskStyle.glow}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  DECISION ENGINE RECOMMENDATION
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${riskStyle.badge}`}>
                  {analysis.risk} RISK
                </span>
              </div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <span>Gemma recommends:</span>
                <span className={`underline decoration-2 ${riskStyle.text}`}>
                  {analysis.recommended_action}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Autonomous drone action is paused awaiting pilot command confirmation.
              </p>
            </div>

            {/* Approve / Reject Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {approvalState === null ? (
                <>
                  <div className="text-xs font-mono text-slate-400 self-center hidden sm:block">
                    Operator approval required:
                  </div>
                  <button
                    onClick={handleApprove}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    [Approve]
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5" />
                    [Reject]
                  </button>
                </>
              ) : approvalState === 'approved' ? (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold">OPERATOR APPROVED ACTION</div>
                    <div className="text-xs text-emerald-400/80">Command transmitted at {approvalTimestamp}</div>
                  </div>
                  <button 
                    onClick={() => setApprovalState(null)} 
                    className="ml-2 text-xs text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-sm">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <div>
                    <div className="font-bold">OPERATOR OVERRIDE / REJECTED</div>
                    <div className="text-xs text-rose-400/80">Manual flight retained at {approvalTimestamp}</div>
                  </div>
                  <button 
                    onClick={() => setApprovalState(null)} 
                    className="ml-2 text-xs text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── MAIN DASHBOARD GRID: FORM + RF CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Telemetry Form */}
        <section className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Live Telemetry Form</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">UAV Downlink</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAnalysis();
            }}
            className="space-y-5"
          >
            {/* Packet Loss */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-slate-300 font-medium">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Packet Loss
                </label>
                <span className="font-mono text-indigo-400 font-semibold">
                  {telemetry.packet_loss_percent}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={telemetry.packet_loss_percent}
                onChange={(e) =>
                  setTelemetry({ ...telemetry, packet_loss_percent: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0% (Ideal)</span>
                <span>25% (Warning)</span>
                <span>50%+ (Critical)</span>
              </div>
            </div>

            {/* RSSI Signal Strength */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-slate-300 font-medium">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  Signal RSSI
                </label>
                <span className="font-mono text-indigo-400 font-semibold">
                  {telemetry.rssi_dbm} dBm
                </span>
              </div>
              <input
                type="range"
                min="-110"
                max="-30"
                step="1"
                value={telemetry.rssi_dbm}
                onChange={(e) =>
                  setTelemetry({ ...telemetry, rssi_dbm: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>-110 dBm (Lost)</span>
                <span>-85 dBm (Degraded)</span>
                <span>-30 dBm (Strong)</span>
              </div>
            </div>

            {/* Latency */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-slate-300 font-medium">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Round-Trip Latency
                </label>
                <span className="font-mono text-indigo-400 font-semibold">
                  {telemetry.latency_ms} ms
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={telemetry.latency_ms}
                onChange={(e) =>
                  setTelemetry({ ...telemetry, latency_ms: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>10 ms</span>
                <span>150 ms (Med)</span>
                <span>300 ms+ (High)</span>
              </div>
            </div>

            {/* GPS Satellites */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-slate-300 font-medium">
                  <Satellite className="w-4 h-4 text-purple-400" />
                  GPS Satellites Locked
                </label>
                <span className="font-mono text-indigo-400 font-semibold">
                  {telemetry.gps_satellites}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={telemetry.gps_satellites}
                onChange={(e) =>
                  setTelemetry({ ...telemetry, gps_satellites: parseInt(e.target.value, 10) })
                }
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0 (No Lock)</span>
                <span>4 (Minimum)</span>
                <span>12+ (Strong)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Evaluating Spectrum...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze Telemetry (POST /analyze)
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column: RF Chart & Spectrum Visualizer */}
        <section className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">RF Spectrum & Interference Chart</h2>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                ISM 2.4 GHz Band
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Real-time FFT synthesis indicating spectral occupancy, control links, and detected jammer barrage signatures.
            </p>

            {/* SVG Spectrum Chart */}
            <div className="mt-6 bg-slate-950 rounded-xl p-4 border border-slate-800/80 relative">
              <div className="absolute top-3 right-3 text-[10px] font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                SIMULATED RF SPECTRUM (TEST BENCH)
              </div>

              <svg viewBox="0 0 600 240" className="w-full h-56">
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

                {/* Grid Lines */}
                {[-100, -80, -60, -40, -20].map((dbm, idx) => {
                  const y = 30 + idx * 40;
                  return (
                    <g key={dbm}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x="32" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                        {dbm}
                      </text>
                    </g>
                  );
                })}

                {/* Frequency Axis */}
                {['2400', '2420', '2440', '2460', '2483.5'].map((freq, idx) => {
                  const x = 50 + idx * 125;
                  return (
                    <text key={freq} x={x} y="215" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      {freq} MHz
                    </text>
                  );
                })}

                {/* Noise Floor / Spectral Shape */}
                {simulatedState === 'normal' && (
                  <>
                    <path
                      d="M 50 190 Q 120 185 180 188 Q 230 185 240 60 Q 250 185 320 188 Q 400 185 410 80 Q 420 185 570 190 L 570 200 L 50 200 Z"
                      fill="url(#rfNormal)"
                    />
                    <path
                      d="M 50 190 Q 120 185 180 188 Q 230 185 240 60 Q 250 185 320 188 Q 400 185 410 80 Q 420 185 570 190"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text x="240" y="50" fill="#10b981" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      Control Link (-48 dBm)
                    </text>
                    <text x="410" y="70" fill="#10b981" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      HD Video (-58 dBm)
                    </text>
                  </>
                )}

                {simulatedState === 'degraded' && (
                  <>
                    <path
                      d="M 50 160 Q 100 140 160 150 Q 210 130 240 95 Q 270 145 340 130 Q 380 115 410 110 Q 450 145 570 160 L 570 200 L 50 200 Z"
                      fill="url(#rfDegraded)"
                    />
                    <path
                      d="M 50 160 Q 100 140 160 150 Q 210 130 240 95 Q 270 145 340 130 Q 380 115 410 110 Q 450 145 570 160"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <text x="240" y="85" fill="#f59e0b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      Degraded Link (-72 dBm)
                    </text>
                    <text x="340" y="120" fill="#f59e0b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      Multipath Spikes
                    </text>
                  </>
                )}

                {simulatedState === 'jammed' && (
                  <>
                    <path
                      d="M 50 110 Q 150 40 250 45 Q 350 35 450 48 Q 520 60 570 100 L 570 200 L 50 200 Z"
                      fill="url(#rfJammed)"
                    />
                    <path
                      d="M 50 110 Q 150 40 250 45 Q 350 35 450 48 Q 520 60 570 100"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                    />
                    <text x="300" y="30" fill="#f43f5e" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                      ⚠️ BARRAGE JAMMER DETECTED (-32 dBm OVER 60 MHz BW)
                    </text>
                  </>
                )}
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Center: 2441.7 MHz</span>
            <span>Span: 83.5 MHz</span>
            <span className={simulatedState === 'jammed' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              Jammer Signature: {simulatedState === 'jammed' ? 'POSITIVE' : 'NONE'}
            </span>
          </div>
        </section>
      </div>

      {/* ── BACKEND API RESPONSE PANEL (POST /analyze) ── */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">
              Backend Response Panel (POST /analyze)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {analysis && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Source: <span className="text-indigo-400 font-semibold">{analysis.source}</span>
              </span>
            )}
          </div>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Backend Communication Failed</div>
              <div className="text-xs text-rose-300/80">{apiError}</div>
              <div className="text-xs mt-1 text-slate-400">
                Make sure uvicorn is running at <code className="text-white">http://localhost:8000</code>
              </div>
            </div>
          </div>
        )}

        {analysis ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Risk & Recommendation Column */}
            <div className="md:col-span-4 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase">Assessed Risk Tier</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-md text-sm font-bold font-mono ${riskStyle.badge}`}>
                    {analysis.risk}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase">Recommended Action</span>
                <p className="mt-1 font-semibold text-white text-base">
                  {analysis.recommended_action}
                </p>
              </div>
            </div>

            {/* Gemma 4 Explanation Column */}
            <div className="md:col-span-8 p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
                      Gemma 4 Safety Copilot Briefing
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">&lt; 120 words</span>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
                  {analysis.gemma_explanation}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Guardrail: No offensive RF / Drone override claims</span>
                <span className="text-indigo-400">Model: gemma4 (Ollama)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">
            No analysis loaded. Submit telemetry to inspect backend response.
          </div>
        )}

        {/* Collapsible Raw JSON Viewer */}
        {analysis && (
          <details className="mt-4 border border-slate-800/80 rounded-xl bg-slate-950/60 p-3 group">
            <summary className="text-xs font-mono text-slate-400 cursor-pointer hover:text-slate-200 select-none">
              ▸ Inspect Raw API Response Payload (JSON)
            </summary>
            <pre className="mt-3 p-3 rounded-lg bg-slate-950 text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </details>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>SpectrumGuard — Open RF Safety Architecture</span>
        <div className="flex items-center gap-4">
          <span>Ollama Gemma 4 Integration</span>
          <span>•</span>
          <span>FastAPI + React</span>
        </div>
      </footer>
    </div>
  );
}
