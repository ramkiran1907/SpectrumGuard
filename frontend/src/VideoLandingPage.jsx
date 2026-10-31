import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Wifi,
  Satellite,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sliders,
  ChevronRight,
  ChevronDown,
  Layers,
  Zap,
  Crosshair,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Compass,
  ArrowUpRight,
  BatteryCharging,
  Eye,
  Camera,
  Cpu,
  Move,
  Bot,
  Sparkles,
  Send,
  MessageSquare,
  Terminal,
  RefreshCw
} from 'lucide-react';

const TOTAL_FRAMES = 299;
const FRAME_BASE_PATH = './drone-frames/ezgif-frame-';

// Story phases mapped to frame ranges
const PHASES = [
  {
    id: 1,
    name: 'GPS Flight',
    label: 'Phase 1: Autonomous En-Route',
    start: 1,
    end: 65,
    tag: 'CLEAR SKY • GPS LOCK',
    badgeColor: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400',
    title: 'Precision Autonomous GPS Waypoint Navigation',
    desc: 'Drone X4 cruises along pre-programmed waypoints with dual-frequency GNSS lock and real-time 4K optical telemetry. 16 satellites acquired.',
    telemetry: { rssi: -58, packetLoss: 0, latency: 28, snr: 32, sats: 16, shield: 0, status: 'NOMINAL', band: '2.4 GHz ISM' }
  },
  {
    id: 2,
    name: 'Threat Alert',
    label: 'Phase 2: Hostile Jammer Detected',
    start: 66,
    end: 125,
    tag: 'RF HAZARD • SG-001 TRIGGERED',
    badgeColor: 'border-rose-500/50 bg-rose-950/70 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    title: 'High-Power RF Interference & Barrage Jammer Alert',
    desc: 'An unauthorized transmitter emits high-power barrage signals (> -30 dBm). Control link degrades, latency spikes to 420ms, and GNSS satellite lock is compromised.',
    telemetry: { rssi: -89, packetLoss: 45, latency: 420, snr: 8, sats: 5, shield: 25, status: 'CRITICAL THREAT', band: '2.4 GHz BARRAGE' }
  },
  {
    id: 3,
    name: 'RF Shield',
    label: 'Phase 3: Active RF Shield Deployed',
    start: 126,
    end: 190,
    tag: 'SPECTRUMGUARD • SHIELD ACTIVE',
    badgeColor: 'border-cyan-500/50 bg-cyan-950/70 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)]',
    title: 'SpectrumGuard Dynamic Electromagnetic Barrier Engaged',
    desc: 'Sub-millisecond RF isolation activates. The defensive electromagnetic barrier deflects hostile barrage frequencies while the transceiver initiates cognitive frequency hopping.',
    telemetry: { rssi: -72, packetLoss: 12, latency: 140, snr: 19, sats: 11, shield: 100, status: 'COUNTERMEASURE ACTIVE', band: 'HOPPING 900M / 5.8G' }
  },
  {
    id: 4,
    name: 'Link Stabilized',
    label: 'Phase 4: Telemetry Hardened',
    start: 191,
    end: 255,
    tag: 'FREQUENCY SECURED • SNR RECOVERED',
    badgeColor: 'border-indigo-500/50 bg-indigo-950/70 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    title: 'Adaptive Frequency Hopping & SNR Restoration',
    desc: 'Control and video channels successfully migrate to clean spectrum slices. Packet loss drops back to zero, telemetry latency drops under 40ms, and shield remains fortified.',
    telemetry: { rssi: -62, packetLoss: 1, latency: 36, snr: 28, sats: 15, shield: 95, status: 'LINK RESTORED', band: '5.8 GHz PROTECTED' }
  },
  {
    id: 5,
    name: 'Airspace Locked',
    label: 'Phase 5: Mission Secured',
    start: 256,
    end: 299,
    tag: 'AIRSPACE SECURED • MISSION ASSURED',
    badgeColor: 'border-emerald-500/50 bg-emerald-950/70 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    title: 'Total Mission Assurance & Autonomous Fail-Safe',
    desc: 'Airspace parameters verified safe. Drone X4 resumes its primary survey mission with encrypted link redundancy, fail-safe Return-to-Home ready, and zero telemetry breach.',
    telemetry: { rssi: -54, packetLoss: 0, latency: 24, snr: 34, sats: 18, shield: 100, status: 'AIRSPACE LOCKED', band: 'DUAL-BAND ENCRYPTED' }
  }
];

