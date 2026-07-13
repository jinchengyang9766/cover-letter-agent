'use client'

import { useState } from 'react'

type Job = {
  id: number
  company: string
  title: string
}

export default function Exercise2() {
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')

  function handleAdd() {
    if (!company.trim() || !title.trim()) {
      setError('Please fill in both company and job title.')
      return
    }

    setError('')
    setJobs((prev) => [
      ...prev,
      { id: Date.now(), company: company.trim(), title: title.trim() },
    ])

    setCompany('')
    setTitle('')
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Exercise 2: Tiny Job List</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            {job.title} at {job.company}
          </li>
        ))}
      </ul>
    </main>
  )
}
