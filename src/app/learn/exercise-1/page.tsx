'use client'

import { useState } from 'react'

export default function Exercise1() {
  // `text` is the current value, `setText` is the only way we're allowed to change it.
  // Calling setText tells React "re-render this component with the new value."
  const [text, setText] = useState('')

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Exercise 1: Text Input + Live Preview</h1>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something..."
      />

      <p>You typed: {text}</p>
    </main>
  )
}
