import { useState, useRef } from 'react'
import { predictFile } from '../api'

function AnomalyGauge({ score }) {
  const pct   = Math.min(Math.max(score, 0), 1)
  const angle = -90 + pct * 180
  const color = pct < 0.3 ? '#27ae60' : pct < 0.6 ? '#f5a623' : '#c0392b'
  const label = pct < 0.3 ? 'NOMINAL' : pct < 0.6 ? 'WARNING' : 'FAULT DETECTED'

  return (
    <div style={{textAlign:'center', margin:'2rem 0'}}>
      <svg viewBox="0 0 220 130" width="300">
        {Array.from({length:11}, (_,i) => {
          const a = (-90 + i * 18) * Math.PI / 180
          const r1 = 85, r2 = 92
          return (
            <line key={i}
              x1={110 + r1*Math.cos(a)} y1={110 + r1*Math.sin(a)}
              x2={110 + r2*Math.cos(a)} y2={110 + r2*Math.sin(a)}
              stroke="#2a2a2a" strokeWidth="1.5"
            />
          )
        })}
        <path d="M 25 110 A 85 85 0 0 1 195 110"
              fill="none" stroke="#1a1a1a" strokeWidth="14" strokeLinecap="butt" />
        <path d="M 25 110 A 85 85 0 0 1 110 25"
              fill="none" stroke="#27ae6022" strokeWidth="14" strokeLinecap="butt" />
        <path d="M 110 25 A 85 85 0 0 1 195 110"
              fill="none" stroke="#c0392b22" strokeWidth="14" strokeLinecap="butt" />
        <path d="M 25 110 A 85 85 0 0 1 195 110"
              fill="none" stroke={color} strokeWidth="14" strokeLinecap="butt"
              strokeDasharray={`${pct * 267} 267`}
              style={{filter:`drop-shadow(0 0 6px ${color}88)`}} />
        <g transform={`rotate(${angle}, 110, 110)`}>
          <line x1="110" y1="110" x2="110" y2="35"
                stroke={color} strokeWidth="1.5" strokeLinecap="round"
                style={{filter:`drop-shadow(0 0 4px ${color})`}} />
        </g>
        <circle cx="110" cy="110" r="4" fill={color}
                style={{filter:`drop-shadow(0 0 6px ${color})`}} />
        <text x="110" y="95" textAnchor="middle" fill={color}
              fontSize="22" fontFamily="Orbitron" fontWeight="900">
          {(pct * 100).toFixed(1)}
        </text>
        <text x="110" y="108" textAnchor="middle" fill="#6b5f4e"
              fontSize="8" fontFamily="Share Tech Mono" letterSpacing="2">
          ANOMALY SCORE
        </text>
      </svg>
      <div style={{
        fontFamily:'var(--font-disp)', fontSize:'0.9rem',
        fontWeight:700, color, letterSpacing:'0.2em',
        textShadow:`0 0 20px ${color}88`,
        marginTop:'0.5rem'
      }}>
        {label}
      </div>
    </div>
  )
}

