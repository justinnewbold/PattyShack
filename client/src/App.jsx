import { useEffect, useState } from 'react'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // This hits your Express server's health endpoint on the same domain
    fetch('/health')
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>🍔 Patty Shack</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Checking API health...</p>
      )}
    </div>
  )
}
