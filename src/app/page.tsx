'use client'

import { useState } from 'react'

type Tone = 'professional' | 'natural' | 'confident' | 'concise'

const TONES: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'natural', label: 'Natural' },
  { value: 'confident', label: 'Confident' },
  { value: 'concise', label: 'Concise' },
]

export default function Home() {
  // --- generate state ---
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [coverLetter, setCoverLetter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // --- refine state ---
  const [isRefineOpen, setIsRefineOpen] = useState(false)
  const [refineInstruction, setRefineInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [refineHistory, setRefineHistory] = useState<string[]>([])

  async function handleGenerate() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please fill in both your resume and the job description.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, tone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setCoverLetter(data.coverLetter)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRefine() {
    if (!refineInstruction.trim()) {
      setRefineError('Please enter an instruction.')
      return
    }
    setIsRefining(true)
    setRefineError('')
    try {
      const res = await fetch('/api/refine-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          currentCoverLetter: coverLetter,
          userInstruction: refineInstruction,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefineError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setCoverLetter(data.coverLetter)
      setRefineHistory((prev) => [...prev, refineInstruction])
      setRefineInstruction('')
      setIsRefineOpen(false)
    } catch {
      setRefineError('Network error. Please check your connection and try again.')
    } finally {
      setIsRefining(false)
    }
  }

  function openRefine() {
    setRefineError('')
    setIsRefineOpen(true)
  }

  function closeRefine() {
    setRefineInstruction('')
    setRefineError('')
    setIsRefineOpen(false)
  }

  return (
    <>
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cover Letter Generator</h1>
            <p className="mt-1 text-sm text-gray-500">
              Paste your resume and a job description to generate a tailored cover letter.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
              Your Resume
            </label>
            <textarea
              id="resume"
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              placeholder="Paste your resume text here…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="job" className="block text-sm font-medium text-gray-700">
              Job Description
            </label>
            <textarea
              id="job"
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              placeholder="Paste the job description here…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
                Tone
              </label>
              <select
                id="tone"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Generating…' : 'Generate Cover Letter'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {coverLetter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="output" className="block text-sm font-medium text-gray-700">
                  Generated Cover Letter
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (you can edit this directly)
                  </span>
                </label>
                <button
                  onClick={openRefine}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  ✦ Refine with AI
                </button>
              </div>
              <textarea
                id="output"
                rows={16}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          )}

        </div>
      </main>

      {/* AI Assistant popup */}
      {isRefineOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeRefine}
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">✦ AI Assistant</h2>
              <button
                onClick={closeRefine}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* History */}
            {refineHistory.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Previous instructions
                </p>
                <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                  {refineHistory.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600"
                    >
                      <span className="mt-px text-gray-300 select-none">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instruction input */}
            <div className="space-y-1 mb-4">
              <label
                htmlFor="refine-instruction"
                className="block text-sm font-medium text-gray-700"
              >
                What would you like to change?
              </label>
              <textarea
                id="refine-instruction"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="e.g. Make it shorter and punchier. Lead with my leadership experience. Change the tone to be more confident…"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
              />
            </div>

            {/* Refine error */}
            {refineError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {refineError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeRefine}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefine}
                disabled={isRefining}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isRefining ? 'Applying…' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
