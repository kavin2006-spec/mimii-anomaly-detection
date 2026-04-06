import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { getScoreDistribution, getModelComparison } from '../api'
const MACHINES    = ['fan', 'pump']
function buildHistogram(data, bins = 25) {
  const result = Array.from({ length: bins }, (_, i) => ({
    bin:      parseFloat((i / bins).toFixed(2)),
    normal:   0,
    abnormal: 0
  }))
  data.forEach(({ anomaly_score, true_label }) => {
    const idx = Math.min(Math.floor(anomaly_score * bins), bins - 1)
    if (true_label === 'normal') result[idx].normal++
    else result[idx].abnormal++
  })
  return result
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d0cb',
      padding:'0.75rem', fontSize:'0.75rem',
      fontFamily:'var(--font-mono)'
    }}>
      <div style={{color:'var(--text-dim)', marginBottom:'0.3rem'}}>
        SCORE: {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{
          color: p.name === 'normal' ? '#15803d' : '#dc2626'
        }}>
          {p.name.toUpperCase()}: {p.value}
        </div>
      ))}
    </div>
  )
}

const NOISE_LEVELS = ['6dB', '0dB', '-6dB']
const NOISE_LABELS = {
  '6dB':  '6dB — Clean',
  '0dB':  '0dB — Moderate',
  '-6dB': '-6dB — Noisy'
}
const AUC_MAP = {
  fan: {
  '6dB':  { isolation_forest: 0.8549, autoencoder: 0.9216 },
  '0dB':  { isolation_forest: 0.6964, autoencoder: 0.8110 },
  '-6dB': { isolation_forest: 0.5896, autoencoder: 0.6845 },
  },
  pump: {
    '6dB':  { isolation_forest: 0.9742, autoencoder: 0.9982 },
    '0dB':  { isolation_forest: 0.9282, autoencoder: 0.9755 },
    '-6dB': { isolation_forest: 0.8865, autoencoder: 0.9233 },
  }
}

export default function Analytics() {
  const [noiseLevel, setNoiseLevel] = useState('6dB')
  const [machine,    setMachine]    = useState('fan')
  const [distData,   setDistData]   = useState([])
  const [models,     setModels]     = useState([])

  useEffect(() => {
    getScoreDistribution('autoencoder', noiseLevel, machine)
      .then(r => setDistData(buildHistogram(r.data)))
    getModelComparison(noiseLevel, machine)
      .then(r => setModels(r.data))
  }, [noiseLevel, machine])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-subtitle">
          Model performance · {machine.toUpperCase()} id_00  · {NOISE_LABELS[noiseLevel]}
        </div>
      </div>
      {/* Machine selector */}
      <div style={{display:'flex', gap:'0.5rem', marginBottom:'0.75rem'}}>
        {MACHINES.map(m => (
          <button key={m} onClick={() => setMachine(m)}
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding:       '0.4rem 1rem',
              cursor:        'pointer',
              border:        '1px solid',
              borderColor:   m === machine ? 'var(--text)' : 'var(--border)',
              background:    m === machine ? 'var(--text)' : 'transparent',
              color:         m === machine ? 'var(--bg)' : 'var(--text-dim)',
              borderRadius:'1px',
              transition:  'all 0.15s'
            }}>
            {m}
          </button>
        ))}
      </div> 
      {/* Noise level selector */}
      <div style={{display:'flex', gap:'0.5rem', marginBottom:'1.5rem'}}>
        {NOISE_LEVELS.map(nl => (
          <button key={nl} onClick={() => setNoiseLevel(nl)}
            style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding:     '0.4rem 1rem',
              cursor:      'pointer',
              border:      '1px solid',
              borderColor: nl === noiseLevel ? 'var(--text)' : 'var(--border)',
              background:  nl === noiseLevel ? 'var(--text)' : 'transparent',
              color:       nl === noiseLevel ? 'var(--bg)' : 'var(--text-dim)',
              borderRadius:'1px',
              transition:  'all 0.15s'
            }}>
            {nl}
          </button>
        ))}
      </div>

      <div style={{marginBottom:'1rem'}}>
        <div className="card">
          <div className="chart-title">
            Anomaly Score Distribution — Normal vs Abnormal · {noiseLevel}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distData} barGap={0}
                      margin={{top:10, right:20, left:-10, bottom:20}}>
              <XAxis dataKey="bin"
                     tick={{fill:'#888880', fontSize:10, fontFamily:'Share Tech Mono'}}
                     label={{value:'ANOMALY SCORE', position:'insideBottom',
                             offset:-10, fill:'#888880', fontSize:10,
                             fontFamily:'Share Tech Mono'}}
                     axisLine={{stroke:'#d1d0cb'}} tickLine={false} />
              <YAxis tick={{fill:'#888880', fontSize:10, fontFamily:'Share Tech Mono'}}
                     axisLine={{stroke:'#d1d0cb'}} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize:'0.7rem', fontFamily:'Share Tech Mono',
                  color:'#888880', letterSpacing:'0.1em',
                  textTransform:'uppercase', paddingTop:'1rem'
                }}
              />
              <Bar dataKey="normal"   fill="#86efac" opacity={0.8} />
              <Bar dataKey="abnormal" fill="#f87171" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        {models.map(m => (
          <div className="card" key={m.model_name}>
            <div className="chart-title">
              {m.model_name === 'isolation_forest'
                ? 'Isolation Forest' : 'Autoencoder'} · {noiseLevel} Metrics
            </div>
            <table className="retro-table">
              <tbody>
                {[
                  ['AUC-ROC',  AUC_MAP[machine][noiseLevel][m.model_name].toFixed(4)],
                  ['Accuracy', (m.accuracy * 100).toFixed(1) + '%'],
                  ['Total',    m.total],
                  ['Correct',  m.correct],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{color:'var(--text-dim)', fontSize:'0.7rem',
                                 letterSpacing:'0.1em', textTransform:'uppercase'}}>{k}</td>
                    <td style={{textAlign:'right', color:'var(--amber)',
                                 fontFamily:'var(--font-disp)', fontSize:'0.9rem'}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}