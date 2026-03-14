(function () {
  'use strict';

  const PAD_COUNT = 16;
  const KEY_MAP = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f'];

  const DEFAULT_LABELS = [
    'Kick', 'Snare', 'Hat', 'Clap',
    'Kick 2', 'Rim', 'Open Hat', 'Perc',
    'Tom Lo', 'Tom Mid', 'Tom Hi', 'Shaker',
    'Stab', 'Bass', 'FX', 'Crash'
  ];

  let audioContext = null;
  let masterGain = null;
  let recordingPlaybackGain = null;
  const customBuffers = new Map(); // padIndex -> AudioBuffer
  let selectedFile = null;
  let selectedFileBuffer = null;

  let paused = false;
  let mutedByStopAll = false;
  let recording = false;
  let recordStartTime = 0;
  let recordedEvents = []; // { t: number (seconds), pad: number }[]

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioContext.destination);
      recordingPlaybackGain = audioContext.createGain();
      recordingPlaybackGain.gain.value = 1;
      recordingPlaybackGain.connect(masterGain);
    }
    return audioContext;
  }

  function getMasterGain() {
    getAudioContext();
    return masterGain;
  }

  function getRecordingPlaybackGain() {
    getAudioContext();
    return recordingPlaybackGain;
  }

  function getDestAndTime(options) {
    const ctx = (options && options.ctx) || getAudioContext();
    return {
      ctx,
      dest: options && options.dest != null ? options.dest : getMasterGain(),
      t: options && options.atTime != null ? options.atTime : ctx.currentTime
    };
  }

  // ——— Synth sounds (no external files) ———
  function playKick(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.7;
    gainNode.connect(dest);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gainNode);
    osc.start(t);
    osc.stop(t + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  }

  function playSnare(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.5;
    gainNode.connect(dest);

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    noise.buffer = buffer;
    noise.connect(gainNode);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gainNode);
    gainNode.gain.setValueAtTime(1, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    noise.start(t);
    noise.stop(t + 0.2);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  function playHat(closed = true, velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * (closed ? 0.25 : 0.2);
    gainNode.connect(dest);
    const len = closed ? 0.05 : 0.2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + len);
    noise.start(t);
    noise.stop(t + buffer.duration);
  }

  function playClap(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.4;
    gainNode.connect(dest);
    for (let i = 0; i < 3; i++) {
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1);
      noise.buffer = buffer;
      noise.connect(gainNode);
      const start = t + i * 0.03;
      gainNode.gain.setValueAtTime(0.5, start);
      noise.start(start);
      noise.stop(start + 0.08);
    }
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  }

  function playTom(freq, velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.5;
    gainNode.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gainNode);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function playRim(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.4;
    gainNode.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gainNode);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  function playStab(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.3;
    gainNode.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(330, t);
    osc.connect(gainNode);
    gainNode.gain.setValueAtTime(1, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  function playBass(velocity = 1, options) {
    const { ctx, dest, t } = getDestAndTime(options);
    const gainNode = ctx.createGain();
    gainNode.gain.value = velocity * 0.5;
    gainNode.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gainNode);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  const defaultPlayers = [
    (v, opt) => playKick(v || 1, opt),
    (v, opt) => playSnare(v || 1, opt),
    (v, opt) => playHat(true, v || 1, opt),
    (v, opt) => playClap(v || 1, opt),
    (v, opt) => playKick(0.9, opt),
    (v, opt) => playRim(v || 1, opt),
    (v, opt) => playHat(false, 0.9, opt),
    (v, opt) => playRim(0.7, opt),
    (v, opt) => playTom(80, v || 1, opt),
    (v, opt) => playTom(120, v || 1, opt),
    (v, opt) => playTom(180, v || 1, opt),
    (v, opt) => playHat(true, 0.6, opt),
    (v, opt) => playStab(v || 1, opt),
    (v, opt) => playBass(v || 1, opt),
    (v, opt) => playSnare(0.5, opt),
    (v, opt) => playHat(false, 0.7, opt)
  ];

  function triggerPad(index, options) {
    if (index < 0 || index >= PAD_COUNT) return;
    const isScheduled = options && (options.atTime != null || options.dest != null);

    if (!isScheduled) {
      const padEl = document.querySelector(`[data-pad-index="${index}"]`);
      if (padEl) {
        padEl.classList.add('triggered');
        setTimeout(() => padEl.classList.remove('triggered'), 80);
      }
      if (recording) {
        const t = (performance.now() - recordStartTime) / 1000;
        recordedEvents.push({ t, pad: index });
      }
      if (paused) return;
      if (mutedByStopAll && masterGain) {
        mutedByStopAll = false;
        const vol = document.getElementById('masterVol');
        masterGain.gain.setValueAtTime(paused ? 0 : (Number(vol ? vol.value : 85) / 100), (audioContext || getAudioContext()).currentTime);
      }
    }

    const ctx = (options && options.ctx) || getAudioContext();
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();

    if (customBuffers.has(index)) {
      const src = ctx.createBufferSource();
      src.buffer = customBuffers.get(index);
      const dest = (options && options.dest) || getMasterGain();
      const t = (options && options.atTime != null) ? options.atTime : ctx.currentTime;
      src.connect(dest);
      src.start(t, 0);
    } else {
      const fn = defaultPlayers[index];
      if (fn) fn(1, options);
    }
  }

  function stopAll() {
    const g = getMasterGain();
    if (!g) return;
    g.gain.setValueAtTime(0, (audioContext || getAudioContext()).currentTime);
    mutedByStopAll = true;
    if (recordingPlaybackGain) recordingPlaybackGain.gain.setValueAtTime(0, (audioContext || getAudioContext()).currentTime);
  }

  function buildPadGrid() {
    const grid = document.getElementById('padGrid');
    grid.innerHTML = '';
    for (let i = 0; i < PAD_COUNT; i++) {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'pad' + (customBuffers.has(i) ? ' custom' : '');
      pad.dataset.padIndex = i;
      pad.setAttribute('aria-label', `Pad ${i + 1}: ${DEFAULT_LABELS[i]}`);
      pad.innerHTML = `<span class="pad-label">${DEFAULT_LABELS[i]}</span><span class="pad-key">${KEY_MAP[i]}</span>`;
      pad.addEventListener('click', () => triggerPad(i));
      grid.appendChild(pad);
    }
  }

  function refreshAssignSelect() {
    const select = document.getElementById('assignPad');
    select.innerHTML = '<option value="">Select pad…</option>';
    for (let i = 0; i < PAD_COUNT; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Pad ${i + 1} — ${DEFAULT_LABELS[i]}`;
      select.appendChild(opt);
    }
  }

  function updatePadCustomState(index, hasCustom) {
    const pad = document.querySelector(`[data-pad-index="${index}"]`);
    if (pad) pad.classList.toggle('custom', !!hasCustom);
  }

  document.getElementById('paused').addEventListener('change', function () {
    paused = this.checked;
    const g = getMasterGain();
    const vol = document.getElementById('masterVol');
    if (g) g.gain.value = paused ? 0 : (Number(vol ? vol.value : 85) / 100);
  });

  document.getElementById('masterVol').addEventListener('input', function () {
    const g = getMasterGain();
    if (g && !paused) g.gain.value = this.value / 100;
  });

  document.getElementById('bpm').addEventListener('change', function () {
    const bpm = Math.max(60, Math.min(180, Number(this.value) || 120));
    this.value = bpm;
    window.__bpm = bpm;
  });

  document.getElementById('stopAll').addEventListener('click', stopAll);

  function updateRecordUI() {
    const status = document.getElementById('recordStatus');
    const playBtn = document.getElementById('playRecordBtn');
    const saveProjectBtn = document.getElementById('saveProjectBtn');
    const exportWavBtn = document.getElementById('exportWavBtn');
    status.textContent = recording ? 'Recording…' : (recordedEvents.length ? `${recordedEvents.length} hits recorded` : 'No recording.');
    status.className = 'record-status' + (recording ? ' recording' : (recordedEvents.length ? ' has-recording' : ''));
    playBtn.disabled = !recordedEvents.length;
    saveProjectBtn.disabled = !recordedEvents.length;
    exportWavBtn.disabled = !recordedEvents.length;
  }

  document.getElementById('recordBtn').addEventListener('click', function () {
    recording = true;
    recordStartTime = performance.now();
    recordedEvents = [];
    document.getElementById('stopRecordBtn').disabled = false;
    document.getElementById('recordBtn').disabled = true;
    updateRecordUI();
  });

  document.getElementById('stopRecordBtn').addEventListener('click', function () {
    recording = false;
    document.getElementById('stopRecordBtn').disabled = true;
    document.getElementById('recordBtn').disabled = false;
    updateRecordUI();
  });

  document.getElementById('playRecordBtn').addEventListener('click', function () {
    if (!recordedEvents.length) return;
    getAudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    if (mutedByStopAll && masterGain) {
      mutedByStopAll = false;
      const volEl = document.getElementById('masterVol');
      masterGain.gain.setValueAtTime(paused ? 0 : (Number(volEl ? volEl.value : 85) / 100), audioContext.currentTime);
    }
    if (recordingPlaybackGain) recordingPlaybackGain.gain.setValueAtTime(1, audioContext.currentTime);
    const start = audioContext.currentTime;
    recordedEvents.forEach(function (ev) {
      triggerPad(ev.pad, { atTime: start + ev.t, dest: getRecordingPlaybackGain() });
    });
  });

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('saveProjectBtn').addEventListener('click', function () {
    if (!recordedEvents.length) return;
    const bpm = parseInt(document.getElementById('bpm').value, 10) || 120;
    const project = { version: 1, bpm, events: recordedEvents };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const name = 'jillt-beat-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
    downloadBlob(blob, name);
  });

  document.getElementById('loadProjectBtn').addEventListener('click', function () {
    document.getElementById('loadProjectFile').click();
  });

  document.getElementById('loadProjectFile').addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const project = JSON.parse(reader.result);
        if (Array.isArray(project.events)) {
          recordedEvents = project.events;
          if (typeof project.bpm === 'number') document.getElementById('bpm').value = project.bpm;
          updateRecordUI();
        }
      } catch (e) {
        document.getElementById('recordStatus').textContent = 'Invalid project file.';
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  document.getElementById('exportWavBtn').addEventListener('click', function () {
    if (!recordedEvents.length) return;
    const ctx = getAudioContext();
    const maxT = recordedEvents.length ? Math.max.apply(null, recordedEvents.map(function (e) { return e.t; })) : 0;
    const duration = Math.max(1, maxT + 3);
    const sampleRate = ctx.sampleRate;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(duration * sampleRate), sampleRate);
    const gain = offlineCtx.createGain();
    gain.gain.value = 1;
    gain.connect(offlineCtx.destination);
    recordedEvents.forEach(function (ev) {
      triggerPad(ev.pad, { ctx: offlineCtx, dest: gain, atTime: ev.t });
    });
    offlineCtx.startRendering().then(function (buffer) {
      const wav = audioBufferToWav(buffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const name = 'jillt-beat-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.wav';
      downloadBlob(blob, name);
    });
  });

  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLen = buffer.length * blockAlign;
    const bufferLength = 44 + dataLen;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    const writeStr = function (offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLen, true);
    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return arrayBuffer;
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      stopAll();
      return;
    }
    const idx = KEY_MAP.indexOf(e.key.toLowerCase());
    if (idx !== -1) {
      e.preventDefault();
      triggerPad(idx);
    }
  });

  const pickFile = document.getElementById('pickFile');
  const soundFile = document.getElementById('soundFile');
  const fileName = document.getElementById('fileName');
  const assignPad = document.getElementById('assignPad');
  const assignBtn = document.getElementById('assignBtn');

  pickFile.addEventListener('click', () => soundFile.click());

  soundFile.addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;
    selectedFile = file;
    fileName.textContent = file.name;
    const ctx = getAudioContext();
    const reader = new FileReader();
    reader.onload = function () {
      ctx.decodeAudioData(reader.result)
        .then(function (buffer) {
          selectedFileBuffer = buffer;
          assignBtn.disabled = false;
        })
        .catch(function () {
          fileName.textContent = 'Could not decode audio';
          selectedFileBuffer = null;
          assignBtn.disabled = true;
        });
    };
    reader.readAsArrayBuffer(file);
  });

  assignBtn.addEventListener('click', function () {
    const padIndex = parseInt(assignPad.value, 10);
    if (isNaN(padIndex) || !selectedFileBuffer) return;
    customBuffers.set(padIndex, selectedFileBuffer);
    updatePadCustomState(padIndex, true);
    assignBtn.disabled = true;
    selectedFileBuffer = null;
    fileName.textContent = 'Assigned. Load another to assign.';
    soundFile.value = '';
  });

  buildPadGrid();
  refreshAssignSelect();
  window.__bpm = 120;
})();
