'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Tone = 'professional' | 'natural' | 'confident' | 'concise'

const TONES: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'natural', label: 'Natural' },
  { value: 'confident', label: 'Confident' },
  { value: 'concise', label: 'Concise' },
]

type HighlightLevel = 'keep' | 'improve' | 'rewrite'

type Highlight = {
  id: string
  text: string
  level: HighlightLevel
}

const LEVEL_META: Record<HighlightLevel, { label: string; mark: string; text: string; button: string }> = {
  keep: {
    label: 'Keep',
    mark: 'bg-green-100 text-green-900',
    text: 'text-green-700',
    button: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
  },
  improve: {
    label: 'Improve',
    mark: 'bg-amber-100 text-amber-900',
    text: 'text-amber-700',
    button: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  rewrite: {
    label: 'Rewrite',
    mark: 'bg-rose-100 text-rose-900',
    text: 'text-rose-700',
    button: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
}

type VersionSource = 'generated' | 'refined' | 'manual'

type CoverLetterVersion = {
  id: string
  label: string
  coverLetter: string
  createdAt: string
  source: VersionSource
  note?: string
}

const SOURCE_META: Record<VersionSource, { label: string; badge: string }> = {
  generated: { label: 'Generated', badge: 'bg-indigo-100 text-indigo-700' },
  refined: { label: 'Refined', badge: 'bg-blue-100 text-blue-700' },
  manual: { label: 'Manual', badge: 'bg-gray-100 text-gray-600' },
}

type TextSegment = { text: string; level?: HighlightLevel }

function buildHighlightSegments(text: string, highlights: Highlight[]): TextSegment[] {
  const ranges: { start: number; end: number; level: HighlightLevel }[] = []

  for (const highlight of highlights) {
    if (!highlight.text) continue
    const start = text.indexOf(highlight.text)
    if (start === -1) continue
    ranges.push({ start, end: start + highlight.text.length, level: highlight.level })
  }

  ranges.sort((a, b) => a.start - b.start)

  const nonOverlapping: typeof ranges = []
  let lastEnd = 0
  for (const range of ranges) {
    if (range.start < lastEnd) continue
    nonOverlapping.push(range)
    lastEnd = range.end
  }

  const segments: TextSegment[] = []
  let cursor = 0
  for (const range of nonOverlapping) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start) })
    segments.push({ text: text.slice(range.start, range.end), level: range.level })
    cursor = range.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })

  return segments
}

