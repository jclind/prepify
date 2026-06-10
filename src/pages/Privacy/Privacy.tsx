import React, { FC } from 'react'
import LegalDocument from 'src/pages/legal/LegalDocument'
import { contactEmail } from 'src/Components/Footer/footerData'

// Privacy Policy. Boilerplate tailored to how Prepify actually handles data
// (Firebase auth, MongoDB, Firebase Storage, Edamam/Spoonacular). Draft — see
// the visible notice rendered by LegalDocument.
const Privacy: FC = () => (
  <LegalDocument title='Privacy Policy' effectiveDate='June 10, 2026'>
    <section>
      <p>
        This Privacy Policy explains what information Prepify (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, how we use it, and the choices you have. By
        using Prepify you agree to the practices described here.
      </p>
    </section>

    <section>
      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> When you sign up we collect your
          email address and, if you use Google sign-in, basic profile details
          provided by Google. Authentication is handled by Firebase
          Authentication.
        </li>
        <li>
          <strong>Profile information.</strong> Optional details you add, such as
          a username, bio, and location.
        </li>
        <li>
          <strong>Content you create.</strong> Recipes, ratings, reviews, and any
          images you upload.
        </li>
        <li>
          <strong>Usage and device data.</strong> Basic analytics about how the
          app is used, collected via Google/Firebase Analytics.
        </li>
      </ul>
    </section>

    <section>
      <h2>How we use your information</h2>
      <ul>
        <li>To create and maintain your account and authenticate you.</li>
        <li>To store and display the recipes, reviews, and images you submit.</li>
        <li>
          To calculate nutrition and price estimates for recipes using
          third-party services.
        </li>
        <li>To operate, secure, and improve the service.</li>
      </ul>
    </section>

    <section>
      <h2>Where your data is stored</h2>
      <p>
        Account and authentication data is managed by Firebase Authentication.
        User profiles, recipes, and reviews/ratings are stored in MongoDB. Images
        you upload are stored in Firebase Storage. These services are operated by
        Google Cloud and their respective providers.
      </p>
    </section>

    <section>
      <h2>Third-party services</h2>
      <p>We rely on the following third-party processors:</p>
      <ul>
        <li>
          <strong>Firebase / Google Cloud</strong> — authentication, image
          storage, hosting, and analytics.
        </li>
        <li>
          <strong>Google</strong> — Google sign-in for authentication.
        </li>
        <li>
          <strong>Edamam</strong> and <strong>Spoonacular</strong> — nutrition
          data and ingredient parsing. Recipe ingredient text may be sent to
          these services to generate estimates.
        </li>
      </ul>
      <p>
        Each of these providers processes data under its own privacy policy.
      </p>
    </section>

    <section>
      <h2>Cookies and local storage</h2>
      <p>
        Prepify uses cookies and browser local storage to keep you signed in and
        to remember preferences. Analytics may also set cookies to measure usage.
        You can clear or block cookies in your browser, though some features may
        stop working.
      </p>
    </section>

    <section>
      <h2>Data retention</h2>
      <p>
        We retain your account and content for as long as your account is active.
        If you delete your account, we delete or anonymize your personal data,
        except where we are required to retain it for legal or operational
        reasons.
      </p>
    </section>

    <section>
      <h2>Your rights</h2>
      <p>
        You may access, update, or delete your account information at any time
        from your account settings, or by contacting us. Depending on where you
        live, you may have additional rights over your personal data, including
        the right to request a copy or deletion.
      </p>
    </section>

    <section>
      <h2>Children&rsquo;s privacy</h2>
      <p>
        Prepify is not directed at children under 13, and we do not knowingly
        collect personal information from them.
      </p>
    </section>

    <section>
      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will
        revise the &ldquo;Last updated&rdquo; date above. Continued use of
        Prepify after changes take effect constitutes acceptance of the updated
        policy.
      </p>
    </section>

    <section>
      <h2>Contact us</h2>
      <p>
        Questions about this policy? Email us at{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </section>
  </LegalDocument>
)

export default Privacy
