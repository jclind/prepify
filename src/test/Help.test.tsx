import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Help from 'src/pages/Help/Help'

// Drive Formspree's hook state per-test (submit succeeded / pending) without
// hitting the network, and capture the submit handler the form calls.
const formspree = vi.hoisted(() => ({
  state: { succeeded: false, submitting: false, errors: null as unknown },
  submit: vi.fn(),
}))
vi.mock('@formspree/react', () => ({
  useForm: () => [formspree.state, formspree.submit],
}))

// Logged-out visitor by default — the whole point of the page being public —
// but mutable so a test can sign in and check the email pre-fill.
const authState = vi.hoisted(() => ({
  user: null as null | { email?: string | null },
}))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}))

const renderHelp = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Help />
      </MemoryRouter>
    </HelmetProvider>
  )

beforeEach(() => {
  formspree.state = { succeeded: false, submitting: false, errors: null }
  formspree.submit.mockReset()
  authState.user = null
})

describe('Help', () => {
  it('opens on a light topic chooser with the form hidden', () => {
    renderHelp()
    expect(
      screen.getByRole('heading', { name: /how can we help/i })
    ).toBeInTheDocument()
    // All four entry points present...
    expect(screen.getByRole('button', { name: /report a bug/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suggest an idea/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask a question/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /something else/i })).toBeInTheDocument()
    // ...but no form fields until a topic is chosen.
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /send message/i })
    ).not.toBeInTheDocument()
  })

  it('always offers the email fallback, even before picking a topic', () => {
    renderHelp()
    expect(
      screen.getByRole('link', { name: /jesselindcs@gmail\.com/i })
    ).toHaveAttribute('href', 'mailto:JesseLindCS@gmail.com')
  })

  it('reveals the compact form once a topic is selected', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    expect(screen.getByLabelText('Your email')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send message/i })
    ).toBeInTheDocument()
    // The chosen chip is marked pressed for assistive tech.
    expect(
      screen.getByRole('button', { name: /report a bug/i })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the subject field behind an optional disclosure', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /ask a question/i }))
    expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add a subject/i }))
    expect(screen.getByLabelText('Subject')).toBeInTheDocument()
  })

  it('submits the message through the Formspree handler', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /suggest an idea/i }))
    fireEvent.change(screen.getByLabelText('Your email'), {
      target: { value: 'visitor@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'It would be great if…' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(formspree.submit).toHaveBeenCalled()
  })

  it('pre-fills the email for a signed-in user, but stays empty when logged out', () => {
    // Logged out (default): the revealed email field is blank.
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    expect(screen.getByLabelText('Your email')).toHaveValue('')
  })

  it('pre-fills the email from the signed-in user', () => {
    authState.user = { email: 'chef@example.com' }
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    expect(screen.getByLabelText('Your email')).toHaveValue('chef@example.com')
  })

  it('shows a confirmation once the message is sent', () => {
    formspree.state = { succeeded: true, submitting: false, errors: null }
    renderHelp()
    expect(
      screen.getByRole('heading', { name: /message sent/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send another message/i })
    ).toBeInTheDocument()
  })
})
