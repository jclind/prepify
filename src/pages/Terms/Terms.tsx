import React, { FC } from 'react'
import LegalDocument from 'src/pages/legal/LegalDocument'

const SUPPORT_EMAIL = 'JesseLindCS@gmail.com'

// Terms of Service. Boilerplate tailored to Prepify (user-generated recipes and
// reviews, estimate-only nutrition/price data). Draft — see the visible notice
// rendered by LegalDocument.
const Terms: FC = () => (
  <LegalDocument title='Terms of Service' effectiveDate='June 10, 2026'>
    <section>
      <h2>Acceptance of terms</h2>
      <p>
        By accessing or using Prepify (&ldquo;the Service&rdquo;) you agree to be
        bound by these Terms of Service. If you do not agree, do not use the
        Service.
      </p>
    </section>

    <section>
      <h2>Your account</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials and for all activity that occurs under your account. You must
        provide accurate information and notify us of any unauthorized use. You
        must be at least 13 years old to create an account.
      </p>
    </section>

    <section>
      <h2>User-generated content</h2>
      <p>
        You retain ownership of the recipes, reviews, ratings, and images you
        submit (&ldquo;Your Content&rdquo;). By submitting Your Content, you grant
        Prepify a worldwide, non-exclusive, royalty-free license to host, store,
        display, reproduce, and distribute it for the purpose of operating and
        promoting the Service. You represent that you have the rights necessary to
        grant this license and that Your Content does not infringe the rights of
        others.
      </p>
    </section>

    <section>
      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Post unlawful, infringing, harmful, or misleading content.</li>
        <li>Harass other users or submit spam or fraudulent reviews.</li>
        <li>
          Attempt to access accounts or data that are not yours, or disrupt the
          Service.
        </li>
        <li>
          Scrape, copy, or harvest content or data except as expressly permitted.
        </li>
      </ul>
      <p>
        We may remove content or suspend accounts that violate these terms.
      </p>
    </section>

    <section>
      <h2>Nutrition and price estimates</h2>
      <p>
        Nutrition and per-serving price figures shown on Prepify are{' '}
        <strong>estimates</strong> generated from third-party data and ingredient
        parsing. They may be inaccurate or incomplete and are{' '}
        <strong>not medical, dietary, or financial advice</strong>. Do not rely on
        them for medical decisions, allergy safety, or budgeting. Always verify
        ingredients and consult a qualified professional where appropriate.
      </p>
    </section>

    <section>
      <h2>Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; without warranties of any kind, whether express or
        implied, including fitness for a particular purpose and non-infringement.
        We do not warrant that the Service will be uninterrupted, secure, or
        error-free, or that any content is accurate.
      </p>
    </section>

    <section>
      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Prepify and its operators will not
        be liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of data, profits, or goodwill, arising from
        your use of the Service.
      </p>
    </section>

    <section>
      <h2>Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may
        suspend or terminate your access if you violate these terms or if we
        discontinue the Service. Provisions that by their nature should survive
        termination will continue to apply.
      </p>
    </section>

    <section>
      <h2>Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will revise
        the &ldquo;Last updated&rdquo; date above. Continued use of the Service
        after changes take effect constitutes acceptance of the updated terms.
      </p>
    </section>

    <section>
      <h2>Contact us</h2>
      <p>
        Questions about these terms? Email us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </section>
  </LegalDocument>
)

export default Terms
