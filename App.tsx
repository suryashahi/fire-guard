
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, Video, Activity, Info, AlertTriangle, Play, Square, BellOff, Volume2, History, Music, Upload } from 'lucide-react';
import { detectFireFromFrame } from './services/geminiService';
import { DetectionResult, SystemStatus, LogEntry } from './types';
import CameraFeed from './components/CameraFeed';
import DetectionLog from './components/DetectionLog';
import AlertBanner from './components/AlertBanner';
import StatusCard from './components/StatusCard';
import sirenSound from './components/aag.mp3';

const App: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [customSirenName, setCustomSirenName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'warning' | 'critical' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      status: type,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  // Initialize Siren Sound with the local file aag.mp3
  useEffect(() => {
    if (sirenSound) {
      try {
        audioRef.current = new Audio(sirenSound);
        audioRef.current.loop = true;
        audioRef.current.volume = 1.0;
        audioRef.current.load();
        console.log("Audio initialized with:", sirenSound);
        addLog("Default siren (aag.mp3) loaded and ready.", "info");
      } catch (err) {
        console.error("Failed to initialize audio:", err);
        addLog("Failed to load default siren.", "warning");
      }
    } else {
      addLog("Siren sound file not found in imports.", "warning");
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [addLog]);

  const playSiren = useCallback(() => {
    if (isAudioEnabled && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => {
          addLog("Siren started playing", "info");
        }).catch(e => {
          console.error("Audio play failed:", e);
          addLog("Audio playback failed. Click anywhere on the page and try again.", "warning");
        });
      }
    }
  }, [isAudioEnabled, addLog]);

  const stopSiren = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioRef.current) {
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      setCustomSirenName(file.name);
      addLog(`New custom siren loaded: ${file.name}`, 'info');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDetection = useCallback(async (base64Frame: string) => {
    if (!isMonitoring) return;

    try {
      const result = await detectFireFromFrame(base64Frame);
      const detection: DetectionResult = {
        ...result,
        timestamp: new Date()
      };

      setLastResult(detection);

      if (detection.fireDetected && detection.confidence > 0.6) {
        setStatus(SystemStatus.ALERT);
        addLog(`FIRE DETECTED! Confidence: ${(detection.confidence * 100).toFixed(1)}% - ${detection.details}`, 'critical');
        
        // Play the sound (aag.mp3) in a loop while fire is detected
        playSiren();
      } else {
        setStatus(SystemStatus.SCANNING);
        // Pause the sound when fire is no longer detected
        stopSiren();
      }
    } catch (err) {
      console.error("Detection failed", err);
      addLog("Analysis error. Retrying...", "warning");
    }
  }, [isMonitoring, isAudioEnabled, addLog]);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      setStatus(SystemStatus.IDLE);
      addLog("Monitoring stopped by user");
      if (audioRef.current) audioRef.current.pause();
    } else {
      setIsMonitoring(true);
      setStatus(SystemStatus.SCANNING);
      addLog("System armed and scanning...");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === SystemStatus.ALERT ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">IgnisGuard <span className="text-orange-500">AI</span></h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Fire Detection & Alert System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2 text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Siren Source</span>
              <span className="text-xs text-blue-400 font-medium truncate max-w-[120px]">
                {customSirenName || "aag.mp3 (Default)"}
              </span>
            </div>
            
            <button 
              onClick={triggerFileInput}
              className="p-2 rounded-full text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
              title="Change Siren Sound"
            >
              <Music className="w-5 h-5" />
            </button>

            <button 
              onClick={() => {
                if (audioRef.current?.paused) {
                  playSiren();
                  setTimeout(stopSiren, 2000);
                  addLog("Testing siren sound...");
                } else {
                  stopSiren();
                }
              }}
              className="p-2 rounded-full text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
              title="Test Siren"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`p-2 rounded-full transition-colors ${isAudioEnabled ? 'text-blue-400 hover:bg-blue-400/10' : 'text-slate-500 hover:bg-slate-500/10'}`}
              title={isAudioEnabled ? "Siren Enabled" : "Siren Muted"}
            >
              {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleMonitoring}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all shadow-lg active:scale-95 ${
                isMonitoring 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isMonitoring ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  DISARM
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  ARM
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Camera Feed & Alert */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AlertBanner status={status} lastResult={lastResult} />
          
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
            <CameraFeed 
              isMonitoring={isMonitoring} 
              onFrame={handleDetection} 
              status={status}
            />
            
            {/* Overlay UI */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                  {status}
                </span>
              </div>
            </div>

            {lastResult && isMonitoring && (
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 min-w-[240px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Confidence Score</span>
                  <span className={`text-sm font-bold ${lastResult.fireDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                    {(lastResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${lastResult.fireDetected ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${lastResult.confidence * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-300 italic">
                  {lastResult.details}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status & Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
             <StatusCard 
                title="System Health" 
                value="Optimal" 
                icon={<Activity className="w-4 h-4 text-emerald-400" />}
                trend="Stable"
             />
             <StatusCard 
                title="CPU Usage" 
                value="Low" 
                icon={<Video className="w-4 h-4 text-blue-400" />}
                trend="AI Engine Active"
             />
          </div>

          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Detection Logs</h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">REALTIME</span>
            </div>
            <DetectionLog logs={logs} />
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-orange-400">System Instruction</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  IgnisGuard is set to use <strong>components/aag.mp3</strong> as the alert sound. It will repeat in a loop as long as the AI detects fire with high confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center border-t border-slate-900 bg-slate-950">
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">
          &copy; 2024 IgnisGuard AI Security • Local Siren: aag.mp3
        </p>
      </footer>
    </div>
  );
};

export default App;
