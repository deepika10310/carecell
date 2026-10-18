import Link from "next/link";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  return (
    <main className={styles.site} id="home">
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <a className={styles.brand} href="#home" aria-label="Carecell home">
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M20 5.5 32.5 10v9.2c0 8.1-5.3 13.1-12.5 16.1-7.2-3-12.5-8-12.5-16.1V10L20 5.5Z" stroke="currentColor" strokeWidth="2.2" />
                <path d="M20 13v14M13 20h14" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
              </svg>
            </span>
            <span>carecell</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#care">Our approach</a>
            <a href="#services">Services</a>
            <a href="#about">About us</a>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.loginLink} href="/login">Log in</Link>
            <a className={styles.navCta} href="#contact">Talk to our team <span aria-hidden="true">↗</span></a>
          </div>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title" id="care">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span className={styles.eyebrowIcon} aria-hidden="true">✳</span> CARE THAT CONNECTS</div>
          <h1 className={styles.heroTitle} id="hero-title">Your health,<br />in <span>good hands.</span></h1>
          <p className={styles.heroText}>
            Healthcare should feel personal, clear, and connected. Carecell brings your care team and your health journey together, so you can focus on feeling your best.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#contact">Find your care <span aria-hidden="true">→</span></a>
            <a className={styles.secondaryLink} href="#services">Explore our services</a>
          </div>
          <div className={styles.trustNote}><span className={styles.trustIcon} aria-hidden="true">✓</span> Compassionate care, built around you</div>
        </div>

        <div className={styles.visual} aria-label="A connected care team supporting your health" role="img">
          <div className={styles.visualGlow} />
          <div className={styles.careCard}>
            <div className={styles.cardHeader}>
              <div><span className={styles.cardOverline}>YOUR CARE JOURNEY</span><strong>Here for every step</strong></div>
              <span className={styles.cardSpark} aria-hidden="true">✳</span>
            </div>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <span className={`${styles.timelineIcon} ${styles.iconMint}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></span>
                <span className={styles.timelineCopy}><strong>Care, coordinated</strong><small>Your team is in sync</small></span>
                <span className={styles.checkmark} aria-label="Complete">✓</span>
              </div>
              <div className={styles.timelineItem}>
                <span className={`${styles.timelineIcon} ${styles.iconBlue}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7" /></svg></span>
                <span className={styles.timelineCopy}><strong>Progress, together</strong><small>Small steps add up</small></span>
                <span className={styles.progressPill}>ON TRACK</span>
              </div>
              <div className={styles.timelineItem}>
                <span className={`${styles.timelineIcon} ${styles.iconPeach}`} aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4m8-4v4M4 10h16m-11 4h2" /></svg></span>
                <span className={styles.timelineCopy}><strong>Support, when you need it</strong><small>A real person is here to help</small></span>
                <span className={styles.messageDot} aria-hidden="true" />
              </div>
            </div>
            <div className={styles.teamNote}>
              <div className={styles.avatarStack} aria-hidden="true"><span>J</span><span>M</span><span>A</span></div>
              <span><strong>Your care team</strong><small>People who know your story</small></span>
              <span className={styles.teamArrow} aria-hidden="true">↗</span>
            </div>
          </div>
          <div className={styles.floatNote}><span className={styles.floatHeart} aria-hidden="true">♡</span><span><strong>Made for you</strong><small>Care with a human touch</small></span></div>
          <span className={styles.decorDot} aria-hidden="true" />
        </div>
      </section>

      <section className={styles.services} id="services" aria-labelledby="services-title">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>A BETTER WAY TO CARE</span>
          <h2 id="services-title">Care centered on <span>you.</span></h2>
          <p>From your first conversation to the next step in your health, we make it easier to get the support you deserve.</p>
        </div>
        <div className={styles.serviceGrid}>
          <article className={styles.serviceCard}>
            <span className={`${styles.serviceIcon} ${styles.serviceIconMint}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z" /><path d="M8 12h2l1.3-2.5L13 15l1.2-3H17" /></svg></span>
            <h3>Personalized support</h3>
            <p>Thoughtful guidance that starts with listening and adapts to what matters to you.</p>
            <a href="#contact" aria-label="Learn more about personalized support">Learn more <span aria-hidden="true">→</span></a>
          </article>
          <article className={styles.serviceCard}>
            <span className={`${styles.serviceIcon} ${styles.serviceIconBlue}`} aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0m.5-3a4.5 4.5 0 0 1 5.5 3" /></svg></span>
            <h3>A connected care team</h3>
            <p>People working together around you, helping make every part of care feel more joined up.</p>
            <a href="#contact" aria-label="Learn more about our connected care team">Meet your team <span aria-hidden="true">→</span></a>
          </article>
          <article className={styles.serviceCard}>
            <span className={`${styles.serviceIcon} ${styles.serviceIconPeach}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5.2-3.4 8.4-8 10-4.6-1.6-8-4.8-8-10V6l8-3Z" /><path d="M9 12.5 11 14l4-4" /></svg></span>
            <h3>Confidence at every step</h3>
            <p>Clear next steps and reliable support, so you can move forward with confidence.</p>
            <a href="#contact" aria-label="Learn more about confidence at every step">How it works <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>

      <section className={styles.about} id="about" aria-label="About Carecell">
        <span className={styles.aboutMark} aria-hidden="true">✳</span>
        <p>Good healthcare is more than a service. It’s a relationship built on <strong>trust, understanding, and showing up.</strong></p>
        <span className={styles.aboutCaption}>THAT’S THE CARECELL DIFFERENCE</span>
      </section>

      <section className={styles.contact} id="contact" aria-labelledby="contact-title">
        <div><span className={styles.sectionEyebrow}>LET’S TALK ABOUT YOUR CARE</span><h2 id="contact-title">A little more supported.<br /><span>A lot more you.</span></h2></div>
        <a className={styles.contactButton} href="mailto:hello@carecell.com">Connect with Carecell <span aria-hidden="true">↗</span></a>
      </section>

      <footer className={styles.footer}>
        <a className={styles.footerBrand} href="#home"><span className={styles.footerMark} aria-hidden="true">✳</span> carecell</a>
        <span>CARE THAT CONNECTS. PEOPLE AT THE CENTER.</span>
        <a href="#home">Back to top ↑</a>
      </footer>
    </main>
  );
}