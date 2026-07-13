'use client'

import { useState } from 'react'

export default function Exercise4() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  async function handleProcess() {
    // Validate first, before touching loading/result state at all.
    if (!message.trim()) {
      setError('Please enter a message.')
      return
    }

    // Clear any old error/result so stale messages don't linger
    // on screen while the new request is running.
    setError('')
    setResult('')
    setLoading(true)

    try {
      // Fake async work: a Promise that resolves after 2 seconds,
      // standing in for a real network/API call.
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setResult(`Processed: ${message.trim()}`)
    } catch {
      // Would catch a real API failure if this were a real request.
      setError('Something went wrong while processing.')
    } finally {
      // finally always runs, success or failure, so loading never
      // gets stuck "true" forever.
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Exercise 4: Loading, Error, Fake Async</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message"
        />
        <button onClick={handleProcess} disabled={loading}>
          Process Message
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading && <p>Processing...</p>}

      {!loading && result && <p>{result}</p>}
    </main>
  )
}