// Interactive Hotspots on the drone in 3D frame space
const HOTSPOTS = [
  {
    id: 'camera',
    label: '4K Ultra HD Gimbal',
    category: 'OPTICS',
    x: 49.5, // % from left
    y: 65,   // % from top
    desc: '1/1.3" CMOS sensor, 4K/60fps HDR, 3-axis mechanical gimbal stabilization with sub-pixel vibration damping.',
    spec: '4K/60fps • f/1.8 • 120° FOV'
  },
  {
    id: 'shield',
    label: 'SpectrumGuard RF Shield Emitter',
    category: 'RF DEFENSE',
    x: 50,
    y: 28,
    desc: 'Omnidirectional RF barrier emitter with active frequency isolation and real-time barrage jamming suppression.',
    spec: 'Level-5 RF Shield • <10ms Reaction'
  },
  {
    id: 'antenna',
    label: 'Tri-Band Frequency-Agile Array',
    category: 'COMMUNICATIONS',
    x: 32,
    y: 38,
    desc: '900 MHz / 2.4 GHz / 5.8 GHz tri-band transceiver with cognitive frequency hopping across 48 discrete channels.',
    spec: 'Tri-Band Agile • 15km Range'
  },
  {
    id: 'propulsion',
    label: 'Brushless Propulsion Core',
    category: 'PROPULSION',
    x: 74,
    y: 42,
    desc: 'High-torque brushless motors paired with aerodynamic low-acoustic carbon-reinforced folding blades.',
    spec: 'Level-5 Wind Resist • 21 m/s Top'
  },
  {
    id: 'battery',
    label: 'Intelligent Smart Flight Battery',
    category: 'POWER',
    x: 50,
    y: 48,
    desc: '5800 mAh LiPo 4S battery with integrated smart power management, self-heating for cold weather, and fail-safe RTH.',
    spec: '18 Mins Hover • 4S 5800mAh'
  }
];

