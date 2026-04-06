import { useEffect, useState } from 'react'
import { getMachines } from '../api'

export default function Machines() {
  const [machines, setMachines] = useState([])

  useEffect(() => { getMachines().then(r => setMachines(r.data)) }, [])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Machine Registry</div>
        <div className="page-subtitle">Connected industrial units · MIMII dataset</div>
      </div>

      <div className="card">
        <div className="chart-title">Registered Machines</div>
        <table className="retro-table">
          <thead>
            <tr>
              {['Unit Type','Machine ID','SNR Level',
                'Total Samples','Normal','Anomalous'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map(m => (
              <tr key={m.id}>
                <td style={{textTransform:'uppercase',
                             letterSpacing:'0.08em'}}>{m.machine_type}</td>
                <td style={{color:'var(--amber)',
                             fontFamily:'var(--font-mono)'}}>{m.machine_id}</td>
                <td>
                  <span className="badge badge-amber">{m.noise_level}</span>
                </td>
                <td>{m.total_clips}</td>
                <td style={{color:'var(--amber)'}}>{m.normal_clips}</td>
                <td style={{color:'var(--red)'}}>{m.abnormal_clips}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}