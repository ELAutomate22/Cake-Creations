"use client";

import { business, contact, resolved } from "@/content/site";
import { Modal } from "@/components/ui/Modal";

/**
 * Contact details.
 *
 * This is deliberately an information panel, not a form. Nothing is collected
 * from the visitor here — no cake requirements, no dates, no addresses. The
 * visitor reads the details and gets in touch through their own phone, email
 * or social account.
 *
 * Any detail still left as a [PLACEHOLDER] in the content file is hidden
 * entirely rather than rendered as a dead link.
 */
export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const person = resolved(contact.person);
  const phoneDisplay = resolved(contact.phone.display);
  const phoneDial = resolved(contact.phone.dial);
  const email = resolved(contact.email);
  const whatsappDisplay = resolved(contact.whatsapp.display);
  const whatsappDial = resolved(contact.whatsapp.dial);
  const location = resolved(business.location);
  const serviceArea = resolved(business.serviceArea);
  const collection = resolved(contact.collection);
  const delivery = resolved(contact.delivery);
  const responseHours = resolved(contact.responseHours);

  const socials = [
    { label: "Instagram", url: resolved(contact.social.instagram) },
    { label: "Facebook", url: resolved(contact.social.facebook) },
    { label: "TikTok", url: resolved(contact.social.tiktok) },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  const hasAnyContactMethod = Boolean(
    phoneDial || email || whatsappDial || socials.length,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Contact ${business.name}`}
      description="Telephone, email and social media details for the business."
    >
      <div className="relative">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="border-b border-caramel/35 bg-vanilla px-7 pb-7 pt-8 text-center sm:px-9">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-cocoa transition-colors hover:text-espresso"
          >
            <span className="sr-only">Close contact details</span>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 2 L16 16 M16 2 L2 16"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <p className="eyebrow">Get in touch</p>
          <p className="mt-3 font-serif text-3xl text-espresso">
            {business.name}
          </p>
          {person && (
            <p className="mt-2 text-sm text-cocoa-soft">{person}</p>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="px-7 py-7 sm:px-9">
          {hasAnyContactMethod ? (
            <div className="space-y-2.5">
              {phoneDial && (
                <ContactAction
                  href={`tel:${phoneDial.replace(/\s+/g, "")}`}
                  label="Call"
                  value={phoneDisplay ?? phoneDial}
                  icon={
                    <path
                      d="M4 3h3l1.5 4L6.8 8.4a10 10 0 0 0 4.8 4.8L13 11.5 17 13v3a1 1 0 0 1-1.1 1A14 14 0 0 1 3 4.1 1 1 0 0 1 4 3Z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  }
                />
              )}

              {whatsappDial && (
                <ContactAction
                  href={`https://wa.me/${whatsappDial.replace(/[^\d]/g, "")}`}
                  external
                  label="WhatsApp"
                  value={whatsappDisplay ?? whatsappDial}
                  icon={
                    <path
                      d="M10 3a7 7 0 0 0-6 10.6L3 17l3.5-1a7 7 0 1 0 3.5-13Zm0 1.4a5.6 5.6 0 1 1-2.9 10.4l-.3-.2-2 .6.6-2-.2-.3A5.6 5.6 0 0 1 10 4.4Z"
                      fill="currentColor"
                    />
                  }
                />
              )}

              {email && (
                <ContactAction
                  href={`mailto:${email}`}
                  label="Send email"
                  value={email}
                  icon={
                    <>
                      <rect
                        x="2.5"
                        y="4.5"
                        width="15"
                        height="11"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        fill="none"
                      />
                      <path
                        d="m3 6 7 5 7-5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        fill="none"
                      />
                    </>
                  }
                />
              )}

              {socials.map((social) => (
                <ContactAction
                  key={social.label}
                  href={social.url}
                  external
                  label={`View ${social.label}`}
                  value={social.label}
                  icon={
                    <path
                      d="M7 11 13 5m0 0h-4m4 0v4M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-cocoa-soft">
              Contact details will be published here shortly.
            </p>
          )}

          {/* ── Practical information ───────────────────────────────────── */}
          {(location || serviceArea || collection || delivery || responseHours) && (
            <>
              <hr className="icing-rule my-7" />

              <dl className="space-y-4 text-sm">
                {location && <Detail term="Based in" detail={location} />}
                {serviceArea && <Detail term="Service area" detail={serviceArea} />}
                {collection && <Detail term="Collection" detail={collection} />}
                {delivery && <Detail term="Delivery" detail={delivery} />}
                {responseHours && (
                  <Detail term="Response hours" detail={responseHours} />
                )}
              </dl>
            </>
          )}

          <p className="mt-7 text-center text-xs leading-relaxed text-cocoa-soft">
            Cakes are discussed directly with {person ?? "the business"} using
            the details above.
          </p>
        </div>

        <div className="piping-edge" aria-hidden="true" />
      </div>
    </Modal>
  );
}

/** One tappable contact method. */
function ContactAction({
  href,
  label,
  value,
  icon,
  external = false,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="group flex items-center gap-4 border border-caramel/40 bg-ivory px-4 py-3.5 transition-colors hover:border-plum/50 hover:bg-vanilla"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vanilla text-plum transition-colors group-hover:bg-plum group-hover:text-ivory">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          {icon}
        </svg>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
          {label}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
        </span>
        <span className="block truncate text-[0.9375rem] text-espresso">
          {value}
        </span>
      </span>
    </a>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <dt className="text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
        {term}
      </dt>
      <dd className="text-espresso">{detail}</dd>
    </div>
  );
}
