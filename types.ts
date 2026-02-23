
export interface DetectionResult {
  fireDetected: boolean;
  confidence: number;
  details: string;
  timestamp: Date;
}

export enum SystemStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ALERT = 'ALERT',
  OFFLINE = 'OFFLINE'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  status: 'info' | 'warning' | 'critical';
  message: string;
}
