'use client'

import { useState } from 'react'

// Each job needs a unique id so we can tell items apart later,
// even if two jobs have the exact same company/title text.
type Job = {
  id: number
  company: string
  title: string
}

export default function Exercise3() {
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')

  function handleAdd() {
    // Simple validation: both fields must have real content.
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

  // Remove only the job whose id matches. filter() builds a brand new
  // array containing every job EXCEPT the one we're deleting, and we
  // hand that new array to setJobs to trigger a re-render.
  function deleteJob(id: number) {
    setJobs((prev) => prev.filter((job) => job.id !== id))
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Exercise 3: Job List with Delete</h1>

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
        {/* map() turns each job object into a list item + delete button. */}
        {jobs.map((job) => (
          <li key={job.id} style={{ marginBottom: 4 }}>
            {job.title} at {job.company}{' '}
            <button onClick={() => deleteJob(job.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
