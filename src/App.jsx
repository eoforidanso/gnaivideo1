import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css'

/* ===== FLOATING PARTICLES ===== */
function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 1.5 + Math.random() * 3.5,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 14,
      opacity: 0.08 + Math.random() * 0.2,
      color: ['#fcd116', '#fcd116', '#ce1126', '#006b3f', '#fff8dc'][Math.floor(Math.random() * 5)],
    })), [])

  return (
    <div className="particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ===== AUDIO VISUALIZER (decorative — does NOT touch audio stream) ===== */
function AudioVisualizer({ isPlaying }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const barsRef = useRef(Array.from({ length: 64 }, () => Math.random() * 0.3))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const bars = barsRef.current

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const barW = (W / bars.length) * 1.1
      let x = 0
      for (let i = 0; i < bars.length; i++) {
        // Animate bars when playing
        if (isPlaying) {
          bars[i] += (Math.random() - 0.48) * 0.12
          bars[i] = Math.max(0.05, Math.min(1, bars[i]))
        } else {
          bars[i] *= 0.95
        }
        const barH = bars[i] * H * 0.85
        const ratio = i / bars.length
        let r, g, b
        if (ratio < 0.33) { r = 0; g = 107; b = 63 }
        else if (ratio < 0.66) { r = 252; g = 209; b = 22 }
        else { r = 206; g = 17; b = 38 }
        ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + bars[i] * 0.5})`
        ctx.shadowBlur = 6
        ctx.shadowColor = `rgba(${r},${g},${b},0.4)`
        ctx.fillRect(x, (H - barH) / 2, barW - 1, barH)
        x += barW
      }
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [isPlaying])

  return <canvas ref={canvasRef} className="audio-visualizer" width={800} height={100} />
}

/* ===== HELPERS ===== */
function formatTime(s) {
  if (isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/* ================================================================
   MAIN APP
   ================================================================ */
function App() {
  const videoRef = useRef(null)
  const progressRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1.0)
  const [currentLyric, setCurrentLyric] = useState('')

  /* ---------- LYRICS / SUBTITLES ---------- */
  // Lyrics synced to video timestamps (seconds)
  // Edit these to match the actual audio
  const lyrics = useMemo(() => [
    { start: 0, end: 4, text: '' },
    { start: 4, end: 8, text: '♪ Welcome to the inauguration... ♪' },
    { start: 8, end: 14, text: '♪ Ghana Nurses Association Illinois ♪' },
    { start: 14, end: 20, text: '♪ Together we rise, together we serve ♪' },
    { start: 20, end: 26, text: '♪ In unity and pride we stand ♪' },
    { start: 26, end: 32, text: '♪ Service to humanity ♪' },
    { start: 32, end: 38, text: '♪ Is the best work of life ♪' },
    { start: 38, end: 44, text: '♪ Nursing excellence, Ghanaian heritage ♪' },
    { start: 44, end: 50, text: '♪ Building bridges across the diaspora ♪' },
    { start: 50, end: 56, text: '♪ Illinois Chapter, our new beginning ♪' },
    { start: 56, end: 62, text: '♪ Swearing in a new era of leadership ♪' },
    { start: 62, end: 68, text: '♪ With honor, with courage, with love ♪' },
    { start: 68, end: 999, text: '' },
  ], [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v?.duration) return
    setProgress((v.currentTime / v.duration) * 100)
    setCurrentTime(v.currentTime)
    // Update lyrics
    const t = v.currentTime
    const line = lyrics.find(l => t >= l.start && t < l.end)
    setCurrentLyric(line?.text || '')
  }, [lyrics])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [])

  const handleProgressClick = useCallback((e) => {
    const v = videoRef.current, bar = progressRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration
  }, [])

  const handleVolumeChange = useCallback((e) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (videoRef.current) videoRef.current.volume = vol
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = document.querySelector('.video-frame')
    if (!el) return
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen()
  }, [])

  const skip = useCallback((sec) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec))
  }, [])

  const shareOnWhatsApp = useCallback(async () => {
    const title = 'Ghana Nurses Association Illinois \u2014 Official Inauguration'
    const text = 'Watch the Official Inauguration Ceremony of GNA Illinois!'
    const url = window.location.href

    // Try Web Share API first (works on mobile \u2014 shares image directly)
    if (navigator.share) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}poster.jpg`)
        const blob = await res.blob()
        const file = new File([blob], 'GNA-Illinois-Inauguration.jpg', { type: 'image/jpeg' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text, files: [file] })
          return
        }
        await navigator.share({ title, text, url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }, [])

  const downloadPoster = useCallback(() => {
    const a = document.createElement('a')
    a.href = `${import.meta.env.BASE_URL}poster.jpg`
    a.download = 'GNA-Illinois-Inauguration.jpg'
    a.click()
  }, [])

  return (
    <div className="landing">
      <Particles />

      {/* ===== VIDEO ===== */}
      <section className="hero" id="video-section">

        {/* Video Player */}
        <div className="video-showcase">
          <div className="video-frame">
            <div className="video-top-bar">
              <span className="top-dot red" />
              <span className="top-dot gold" />
              <span className="top-dot green" />
              <span className="top-bar-title">GNA Illinois — Official Inauguration</span>
            </div>

            <div className="video-wrapper" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={`${import.meta.env.BASE_URL}video.mp4`}
                poster={`${import.meta.env.BASE_URL}poster.jpg`}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                playsInline
                preload="auto"
              />
              <div className={`play-overlay ${isPlaying ? 'hidden' : ''}`}>
                <button className="play-btn" onClick={(e) => { e.stopPropagation(); togglePlay() }}>
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <span className="play-label">Watch the Ceremony</span>
              </div>
              {/* Running Lyrics */}
              {currentLyric && isPlaying && (
                <div className="lyrics-overlay">
                  <span className="lyrics-text" key={currentLyric}>{currentLyric}</span>
                </div>
              )}
            </div>

            <AudioVisualizer isPlaying={isPlaying} />

            <div className="video-controls">
              <button className="ctrl-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button className="ctrl-btn" onClick={() => skip(-10)} aria-label="Rewind 10s" title="-10s">
                <svg viewBox="0 0 24 24"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
              </button>
              <button className="ctrl-btn" onClick={() => skip(10)} aria-label="Forward 10s" title="+10s">
                <svg viewBox="0 0 24 24"><path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg>
              </button>
              <div className="progress-container" ref={progressRef} onClick={handleProgressClick}>
                <div className="progress-bar" style={{ width: `${progress}%` }} />
                <div className="progress-thumb" style={{ left: `${progress}%` }} />
              </div>
              <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="volume-group">
                <button className="ctrl-btn" onClick={() => { const v = volume > 0 ? 0 : 1; setVolume(v); if (videoRef.current) videoRef.current.volume = v }} aria-label="Mute">
                  <svg viewBox="0 0 24 24">
                    {volume > 0.5 ? <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    : volume > 0 ? <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    : <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />}
                  </svg>
                </button>
                <input className="volume-slider" type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} aria-label="Volume" />
              </div>
              <select className="speed-select" defaultValue="1" onChange={(e) => { if (videoRef.current) videoRef.current.playbackRate = parseFloat(e.target.value) }} aria-label="Speed">
                <option value="0.5">0.5×</option>
                <option value="0.75">0.75×</option>
                <option value="1">1×</option>
                <option value="1.25">1.25×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
              <button className="ctrl-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
                <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              </button>
            </div>

            {/* Share Buttons */}
            <div className="share-bar">
              <button className="whatsapp-share-btn" onClick={shareOnWhatsApp}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </button>
              <button className="download-share-btn" onClick={downloadPoster}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                Download Image
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
