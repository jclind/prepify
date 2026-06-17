import React, { FC, ReactNode } from 'react'
import './ClassifierNote.scss'

// Shared automod "classifier note" — the small, bold, indigo, capitalized line
// that explains an automated moderation decision. Two surfaces render it (the
// Reports queue: "Auto-flagged: …", and the recipe-controls strip: "Auto-held
// for moderation review — …"), so the wording and the layout differ per caller;
// this component owns only the shared visual identity via the `classifier-note`
// base class. Callers compose their own sentence (including the formatClassifier
// detail) as children, and pass a surface class for any layout overrides.
type ClassifierNoteProps = {
  children: ReactNode
  // Surface-specific layout overrides (e.g. margins, flex-basis). Optional.
  className?: string
}

const ClassifierNote: FC<ClassifierNoteProps> = ({ children, className }) => (
  <p className={['classifier-note', className].filter(Boolean).join(' ')}>{children}</p>
)

export default ClassifierNote