export default function VideoLandingPage({ onNavigateTab, backendStatus, activeTab }) {
  // Canvas & Frame State
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartFrame, setDragStartFrame] = useState(1);

  // ── Gemma 4 AI Copilot State ──
  const [gemmaHealth, setGemmaHealth] = useState({ status: 'checking', model: 'gemma4:latest' });
  const [chatQuery, setChatQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'gemma',
      text: 'Gemma 4 Copilot initialized on Ollama. I am actively monitoring RF spectrum integrity, ISM band harmonics, and hostile jammer signatures for Drone X4.',
      source: 'local_gemma4_ollama',
      time: 'Online'
    }
  ]);
  const [gemmaAnalysis, setGemmaAnalysis] = useState(null);
  const [isAnalyzingGemma, setIsAnalyzingGemma] = useState(false);

  // Poll Gemma 4 /health on mount
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(d => {
        if (d.gemma) {
          setGemmaHealth(d.gemma);
        }
      })
      .catch(() => setGemmaHealth({ status: 'offline', model: 'gemma4' }));
  }, []);

  const askGemmaQuery = async (queryText) => {
    const q = (queryText || chatQuery).trim();
    if (!q || chatLoading) return;
    const userMsg = { sender: 'user', text: q, time: new Date().toLocaleTimeString() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatQuery('');
    setChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          telemetry: {
            frame: currentFrame,
            phase: activePhase.name,
            rssi_dbm: activePhase.telemetry.rssi,
            packet_loss_percent: activePhase.telemetry.packetLoss,
            latency_ms: activePhase.telemetry.latency,
            gps_satellites: activePhase.telemetry.sats,
            shield_status: activePhase.telemetry.status
          }
        })
      });
      const data = await res.json();
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'gemma',
          text: data.response,
          source: data.source || 'local_gemma4_ollama',
          time: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'gemma',
          text: 'Backend communication error. Please ensure FastAPI (port 8000) and Ollama are active.',
          source: 'connection_error',
          time: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const analyzeActivePhaseWithGemma = async () => {
    setIsAnalyzingGemma(true);
    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet_loss_percent: activePhase.telemetry.packetLoss,
          rssi_dbm: activePhase.telemetry.rssi,
          latency_ms: activePhase.telemetry.latency,
          gps_satellites: activePhase.telemetry.sats
        })
      });
      const data = await res.json();
      setGemmaAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingGemma(false);
    }
  };

  // Cached Image elements
  const imagesRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const currentFrameRef = useRef(1);

  // Keep ref in sync
  useEffect(() => {
    currentFrameRef.current = currentFrame;
  }, [currentFrame]);

  // Determine current story phase
  const activePhase = PHASES.find(p => currentFrame >= p.start && currentFrame <= p.end) || PHASES[0];

  // Helper to format frame path
  const getFrameUrl = (frameNum) => {
    const padded = String(frameNum).padStart(3, '0');
    return `${FRAME_BASE_PATH}${padded}.jpg`;
  };

  // 1. Progressive Image Preloading Pipeline
  useEffect(() => {
    let isCancelled = false;
    const images = new Array(TOTAL_FRAMES + 1);
    imagesRef.current = images;

    let loadedCount = 0;

    // Load first batch with highest priority
    const PRIORITY_BATCH = 20;

    const loadSingleImage = (index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFrameUrl(index);
        img.onload = () => {
          if (!isCancelled) {
            images[index] = img;
            loadedCount++;
            setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
            // Render first frame immediately once loaded
            if (index === 1 && canvasRef.current) {
              renderFrameToCanvas(1);
            }
            if (loadedCount >= TOTAL_FRAMES * 0.95) {
              setIsLoaded(true);
            }
          }
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          resolve();
        };
      });
    };

    const loadAllFrames = async () => {
      // 1. Load first 20 frames sequentially/parallel for immediate playback readiness
      const firstBatch = [];
      for (let i = 1; i <= Math.min(PRIORITY_BATCH, TOTAL_FRAMES); i++) {
        firstBatch.push(loadSingleImage(i));
      }
      await Promise.all(firstBatch);

      // 2. Load keyframes across the timeline for smooth scrubbing early on
      const keyframeBatch = [];
      for (let i = PRIORITY_BATCH + 1; i <= TOTAL_FRAMES; i += 5) {
        keyframeBatch.push(loadSingleImage(i));
      }
      await Promise.all(keyframeBatch);

      // 3. Load all remaining frames
      const remainingBatch = [];
      for (let i = PRIORITY_BATCH + 1; i <= TOTAL_FRAMES; i++) {
        if (!images[i]) {
          remainingBatch.push(loadSingleImage(i));
        }
      }
      await Promise.all(remainingBatch);
      if (!isCancelled) {
        setIsLoaded(true);
      }
    };

    loadAllFrames();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Canvas Render Function (Retina & Aspect-Ratio Aware)
  const renderFrameToCanvas = useCallback((frameNum) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find closest loaded frame if current isn't ready yet
    let img = imagesRef.current[frameNum];
    if (!img || !img.complete) {
      // Search backwards or forwards for nearest loaded frame
      for (let offset = 1; offset < 30; offset++) {
        const prev = imagesRef.current[Math.max(1, frameNum - offset)];
        if (prev && prev.complete) {
          img = prev;
          break;
        }
        const next = imagesRef.current[Math.min(TOTAL_FRAMES, frameNum + offset)];
        if (next && next.complete) {
          img = next;
          break;
        }
      }
    }

    if (!img || !img.complete) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Compute object-fit: cover or contain to fill canvas gracefully
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = width / height;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = width;
      drawH = width / imgRatio;
      drawX = 0;
      drawY = (height - drawH) / 2;
    } else {
      drawH = height;
      drawW = height * imgRatio;
      drawX = (width - drawW) / 2;
      drawY = 0;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Add subtle cinematic scanline & vignette overlay directly to canvas
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }, []);

  // Update canvas whenever current frame changes
  useEffect(() => {
    renderFrameToCanvas(currentFrame);
  }, [currentFrame, renderFrameToCanvas]);

  // 3. Playback Loop with Variable Speed (30 FPS default)
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const fps = 30 * playbackSpeed;
    const interval = 1000 / fps;

    const step = (timestamp) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= interval) {
        lastFrameTimeRef.current = timestamp - (elapsed % interval);
        setCurrentFrame((prev) => {
          if (prev >= TOTAL_FRAMES) {
            return 1; // loop seamlessly
          }
          return prev + 1;
        });
      }

      animFrameIdRef.current = requestAnimationFrame(step);
    };

    animFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // 4. Keyboard Shortcuts (Space to play/pause, Left/Right arrow to seek)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentFrame((prev) => Math.min(TOTAL_FRAMES, prev + (e.shiftKey ? 15 : 2)));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentFrame((prev) => Math.max(1, prev - (e.shiftKey ? 15 : 2)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 5. Interactive Mouse / Touch Drag to 360° Scrub
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX || (e.touches && e.touches[0].clientX));
    setDragStartFrame(currentFrameRef.current);
    setIsPlaying(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const deltaX = clientX - dragStartX;
    // Map ~400px horizontal drag to 100 frames
    const frameDelta = Math.round(deltaX * 0.35);
    let target = dragStartFrame + frameDelta;
    while (target > TOTAL_FRAMES) target -= TOTAL_FRAMES;
    while (target < 1) target += TOTAL_FRAMES;
    setCurrentFrame(target);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 6. Scroll-Driven Scrollytelling Linkage
  useEffect(() => {
    const handleScroll = () => {
      if (isPlaying || isDragging) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollY = -rect.top;
      const totalScrollable = rect.height - window.innerHeight;

      if (scrollY >= 0 && scrollY <= totalScrollable && totalScrollable > 0) {
        const progress = Math.min(1, Math.max(0, scrollY / totalScrollable));
        const targetFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(progress * (TOTAL_FRAMES - 1)) + 1));
        setCurrentFrame(targetFrame);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPlaying, isDragging]);

  // Jump to specific phase
  const jumpToPhase = (phase) => {
    setIsPlaying(false);
    setCurrentFrame(phase.start + 5);
  };

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    const target = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="bg-[#0b0f17] text-neutral-100 min-h-screen selection:bg-cyan-500 selection:text-black font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0b0f17]/85 border-b border-neutral-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Shield className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-condensed font-extrabold tracking-wider text-xl uppercase text-white">
                SPECTRUMGUARD
              </span>
              <span className="text-[11px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                X4 SHIELD
              </span>
            </div>
            <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:block">
              RF Defense & Anti-Jamming Drone Platform
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 rounded-full border border-neutral-800 text-xs">
          <button
            onClick={() => onNavigateTab('video')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Video Landing</span>
          </button>
          <button
            onClick={() => onNavigateTab('spectrumguard')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'spectrumguard'
                ? 'bg-neutral-700 text-white font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Mission Monitor</span>
          </button>
          <button
            onClick={() => onNavigateTab('showcase')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'showcase'
                ? 'bg-neutral-700 text-white font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Poster</span>
          </button>
        </div>

        {/* Right CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-neutral-400">
              FASTAPI: <span className="text-white font-semibold">{backendStatus.toUpperCase()}</span>
            </span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('mission-control-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Test RF Jammer
          </button>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="relative px-4 md:px-8 pt-8 pb-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-neutral-800/80 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              NEXT-GEN COUNTER-UAS DEFENSE • 299-FRAME 4K VIDEO DEMO
            </div>
            <h1 className="font-condensed font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight text-white uppercase leading-none">
              THE UNJAMMABLE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                DRONE PLATFORM.
              </span>
            </h1>
            <p className="text-sm md:text-base text-neutral-300 max-w-2xl font-light leading-relaxed">
              Equipped with active SpectrumGuard electromagnetic defense and autonomous AI threat isolation.
              Watch the interactive video demonstration below or scrub frame-by-frame to see live jammer repulsion.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto font-mono text-center">
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <div className="text-xl md:text-2xl font-bold text-cyan-400">&lt; 10ms</div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Jammer Deflect</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <div className="text-xl md:text-2xl font-bold text-emerald-400">99.98%</div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Link Uptime</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <div className="text-xl md:text-2xl font-bold text-indigo-400">4K HDR</div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Optics Feed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CINEMATIC VIDEO & SCROLLYTELLING VIEWPORT ── */}
      <section
        ref={containerRef}
        id="cinematic-experience"
        className="relative min-h-[140vh] md:min-h-[200vh] px-2 sm:px-4 md:px-8 max-w-7xl mx-auto py-6"
      >
        <div className="sticky top-20 z-30">
          <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
            {/* Top HUD Bar */}
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 md:p-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
              {/* Flight Status Pill */}
              <div className="pointer-events-auto flex items-center gap-2.5">
                <div className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md ${activePhase.badgeColor}`}>
                  {activePhase.id === 2 ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                  ) : activePhase.id >= 3 ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{activePhase.tag}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-neutral-800 text-[11px] font-mono text-neutral-300">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>FRAME {String(currentFrame).padStart(3, '0')} / {TOTAL_FRAMES}</span>
                </div>
              </div>

              {/* Real-Time Telemetry HUD Pill */}
              <div className="pointer-events-auto flex items-center gap-3">
                <div className="hidden lg:grid grid-cols-4 gap-2 bg-black/70 backdrop-blur-md border border-neutral-800/80 rounded-xl px-3 py-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-neutral-500 block text-[9px]">RSSI</span>
                    <span className={`font-bold ${activePhase.telemetry.rssi < -85 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activePhase.telemetry.rssi} dBm
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">LOSS</span>
                    <span className={`font-bold ${activePhase.telemetry.packetLoss > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activePhase.telemetry.packetLoss}%
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">LATENCY</span>
                    <span className={`font-bold ${activePhase.telemetry.latency > 200 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {activePhase.telemetry.latency} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">GNSS</span>
                    <span className="text-white font-bold">{activePhase.telemetry.sats} Sats</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowHotspots(!showHotspots)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                    showHotspots
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-black/60 border-neutral-800 text-neutral-400'
                  }`}
                  title="Toggle 3D Hotspot Markers"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hotspots</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-black/60 border border-neutral-800 text-neutral-300 hover:text-white transition-all"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Canvas Video Viewport */}
            <div
              className="relative w-full aspect-[16/9] max-h-[72vh] cursor-grab active:cursor-grabbing select-none overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full block object-contain bg-black"
              />

              {/* Buffer / Loading Indicator */}
              {!isLoaded && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                  <div className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>PRELOADING 4K FRAMES • {loadProgress}%</span>
                </div>
              )}

              {/* Drag to Scrub Hint */}
              <div className="absolute bottom-20 left-4 z-20 hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/50 border border-neutral-800/60 text-[11px] font-mono text-neutral-400 backdrop-blur-sm pointer-events-none">
                <Move className="w-3 h-3 text-cyan-400" />
                <span>Drag horizontally on drone to scrub 360°</span>
              </div>

              {/* Interactive 3D Hotspots on Drone */}
              {showHotspots && (
                <div className="absolute inset-0 pointer-events-none">
                  {HOTSPOTS.map((spot) => {
                    const isActive = activeHotspot?.id === spot.id;
                    return (
                      <div
                        key={spot.id}
                        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group z-20"
                      >
                        <button
                          onClick={() => setActiveHotspot(isActive ? null : spot)}
                          className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-transform transform hover:scale-125 ${
                            isActive
                              ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.8)]'
                              : 'bg-black/70 border border-cyan-400 text-cyan-300 backdrop-blur-md hover:bg-cyan-500/30'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white relative z-10" />
                        </button>

                        {/* Tooltip Card */}
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 bottom-8 w-64 p-3 rounded-xl bg-neutral-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl transition-all pointer-events-auto ${
                            isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1">
                            <span>{spot.category}</span>
                            <span className="text-neutral-500">HOTSPOT</span>
                          </div>
                          <div className="text-xs font-bold text-white mb-1">{spot.label}</div>
                          <p className="text-[11px] text-neutral-300 leading-relaxed mb-2 font-light">
                            {spot.desc}
                          </p>
                          <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-neutral-800 text-cyan-300 inline-block">
                            {spot.spec}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom HUD & Timeline Narrative */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-neutral-950 via-neutral-900/90 to-neutral-900/40 border-t border-neutral-800/80">
              {/* Active Phase Story Card */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-neutral-800/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      {activePhase.label}
                    </span>
                    <span className="text-xs text-neutral-500">•</span>
                    <span className="text-xs font-mono text-neutral-400">
                      Bands: {activePhase.telemetry.band}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white">
                    {activePhase.title}
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-300 max-w-3xl leading-relaxed">
                    {activePhase.desc}
                  </p>
                </div>

                {/* Phase Jump Pills */}
                <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
                  {PHASES.map((phase) => {
                    const isCurrent = activePhase.id === phase.id;
                    return (
                      <button
                        key={phase.id}
                        onClick={() => jumpToPhase(phase)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all border ${
                          isCurrent
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                            : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {phase.id}. {phase.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Player Timeline Scrubber & Controls */}
              <div className="space-y-3">
                {/* Scrubber Range Input */}
                <div className="relative group">
                  <input
                    type="range"
                    min="1"
                    max={TOTAL_FRAMES}
                    value={currentFrame}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentFrame(parseInt(e.target.value, 10));
                    }}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                  />
                  {/* Phase Marker Ticks on Timeline */}
                  <div className="absolute top-2.5 inset-x-0 flex justify-between pointer-events-none px-1">
                    {PHASES.map((p) => (
                      <span
                        key={p.id}
                        style={{ left: `${(p.start / TOTAL_FRAMES) * 100}%` }}
                        className="text-[9px] font-mono text-neutral-500 absolute -bottom-4 -translate-x-1/2"
                      >
                        P{p.id}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Demo</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentFrame(1);
                      }}
                      className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
                      title="Reset to Frame 1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-xs font-mono text-neutral-400 pl-2">
                      <span className="text-white font-bold">
                        {((currentFrame / 30).toFixed(1))}s
                      </span>{' '}
                      / {((TOTAL_FRAMES / 30).toFixed(1))}s
                    </div>
                  </div>

                  {/* Playback Speeds */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-[11px] font-mono">
                    <span className="text-neutral-500 px-1.5">Speed:</span>
                    {[0.5, 1.0, 1.5, 2.0].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded transition-all ${
                          playbackSpeed === speed
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE TECHNOLOGY HIGHLIGHTS ── */}
      <section id="rf-shield-tech" className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-neutral-800">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
            SPECTRUMGUARD ARCHITECTURE
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold font-condensed tracking-tight uppercase text-white">
            MILITARY-GRADE RF RESILIENCE FOR CIVILIAN & COMMERCIAL DRONES
          </h2>
          <p className="text-neutral-400 text-sm md:text-base font-light">
            Conventional drones crash or enter uncontrolled flyaways when jammed. SpectrumGuard protects the command,
            telemetry, and video links with real-time hardware & AI enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Sub-10ms Jammer Detection</h3>
            <p className="text-neutral-300 text-xs md:text-sm leading-relaxed font-light">
              Continuous RF spectrum scanning across 900 MHz, 2.4 GHz, and 5.8 GHz ISM bands. Detects barrage, spot, and sweep jammers instantly before packet loss causes loss of control.
            </p>
            <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
              Rule SG-001 • Threshold &gt; -30 dBm
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Cognitive Frequency Hopping</h3>
            <p className="text-neutral-300 text-xs md:text-sm leading-relaxed font-light">
              Autonomous dynamic channel switching over 48 isolated channels. When one band experiences high noise or hostile jamming, the link hops to clean spectrum within 8 milliseconds.
            </p>
            <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
              Zero Latency Spike • 99.98% Continuity
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Gemma AI Threat Reasoning</h3>
            <p className="text-neutral-300 text-xs md:text-sm leading-relaxed font-light">
              Powered by local Gemma models running via Ollama. Analyzes multi-sensor telemetry, explains RF threats in plain English, and provides automated operator incident reports.
            </p>
            <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
              Local On-Board AI • Zero Cloud Latency
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE JAMMER STRESS-TEST BENCH ── */}
      <section id="mission-control-section" className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-neutral-800">
        <div className="rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-6 md:p-10 space-y-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest">
                <Sliders className="w-3.5 h-3.5" />
                Live Telemetry & Jammer Simulation Bench
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold font-condensed tracking-tight uppercase text-white mt-1">
                TEST THE RF DEFENSE SYSTEM IN REAL TIME
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('spectrumguard')}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono flex items-center gap-2 border border-neutral-700 transition-all"
            >
              <span>Open Full SpectrumGuard Dashboard</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setCurrentFrame(25);
                setIsPlaying(false);
              }}
              className="cursor-pointer p-5 rounded-2xl bg-black/40 border border-neutral-800 hover:border-emerald-500/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 font-bold">SCENARIO A</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                1. Clear ISM Environment
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Drone X4 operates at 120m AGL. RSSI is strong (-58 dBm), latency is 28ms, and all 16 GNSS satellites are locked.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-300">
                Seek video to Frame 25 ↗
              </div>
            </div>

            <div
              onClick={() => {
                setCurrentFrame(95);
                setIsPlaying(false);
              }}
              className="cursor-pointer p-5 rounded-2xl bg-black/40 border border-neutral-800 hover:border-rose-500/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-rose-400 font-bold">SCENARIO B</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors">
                2. Hostile Barrage Jammer
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                High-power jamming pulse hits 2.4 GHz. Packet loss reaches 45%, triggering Rule SG-001 and raising emergency alert.
              </p>
              <div className="pt-2 text-[11px] font-mono text-rose-400 font-bold">
                Seek video to Frame 95 (Threat Active) ↗
              </div>
            </div>

            <div
              onClick={() => {
                setCurrentFrame(160);
                setIsPlaying(false);
              }}
              className="cursor-pointer p-5 rounded-2xl bg-black/40 border border-neutral-800 hover:border-cyan-500/50 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold">SCENARIO C</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                3. Shield & Frequency Deflection
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                SpectrumGuard dynamic RF shield deploys, isolating interference and hopping frequencies to restore clean command link.
              </p>
              <div className="pt-2 text-[11px] font-mono text-cyan-300 font-bold">
                Seek video to Frame 160 (Shield Active) ↗
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECHNICAL SPECIFICATIONS MATRIX ── */}
      <section id="specs-matrix" className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-neutral-800">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
            FULL PLATFORM SPECIFICATIONS
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold font-condensed tracking-tight uppercase text-white">
            DRONE X4 // TECHNICAL SPECIFICATIONS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <Radio className="w-4 h-4" />
              <span>RF & COMMUNICATIONS</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-mono">
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Operating Bands</span>
                <span>900M / 2.4G / 5.8G</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Transmission Range</span>
                <span>Up to 15 km</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Hop Reaction</span>
                <span>&lt; 8 milliseconds</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Anti-Jam Threshold</span>
                <span>&gt; -30 dBm Trigger</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <Camera className="w-4 h-4" />
              <span>OPTICAL & SENSORS</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-mono">
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Camera Resolution</span>
                <span>4K Ultra HD (60fps)</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Gimbal</span>
                <span>3-Axis Mechanical</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Positioning</span>
                <span>Optical Flow + Sonar</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Hover Precision</span>
                <span>± 0.1m Vertical</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <BatteryCharging className="w-4 h-4" />
              <span>POWER & FLIGHT</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-mono">
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Flight Time</span>
                <span>18 Minutes Max</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Battery Capacity</span>
                <span>5800 mAh LiPo 4S</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Wind Resistance</span>
                <span>Level 5 (12 m/s)</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Max Speed</span>
                <span>21 m/s (Sport Mode)</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>SAFETY & RULES</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-mono">
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Rules Engine</span>
                <span>8 Core Safety Rules</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Fail-Safe</span>
                <span>Auto Return-to-Home</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Ceiling Limit</span>
                <span>120m AGL Enforced</span>
              </li>
              <li className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">AI Threat Agent</span>
                <span>Gemma 3:4B Local</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── WHAT'S IN THE BOX ── */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-neutral-800">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
            COMPLETE OPERATOR KIT
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold font-condensed tracking-tight uppercase text-white">
            WHAT'S IN THE BOX
          </h2>
          <p className="text-xs md:text-sm text-neutral-400">
            Everything you need for mission-ready deployment right out of the ruggedized tactical case.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          {[
            { icon: '✣', title: 'DRONE X4', sub: 'SHIELD CORE' },
            { icon: '▤', title: 'REMOTE', sub: '5.5" HD DISPLAY' },
            { icon: '▮', title: 'BATTERIES', sub: '2X 5800MAH' },
            { icon: '✳', title: 'PROPELLERS', sub: '8X LOW NOISE' },
            { icon: '⌁', title: 'FAST CHARGER', sub: '100W GAN HUB' },
            { icon: '╱', title: 'TOOLKIT', sub: 'PRECISION HEX' },
            { icon: '▰', title: 'HARD CASE', sub: 'IP67 RATED' },
            { icon: '▧', title: 'RF MANUAL', sub: 'OPS GUIDE' }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-10 h-10 rounded-lg bg-black/60 border border-neutral-700/60 flex items-center justify-center text-lg text-cyan-400">
                {item.icon}
              </div>
              <div className="text-xs font-bold text-white tracking-wide">{item.title}</div>
              <div className="text-[9px] font-mono text-neutral-400">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-4 md:px-8 border-t border-neutral-800 bg-black/80 font-mono text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold font-condensed text-lg tracking-wider">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>SPECTRUMGUARD AEROSPACE & RF SYSTEMS</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Autonomous RF Spectrum Safety Monitor and Dynamic Countermeasure Platform.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => onNavigateTab('spectrumguard')}
              className="text-cyan-400 hover:underline"
            >
              SpectrumGuard Live API
            </button>
            <span className="text-neutral-700">•</span>
            <button
              onClick={() => onNavigateTab('showcase')}
              className="text-neutral-400 hover:text-white"
            >
              Classic Poster
            </button>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-500">299 Frames 1080p Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