export default function Home() {
  // --- generate state ---
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [coverLetter, setCoverLetter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // --- resume upload state ---
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- refine state ---
  const [isRefineOpen, setIsRefineOpen] = useState(false)
  const [refineInstruction, setRefineInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [refineHistory, setRefineHistory] = useState<string[]>([])

  // --- highlight & general feedback state ---
  const [viewMode, setViewMode] = useState<'edit' | 'highlight'>('edit')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  // --- version history state ---
  const [versions, setVersions] = useState<CoverLetterVersion[]>([])
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({})
  const [versionNotice, setVersionNotice] = useState('')

  useEffect(() => {
    if (!versionNotice) return
    const timer = setTimeout(() => setVersionNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [versionNotice])

  const highlightSegments = useMemo(
    () => buildHighlightSegments(coverLetter, highlights),
    [coverLetter, highlights],
  )

  function addVersion(text: string, source: VersionSource) {
    setVersions((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: `Version ${prev.length + 1}`,
        coverLetter: text,
        createdAt: new Date().toISOString(),
        source,
      },
    ])
  }

  function handleSaveVersion() {
    if (!coverLetter.trim()) return
    addVersion(coverLetter, 'manual')
    setVersionNotice('Saved your edits as a new version.')
  }

  function handleRestoreVersion(version: CoverLetterVersion) {
    setCoverLetter(version.coverLetter)
    setHighlights([])
    setViewMode('edit')
    setVersionNotice(`Restored ${version.label}.`)
  }

  function toggleVersionExpanded(id: string) {
    setExpandedVersions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleGenerate() {
    const hasResume = Boolean(resumeFile) || Boolean(resumeText.trim())
    if (!hasResume || !jobDescription.trim()) {
      setError('Please provide your resume (paste text or upload a file) and the job description.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      let res: Response
      if (resumeFile) {
        const formData = new FormData()
        formData.append('resumeFile', resumeFile)
        formData.append('resumeText', resumeText)
        formData.append('jobDescription', jobDescription)
        formData.append('tone', tone)
        res = await fetch('/api/generate-cover-letter', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/generate-cover-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jobDescription, tone }),
        })
      }
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setCoverLetter(data.coverLetter)
      addVersion(data.coverLetter, 'generated')
      setHighlights([])
      setRevisionFeedback('')
      setViewMode('edit')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function clearResumeFile() {
    setResumeFile(null)
    setUploadedFileName('')
    setUploadError('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // allow re-uploading the same file name after an error
    e.target.value = ''
    if (!file) return

    setUploadError('')
    setUploadedFileName('')
    setIsParsingFile(true)

    try {
      const name = file.name.toLowerCase()

      if (name.endsWith('.txt')) {
        const extractedText = await file.text()
        if (!extractedText.trim()) {
          setUploadError('The uploaded file appears to be empty.')
          return
        }
        setResumeFile(null)
        setResumeText(extractedText.trim())
        setUploadedFileName(file.name)
      } else if (name.endsWith('.docx')) {
        const mammoth = (await import('mammoth')).default
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        const extractedText = result.value
        if (!extractedText.trim()) {
          setUploadError('The uploaded file appears to be empty.')
          return
        }
        setResumeFile(null)
        setResumeText(extractedText.trim())
        setUploadedFileName(file.name)
      } else if (name.endsWith('.pdf')) {
        if (file.size === 0) {
          setUploadError('The uploaded file appears to be empty.')
          return
        }
        // PDFs are not parsed in the browser — the file itself is sent to
        // the backend so Claude can read it directly.
        setResumeFile(file)
        setUploadedFileName(file.name)
      } else if (name.endsWith('.doc')) {
        setUploadError('.doc files are not supported yet. Please convert this file to .docx or PDF and upload again.')
      } else {
        setUploadError('Unsupported file type. Please upload a .txt, .docx, or .pdf file.')
      }
    } catch {
      setUploadError('Could not read that file. Please make sure it is a valid .txt, .docx, or .pdf file.')
    } finally {
      setIsParsingFile(false)
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
          ...(highlights.length > 0
            ? { highlightFeedback: highlights.map(({ text, level }) => ({ text, level })) }
            : {}),
          ...(revisionFeedback.trim() ? { revisionFeedback: revisionFeedback.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefineError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setCoverLetter(data.coverLetter)
      addVersion(data.coverLetter, 'refined')
      setHighlights([])
      setRevisionFeedback('')
      setViewMode('edit')
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

  function handleMark(level: HighlightLevel) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    if (!previewRef.current || !selection.anchorNode || !previewRef.current.contains(selection.anchorNode)) {
      return
    }
    const text = selection.toString().trim()
    if (!text) return
    setHighlights((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, level },
    ])
    selection.removeAllRanges()
  }

  function removeHighlight(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
  }

  const hasCoverLetter = Boolean(coverLetter)

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
        {/* decorative background glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-52 -right-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-blue-200/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl"
        />

        <div
          className={`relative mx-auto px-4 py-14 sm:py-16 ${hasCoverLetter ? 'max-w-6xl' : 'max-w-2xl'}`}
        >

          <div className="mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 ring-1 ring-inset ring-indigo-100">
              ✦ AI-Powered Writing
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
              Cover Letter Generator
            </h1>
            <p className="mt-3 max-w-xl text-base text-gray-500">
              Turn your resume and a job description into a tailored, editable cover letter in seconds.
            </p>
          </div>

          <div className={hasCoverLetter ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-start' : ''}>

            {/* Left column: inputs */}
            <div className="space-y-6 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm shadow-gray-200/60 backdrop-blur-sm sm:p-7">

              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm text-indigo-600">
                  📄
                </span>
                <h2 className="text-sm font-semibold text-gray-900">Your Details</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                  Your Resume
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsingFile}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isParsingFile ? 'Reading file…' : 'Upload .txt, .docx, or .pdf'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedFileName && !uploadError && !resumeFile && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      Loaded: <span className="font-medium text-gray-700">{uploadedFileName}</span>
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {uploadError}
                  </div>
                )}

                {resumeFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">📎 {resumeFile.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">This PDF will be sent directly to the AI.</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearResumeFile}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Remove uploaded file"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <textarea
                    id="resume"
                    rows={8}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="Paste your resume text here, or upload a .txt / .docx / .pdf file above…"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="job" className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                <textarea
                  id="job"
                  rows={8}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Paste the job description here…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-end">
                <div className="space-y-2">
                  <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
                    Tone
                  </label>
                  <select
                    id="tone"
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? 'Generating…' : '✦ Generate Cover Letter'}
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

            </div>

            {/* Right column: generated cover letter */}
            {hasCoverLetter && (
              <div className="space-y-4 rounded-2xl border border-indigo-100 bg-white/90 p-6 shadow-md shadow-indigo-100/50 backdrop-blur-sm lg:sticky lg:top-10 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-xs text-white">
                      ✦
                    </span>
                    <div>
                      <label htmlFor="output" className="block text-sm font-semibold text-gray-900">
                        Generated Cover Letter
                      </label>
                      <p className="text-xs text-gray-400">Edit freely, or ask the AI to revise it</p>
                    </div>
                  </div>
                  <button
                    onClick={openRefine}
                    className="whitespace-nowrap rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:from-indigo-100 hover:to-blue-100"
                  >
                    ✦ Refine with AI
                  </button>
                </div>

                {/* Edit / Highlight mode toggle + annotation toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className={`rounded-md px-3 py-1 transition-colors ${
                        viewMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('highlight')}
                      className={`rounded-md px-3 py-1 transition-colors ${
                        viewMode === 'highlight'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Highlight
                    </button>
                  </div>

                  {viewMode === 'highlight' && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['keep', 'improve', 'rewrite'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleMark(level)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${LEVEL_META[level].button}`}
                        >
                          {LEVEL_META[level].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {viewMode === 'highlight' ? (
                  <>
                    <p className="text-[11px] text-gray-400">
                      Select a phrase below, then click Keep, Improve, or Rewrite.
                    </p>
                    <div
                      ref={previewRef}
                      className="max-h-[34rem] min-h-[22rem] w-full select-text overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-inner"
                    >
                      {highlightSegments.map((segment, i) =>
                        segment.level ? (
                          <mark key={i} className={`rounded-sm px-0.5 ${LEVEL_META[segment.level].mark}`}>
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={i}>{segment.text}</span>
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <textarea
                    id="output"
                    rows={20}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-inner transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSaveVersion}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700"
                  >
                    💾 Save Version
                  </button>
                  {versionNotice && (
                    <span className="text-xs font-medium text-indigo-600">✓ {versionNotice}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="revision-feedback" className="block text-sm font-medium text-gray-700">
                    Additional feedback for AI revision
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="revision-feedback"
                    rows={3}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="Example: Make the tone warmer, add more about my Python project, and reduce repetition."
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-400">
                    This note and any highlights below will be sent along with your next AI revision.
                  </p>
                </div>

                {highlights.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your Feedback</p>
                    {(['keep', 'improve', 'rewrite'] as const).map((level) => {
                      const items = highlights.filter((h) => h.level === level)
                      if (items.length === 0) return null
                      return (
                        <div key={level} className="space-y-1.5">
                          <p className={`text-xs font-semibold ${LEVEL_META[level].text}`}>
                            {LEVEL_META[level].label}
                          </p>
                          <ul className="space-y-1.5">
                            {items.map((h) => (
                              <li
                                key={h.id}
                                className="flex items-start justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 shadow-sm"
                              >
                                <span className="line-clamp-2">&ldquo;{h.text}&rdquo;</span>
                                <button
                                  type="button"
                                  onClick={() => removeHighlight(h.id)}
                                  className="shrink-0 text-gray-400 hover:text-gray-600"
                                  aria-label="Remove highlight"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )}

                {versions.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Version History</p>
                      <span className="text-[11px] text-gray-400">
                        {versions.length} saved
                      </span>
                    </div>
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {[...versions].reverse().map((version) => {
                        const isExpanded = Boolean(expandedVersions[version.id])
                        const isCurrent = version.coverLetter === coverLetter
                        return (
                          <li
                            key={version.id}
                            className={`rounded-lg border bg-white p-3 shadow-sm ${
                              isCurrent ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-800">{version.label}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_META[version.source].badge}`}
                                >
                                  {SOURCE_META[version.source].label}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] font-medium text-indigo-500">Current</span>
                                )}
                              </div>
                              <span className="whitespace-nowrap text-[11px] text-gray-400">
                                {new Date(version.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p
                              className={`mt-1.5 text-xs text-gray-500 ${
                                isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                              }`}
                            >
                              {version.coverLetter}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleVersionExpanded(version.id)}
                                className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestoreVersion(version)}
                                disabled={isCurrent}
                                className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Restore
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* AI Assistant popup */}
      {isRefineOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
          onClick={closeRefine}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-sm text-white">
                  ✦
                </span>
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              </div>
              <button
                onClick={closeRefine}
                className="text-xl leading-none text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* History */}
            {refineHistory.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Previous instructions
                </p>
                <ul className="max-h-32 space-y-1.5 overflow-y-auto">
                  {refineHistory.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"
                    >
                      <span className="mt-px select-none text-gray-300">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instruction input */}
            <div className="mb-4 space-y-1">
              <label
                htmlFor="refine-instruction"
                className="block text-sm font-medium text-gray-700"
              >
                What would you like to change?
              </label>
              <textarea
                id="refine-instruction"
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="e.g. Make it shorter and punchier. Lead with my leadership experience. Change the tone to be more confident…"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
              />
            </div>

            {(highlights.length > 0 || revisionFeedback.trim()) && (
              <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-2.5 text-xs text-indigo-700">
                Also including{' '}
                {highlights.length > 0 && (
                  <span className="font-semibold">
                    {highlights.length} highlight{highlights.length > 1 ? 's' : ''}
                  </span>
                )}
                {highlights.length > 0 && revisionFeedback.trim() && ' and '}
                {revisionFeedback.trim() && <span className="font-semibold">your additional feedback</span>} from
                the cover letter panel.
              </div>
            )}

            {/* Refine error */}
            {refineError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {refineError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeRefine}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefine}
                disabled={isRefining}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