export default function Upload() {
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [dragging,   setDragging]   = useState(false)
  const [machine,    setMachine]    = useState('fan')
  const [noiseLevel, setNoiseLevel] = useState('6dB')
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file?.name.endsWith('.wav')) {
      setError('INVALID FORMAT — .WAV FILES ONLY')
      return
    }
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await predictFile(file, machine, noiseLevel)
      setResult(res.data)
    } catch {
      setError('CONNECTION FAILED — IS API ONLINE?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Live Analysis</div>
        <div className="page-subtitle">Real-time anomaly detection · Autoencoder model</div>
      </div>

      <div style={{maxWidth:520, margin:'0 auto'}}>

        {/* Machine + Noise selectors */}
        <div style={{display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:'0.65rem', color:'var(--text-dim)',
                         letterSpacing:'0.12em', textTransform:'uppercase',
                         marginBottom:'0.4rem'}}>Machine Type</div>
            <div style={{display:'flex', gap:'0.4rem'}}>
              {['fan','pump'].map(m => (
                <button key={m} onClick={() => setMachine(m)}
                  style={{
                    fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                    letterSpacing:'0.1em', textTransform:'uppercase',
                    padding:'0.4rem 1rem', cursor:'pointer', border:'1px solid',
                    borderColor: m === machine ? 'var(--text)' : 'var(--border)',
                    background:  m === machine ? 'var(--text)' : 'transparent',
                    color:       m === machine ? 'var(--bg)' : 'var(--text-dim)',
                    borderRadius:'1px', transition:'all 0.15s'
                  }}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:'0.65rem', color:'var(--text-dim)',
                         letterSpacing:'0.12em', textTransform:'uppercase',
                         marginBottom:'0.4rem'}}>Noise Level</div>
            <div style={{display:'flex', gap:'0.4rem'}}>
              {['6dB','0dB','-6dB'].map(nl => (
                <button key={nl} onClick={() => setNoiseLevel(nl)}
                  style={{
                    fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                    letterSpacing:'0.1em', textTransform:'uppercase',
                    padding:'0.4rem 1rem', cursor:'pointer', border:'1px solid',
                    borderColor: nl === noiseLevel ? 'var(--text)' : 'var(--border)',
                    background:  nl === noiseLevel ? 'var(--text)' : 'transparent',
                    color:       nl === noiseLevel ? 'var(--bg)' : 'var(--text-dim)',
                    borderRadius:'1px', transition:'all 0.15s'
                  }}>{nl}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className="card"
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
          style={{
            textAlign:'center', cursor:'pointer',
            padding:'3rem 2rem',
            border: dragging
              ? '1px solid var(--amber)'
              : '1px solid var(--border)',
            background: dragging ? 'var(--bg-raised)' : 'var(--bg-card)',
            transition:'all 0.15s'
          }}
        >
          <div style={{
            fontSize:'2rem', marginBottom:'1rem',
            filter: loading ? 'none' : 'grayscale(1)',
            transition:'filter 0.2s'
          }}>
            {loading ? '⟳' : '◈'}
          </div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.75rem',
            color:'var(--text-dim)', letterSpacing:'0.12em',
            textTransform:'uppercase'
          }}>
            {loading ? 'ANALYSING SIGNAL...' : 'DROP .WAV FILE · CLICK TO BROWSE'}
          </div>
          <div style={{
            fontSize:'0.65rem', color:'#888880',
            marginTop:'0.5rem', letterSpacing:'0.08em'
          }}>
            {machine.toUpperCase()} · {noiseLevel} · 16kHz · 10 seconds
          </div>
          <input ref={inputRef} type="file" accept=".wav"
                 style={{display:'none'}}
                 onChange={e => handleFile(e.target.files[0])} />
        </div>

        {error && (
          <div style={{
            color:'var(--red)', marginTop:'1rem',
            textAlign:'center', fontSize:'0.75rem',
            letterSpacing:'0.12em', fontFamily:'var(--font-mono)'
          }}>{error}</div>
        )}

        {result && (
          <div className="card" style={{marginTop:'1rem'}}>
            <div className="chart-title">{result.filename}</div>
            <AnomalyGauge score={result.anomaly_score} />
            <table className="retro-table">
              <tbody>
                {[
                  ['Machine',              result.machine_type + ' · ' + result.noise_level],
                  ['Model',                result.model_name],
                  ['Anomaly Score',        result.anomaly_score.toFixed(4)],
                  ['Reconstruction Error', result.reconstruction_error.toFixed(4)],
                  ['Threshold Used',       result.threshold_used],
                  ['Verdict',              result.predicted_label.toUpperCase()],
                  ['Feature Extraction',   result.latency_ms?.feature_extraction + ' ms'],
                  ['Model Inference',      result.latency_ms?.model_inference + ' ms'],
                  ['Total Latency',        result.latency_ms?.total + ' ms'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{color:'var(--text-dim)', fontSize:'0.7rem',
                                 letterSpacing:'0.1em', textTransform:'uppercase'}}>{k}</td>
                    <td style={{
                      textAlign:'right', fontFamily:'var(--font-mono)',
                      color: k === 'Verdict'
                        ? result.predicted_label === 'normal'
                          ? 'var(--green)' : 'var(--red)'
                        : 'var(--amber)'
                    }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}