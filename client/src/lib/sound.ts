export type SoundEvent = 'success' | 'delete' | 'error' | 'notification' | 'click';

export interface SoundConfig {
  enabled: boolean;
  successSound: string;      // URL or preset (e.g. 'synth-success')
  deleteSound: string;       // URL or preset
  errorSound: string;        // URL or preset
  notificationSound: string; // URL or preset
  clickSound: string;        // URL or preset
  volume: number;            // 0.0 to 1.0
}

const DEFAULT_CONFIG: SoundConfig = {
  enabled: true,
  successSound: 'synth-success',
  deleteSound: 'synth-delete',
  errorSound: 'synth-error',
  notificationSound: 'synth-notification',
  clickSound: 'synth-click',
  volume: 0.5,
};

const USER_MUTE_KEY = 'atrs_user_sound_mute';
const GLOBAL_CONFIG_CACHE_KEY = 'atrs_global_sound_config_cache';

export function isUserMuted(): boolean {
  return localStorage.getItem(USER_MUTE_KEY) === 'true';
}

export function setUserMute(mute: boolean) {
  localStorage.setItem(USER_MUTE_KEY, String(mute));
}

// Retrieve config cached from server or default
export function getSoundConfig(): SoundConfig {
  try {
    const cached = localStorage.getItem(GLOBAL_CONFIG_CACHE_KEY);
    if (cached) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function setCachedSoundConfig(config: SoundConfig) {
  localStorage.setItem(GLOBAL_CONFIG_CACHE_KEY, JSON.stringify(config));
}

// Play sound based on event type
export function playSound(event: SoundEvent) {
  // If user muted, do not play
  if (isUserMuted()) return;

  const config = getSoundConfig();
  // If sounds are disabled globally by admin, do not play
  if (!config.enabled) return;

  const soundType = {
    success: config.successSound,
    delete: config.deleteSound,
    error: config.errorSound,
    notification: config.notificationSound,
    click: config.clickSound,
  }[event];

  if (!soundType) return;

  // Detect if it is a URL or file path
  if (
    soundType.startsWith('http') ||
    soundType.startsWith('/') ||
    soundType.endsWith('.mp3') ||
    soundType.endsWith('.wav') ||
    soundType.endsWith('.ogg')
  ) {
    try {
      const audio = new Audio(soundType);
      audio.volume = config.volume;
      audio.play().catch(() => {
        // Autoplay policy blocker (requires user interaction first)
      });
    } catch (err) {
      console.warn('Failed to play sound URL:', err);
    }
  } else {
    // Play synthesized Web Audio
    playSynthPreset(soundType, config.volume);
  }
}

// Web Audio API Synthesizer (Zero asset dependency, zero latency)
function playSynthPreset(preset: string, volume: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);

    switch (preset) {
      case 'synth-success': {
        // Pleasant rising double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.frequency.setValueAtTime(880, now + 0.15); // A5
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'synth-delete': {
        // Low pitch descending blip/whoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      case 'synth-error': {
        // Double low-pitch buzzer sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.05);
        gain.gain.setValueAtTime(0.01, now + 0.12);
        
        osc.frequency.setValueAtTime(140, now + 0.15);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'synth-notification': {
        // Bright double chime notification
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        
        osc.frequency.setValueAtTime(987.77, now + 0.1); // B5
        gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }
      case 'synth-click': {
        // Light quick click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.linearRampToValueAtTime(volume * 0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      default: {
        // Simple fallback beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.3);
      }
    }
  } catch (err) {
    console.error('[Sound] Synth playback failed:', err);
  }
}
