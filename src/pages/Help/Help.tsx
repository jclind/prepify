import React, { FC, ReactElement, useEffect, useState } from 'react'
import { useForm } from '@formspree/react'
import { Helmet } from 'react-helmet-async'
import { TailSpin } from 'react-loader-spinner'
import {
  MdOutlineEmail,
  MdOutlineBugReport,
  MdOutlineLightbulb,
  MdOutlineHelpOutline,
  MdOutlineChatBubbleOutline,
  MdOutlineSubject,
} from 'react-icons/md'
import { useAuth } from 'src/context/AuthContext'
import { contactEmail } from 'src/Components/Footer/footerData'
import FormInput from 'src/Components/Form/FormInput'
import '../../Components/Form/FormStyles.scss'
import './Help.scss'

type Topic = {
  value: string
  label: string
  icon: ReactElement
  /** Placeholder copy tailored to the topic, to nudge a useful first message. */
  placeholder: string
}

// The four entry points. Picking one is all that's needed to open the form, so
// the landing stays light — a logged-out visitor reporting a quick bug never
// faces more than a topic, their email, and a message box.
const TOPICS: Topic[] = [
  {
    value: 'bug',
    label: 'Report a bug',
    icon: <MdOutlineBugReport />,
    placeholder: 'What went wrong, and what were you doing when it happened?',
  },
  {
    value: 'feature',
    label: 'Suggest an idea',
    icon: <MdOutlineLightbulb />,
    placeholder: 'What would you like to see in Prepify?',
  },
  {
    value: 'question',
    label: 'Ask a question',
    icon: <MdOutlineHelpOutline />,
    placeholder: 'What can we help you figure out?',
  },
  {
    value: 'other',
    label: 'Something else',
    icon: <MdOutlineChatBubbleOutline />,
    placeholder: 'How can we help?',
  },
]

const Help: FC = () => {
  const user = useAuth()?.user

  const [topic, setTopic] = useState<string | null>(null)
  const [email, setEmail] = useState(user?.email ?? '')
  const [title, setTitle] = useState('')
  const [showSubject, setShowSubject] = useState(false)
  const [description, setDescription] = useState('')

  const [formState, submitFormspree, resetFormspree] = useForm('xknyboeq')

  // Auth resolves async, so user is null on first render. Pre-fill the email
  // once it loads, but don't clobber anything the visitor has already typed.
  useEffect(() => {
    if (user?.email) {
      setEmail(prev => (prev === '' ? user.email ?? '' : prev))
    }
  }, [user])

  const activeTopic = TOPICS.find(t => t.value === topic) ?? null

  const handleTopicSelect = (value: string) => {
    setTopic(value)
    // Clear a stale "couldn't send" banner from a previous attempt so it doesn't
    // linger under a freshly-chosen topic (the error is Formspree hook state,
    // independent of `topic`).
    if (formState.errors) resetFormspree()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitFormspree(e)
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Help &amp; Support · Prepify</title>
        <meta
          name='description'
          content='Get help with Prepify — report a bug, suggest an idea, or ask a question. A real person reads every message and replies by email.'
        />
        <link rel='canonical' href='https://www.prepifymeals.com/help' />
      </Helmet>
      <div className='help-page form-format'>
        <div className='form-container'>
          <div className='brand-mark'>P</div>

          {formState.succeeded ? (
            <div className='help-success'>
              <h1 className='title'>Message sent — thank you!</h1>
              <p className='prompt'>
                We&rsquo;ll reply to <strong>{email || 'your email'}</strong> as
                soon as we can, usually within a couple of days.
              </p>
              <button
                type='button'
                className='form-action-btn btn'
                onClick={() => window.location.reload()}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h1 className='title'>How can we help?</h1>
              <p className='prompt'>
                Pick a topic and send us a note — a real person reads every
                message.
              </p>

              <div
                className='topic-grid'
                role='group'
                aria-label='What do you need help with?'
              >
                {TOPICS.map(t => (
                  <button
                    key={t.value}
                    type='button'
                    className={`topic-chip${topic === t.value ? ' selected' : ''}`}
                    aria-pressed={topic === t.value}
                    onClick={() => handleTopicSelect(t.value)}
                  >
                    <span className='chip-icon'>{t.icon}</span>
                    <span className='chip-label'>{t.label}</span>
                  </button>
                ))}
              </div>

              {activeTopic && (
                <form className='form help-form' onSubmit={handleSubmit}>
                  {/* Topic drives the form's appearance via the chips above; send
                      its human label so it reads cleanly in the support inbox. */}
                  <input type='hidden' name='category' value={activeTopic.label} />

                  <div aria-live='polite'>
                    {formState.errors ? (
                      <div className='error'>
                        Something went wrong sending your message. Please try
                        again, or email us directly.
                      </div>
                    ) : null}
                  </div>

                  <div className='input-fields'>
                    <FormInput
                      icon={<MdOutlineEmail className='icon' />}
                      type='email'
                      name='email'
                      label='Your email'
                      autoComplete='email'
                      val={email}
                      setVal={setEmail}
                      placeholder='name@example.com'
                    />

                    <label className='form-input message-field'>
                      <span className='label-title'>Message</span>
                      <textarea
                        name='description'
                        className='message-textarea'
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={activeTopic.placeholder}
                        rows={5}
                        required
                      />
                    </label>

                    {showSubject ? (
                      <FormInput
                        icon={<MdOutlineSubject className='icon' />}
                        type='text'
                        name='title'
                        label='Subject'
                        val={title}
                        setVal={setTitle}
                        placeholder='A short summary (optional)'
                        required={false}
                      />
                    ) : (
                      <button
                        type='button'
                        className='add-subject-btn'
                        onClick={() => setShowSubject(true)}
                      >
                        + Add a subject
                      </button>
                    )}
                  </div>

                  <button
                    type='submit'
                    className='form-action-btn btn'
                    disabled={formState.submitting}
                  >
                    {formState.submitting ? (
                      <TailSpin
                        height='28'
                        width='28'
                        color='white'
                        ariaLabel='Sending'
                      />
                    ) : (
                      'Send message'
                    )}
                  </button>
                </form>
              )}

              <p className='email-fallback'>
                Prefer email? Reach us at{' '}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Help
