import { ContactForm } from "./ContactForm";
import { AsteroidBullet } from "./AsteroidBullet";

/**
 * "Get in touch" block. Messages land in the contact_messages table and show
 * on /admin. Set NEXT_PUBLIC_CONTACT_EMAIL to also show a public email address.
 */
export function ContactSection({
  id = "contact",
  eyebrow = "Contact",
  heading = "Get in touch",
  intro = "Questions about Crew Orchard, pricing, or your seat? Send a message and the founding team will reply by email.",
  defaultName,
  defaultEmail,
  className = "section",
}: {
  id?: string;
  eyebrow?: string;
  heading?: string;
  intro?: string;
  defaultName?: string;
  defaultEmail?: string;
  className?: string;
}) {
  const publicEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return (
    <section id={id} className={className} style={{ scrollMarginTop: 90 }}>
      <div className="container split">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
          <p className="lede">{intro}</p>
          <ul className="bullets">
            <li><AsteroidBullet /> <span>We usually reply within one business day.</span></li>
            <li><AsteroidBullet /> <span>Billing questions? Include the email you signed up with.</span></li>
            {publicEmail && (
              <li>
                <AsteroidBullet />{" "}
                <span>
                  Prefer email? <a href={`mailto:${publicEmail}`} style={{ color: "var(--mint)" }}>{publicEmail}</a>
                </span>
              </li>
            )}
          </ul>
        </div>
        <ContactForm defaultName={defaultName} defaultEmail={defaultEmail} />
      </div>
    </section>
  );
}
