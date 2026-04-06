import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { getSummary, getModelComparison, getNoiseComparison } from '../api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d0cb',
      padding:'0.75rem 1rem', fontSize:'0.75rem',
      fontFamily:'var(--font-mono)', color:'var(--text)'
    }}>
      <div style={{color:'var(--text-dim)', letterSpacing:'0.1em',
                   textTransform:'uppercase', marginBottom:'0.3rem'}}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{color:'#1a1a1a'}}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

const MACHINES  = ['fan', 'pump']
const AUC_TABLE = {
  fan:  { "6dB": { if: 0.8549, ae: 0.9216 }, "0dB": { if: 0.6964, ae: 0.8110 }, "-6dB": { if: 0.5896, ae: 0.6845 } },
  pump: { "6dB": { if: 0.9742, ae: 0.9982 }, "0dB": { if: 0.9282, ae: 0.9755 }, "-6dB": { if: 0.8865, ae: 0.9233 } },
}

export default function Dashboard() {
  const [machine,   setMachine]   = useState('fan')
  const [summary,   setSummary]   = useState(null)
  const [models,    setModels]    = useState([])
  const [noiseData, setNoiseData] = useState([])

  useEffect(() => {
    setSummary(null)
    getSummary(machine).then(r => setSummary(r.data))
    getModelComparison('6dB', machine).then(r => setModels(r.data))
    getNoiseComparison(machine).then(r => {
      const grouped = {}
      r.data.forEach(row => {
        if (!grouped[row.noise_level]) grouped[row.noise_level] = { noise_level: row.noise_level }
        const key = row.model_name === 'autoencoder' ? 'Autoencoder' : 'Isolation Forest'
        grouped[row.noise_level][key] = parseFloat(row.auc_roc.toFixed(4))
      })
      const order = ['6dB', '0dB', '-6dB']
      setNoiseData(order.map(nl => grouped[nl]).filter(Boolean))
    })
  }, [machine])

  if (!summary) return (
    <div style={{color:'var(--text-dim)', fontFamily:'var(--font-mono)',
                 letterSpacing:'0.1em', padding:'2rem'}}>
      LOADING SYSTEM DATA...
    </div>
  )

  const stats = [
    { label: 'Total Samples',  value: summary.total_clips,             unit: 'audio clips' },
    { label: 'Normal',         value: summary.normal_clips,            unit: 'healthy readings' },
    { label: 'Anomalous',      value: summary.abnormal_clips,          unit: 'fault signals' },
    { label: 'Best AUC-ROC',   value: summary.best_auc_roc.toFixed(4), unit: 'autoencoder' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">System Dashboard</div>
        <div className="page-subtitle">
          {machine.toUpperCase()} · id_00 · All noise levels
        </div>
      </div>

      {/* Machine selector */}
      <div style={{display:'flex', gap:'0.5rem', marginBottom:'1.5rem'}}>
        {MACHINES.map(m => (
          <button key={m} onClick={() => setMachine(m)}
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding:       '0.4rem 1.2rem',
              cursor:        'pointer',
              border:        '1px solid',
              borderColor:   m === machine ? 'var(--text)' : 'var(--border)',
              background:    m === machine ? 'var(--text)' : 'transparent',
              color:         m === machine ? 'var(--bg)' : 'var(--text-dim)',
              borderRadius:  '1px',
              transition:    'all 0.15s'
            }}>
            {m}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-unit">{s.unit}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="chart-title">
          AUC-ROC vs Noise Level — {machine.toUpperCase()} id_00
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={noiseData} barSize={45}
                    margin={{top:10, right:80, left:-10, bottom:0}}>
            <XAxis dataKey="noise_level"
                   tick={{fill:'#888880', fontSize:12, fontFamily:'Share Tech Mono'}}
                   tickFormatter={v => v === '6dB' ? '6dB — Clean'
                                     : v === '0dB' ? '0dB — Moderate' : '-6dB — Noisy'}
                   axisLine={{stroke:'#d1d0cb'}} tickLine={false} />
            <YAxis domain={[0.4, 1]}
                   tick={{fill:'#888880', fontSize:10, fontFamily:'Share Tech Mono'}}
                   axisLine={{stroke:'#d1d0cb'}} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize:'0.72rem', fontFamily:'Share Tech Mono',
                                   letterSpacing:'0.08em', textTransform:'uppercase'}} />
            <ReferenceLine y={0.831} stroke="#dc2626" strokeDasharray="4 4"
                           label={{value:'F1 Baseline 0.831', fill:'#dc2626',
                                   fontSize:10, fontFamily:'Share Tech Mono',
                                   position:'right'}} />
            <Bar dataKey="Isolation Forest" fill="#86efac" radius={[2,2,0,0]} />
            <Bar dataKey="Autoencoder"      fill="#f87171" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="chart-title">Model Comparison · 6dB</div>
          <table className="retro-table">
            <thead>
              <tr>
                <th>Model</th><th>AUC-ROC</th><th>Accuracy</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.model_name}>
                  <td>{m.model_name === 'isolation_forest'
                    ? 'Isolation Forest' : 'Autoencoder'}</td>
                  <td style={{color:'var(--amber)', fontFamily:'var(--font-disp)',
                               fontSize:'0.85rem'}}>{m.auc_roc.toFixed(4)}</td>
                  <td>{(m.accuracy * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${m.model_name === 'autoencoder'
                      ? 'badge-amber' : 'badge-normal'}`}>
                      {m.model_name === 'autoencoder' ? 'PRIMARY' : 'BASELINE'}
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{color:'var(--text-dim)'}}>F1 Predictor</td>
                <td style={{color:'var(--text-dim)', fontFamily:'var(--font-disp)',
                             fontSize:'0.85rem'}}>0.8310</td>
                <td style={{color:'var(--text-dim)'}}>83.1%</td>
                <td><span className="badge" style={{color:'var(--text-dim)',
                           border:'1px solid #d1d0cb'}}>PREV PROJECT</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="chart-title">Noise Level Detail · {machine.toUpperCase()}</div>
          <table className="retro-table">
            <thead>
              <tr>
                <th>Noise</th><th>Condition</th><th>IF AUC</th><th>AE AUC</th>
              </tr>
            </thead>
            <tbody>
              {[['6dB','Clean'],['0dB','Moderate'],['-6dB','Noisy']].map(([nl, cond]) => (
                <tr key={nl}>
                  <td style={{fontFamily:'var(--font-mono)',
                               color:'var(--amber)'}}>{nl}</td>
                  <td style={{color:'var(--text-dim)', fontSize:'0.75rem',
                               letterSpacing:'0.08em',
                               textTransform:'uppercase'}}>{cond}</td>
                  <td>{AUC_TABLE[machine][nl].if}</td>
                  <td style={{color:'var(--amber)', fontFamily:'var(--font-disp)',
                               fontSize:'0.85rem'}}>{AUC_TABLE[machine][nl].ae}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}