"use client";

import { Modal } from "@/components/ui/Modal";
import {
  business,
  contact,
  isProvided,
  resolved,
  telHref,
  whatsappHref,
} from "@/content/site";

/**
 * Contact.
 *
 * Information only. There is deliberately no form here of any kind — no
 * enquiry, no quote, no order. The business is reached directly through the
 * channels it has published, and nothing is invented: a detail that is still a
 * placeholder simply does not appear.
 */

function Icon({ name }: { name: "phone" | "mail" | "whatsapp" | "pin" | "clock" | "social" }) {
  const shared = {
    width: 16,
    height: 16,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "phone":
      return (
        <svg {...shared}>
          <path d="M6.5 2.5h-3v3c0 6.1 4.9 11 11 11h3v-3l-3.5-1.5-2 2a13 13 0 0 1-6-6l2-2L6.5 2.5z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...shared}>
          <rect x="2" y="4.5" width="16" height="11" rx="1" />
          <path d="M2.5 5.5 10 11l7.5-5.5" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...shared}>
          <path d="M3 17l1.2-3.4A7 7 0 1 1 7 16.4L3 17z" />
          <path d="M7.5 8c0 3 1.5 4.5 4.5 4.5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...shared}>
          <path d="M10 18s6-5 6-9a6 6 0 0 0-12 0c0 4 6 9 6 9z" />
          <circle cx="10" cy="9" r="2" />
        </svg>
      );
    case "clock":
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 5.5V10l3 1.8" />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.5" />
        </svg>
      );
  }
}

/** One row of contact information. */
function Row({
  icon,
  label,
  value,
  href,
  index,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  index: number;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="mt-0.5 shrink-0 text-plum">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.625rem] uppercase tracking-[0.2em] text-cocoa-soft">
          {label}
        </span>
        <span className="mt-1 block break-words text-cocoa">{value}</span>
      </span>
    </>
  );

  return (
    <li
      data-stagger
      style={{ "--index": index } as React.CSSProperties}
      className="border-b border-espresso/10 pb-4"
    >
      {href ? (
        <a
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="flex gap-4 transition-colors hover:text-espresso"
        >
          {body}
        </a>
      ) : (
        <span className="flex gap-4">{body}</span>
      )}
    </li>
  );
}

export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const rows: React.ReactNode[] = [];
  let index = 0;

  if (isProvided(contact.person)) {
    rows.push(
      <Row key="person" icon={<Icon name="social" />} label="Contact" value={contact.person} index={index++} />,
    );
  }
  // One row per number. Where a name has been given for a number it becomes
  // the row's label, so a visitor with two numbers in front of them knows
  // which of the two they are ringing.
  for (const entry of resolved.phones) {
    rows.push(
      <Row
        key={entry.number}
        icon={<Icon name="phone" />}
        label={isProvided(entry.label) ? entry.label : "Telephone"}
        value={entry.number}
        href={telHref(entry.number)}
        index={index++}
      />,
    );
  }
  if (resolved.hasEmail) {
    rows.push(
      <Row key="email" icon={<Icon name="mail" />} label="Email" value={contact.email} href={`mailto:${contact.email}`} index={index++} />,
    );
  }
  if (resolved.hasWhatsapp) {
    rows.push(
      <Row key="whatsapp" icon={<Icon name="whatsapp" />} label="WhatsApp" value={contact.whatsapp} href={whatsappHref(contact.whatsapp)} index={index++} external />,
    );
  }
  if (isProvided(contact.location)) {
    rows.push(
      <Row key="location" icon={<Icon name="pin" />} label="Location" value={contact.location} index={index++} />,
    );
  }
  if (isProvided(contact.serviceArea)) {
    rows.push(
      <Row key="area" icon={<Icon name="pin" />} label="Service area" value={contact.serviceArea} index={index++} />,
    );
  }
  if (isProvided(contact.collection)) {
    rows.push(
      <Row key="collection" icon={<Icon name="pin" />} label="Collection" value={contact.collection} index={index++} />,
    );
  }
  if (isProvided(contact.delivery)) {
    rows.push(
      <Row key="delivery" icon={<Icon name="pin" />} label="Delivery" value={contact.delivery} index={index++} />,
    );
  }
  if (isProvided(contact.responseHours)) {
    rows.push(
      <Row key="hours" icon={<Icon name="clock" />} label="Response hours" value={contact.responseHours} index={index++} />,
    );
  }

  const socials = [
    { key: "instagram", label: "Instagram", url: contact.social.instagram, show: resolved.hasInstagram },
    { key: "facebook", label: "Facebook", url: contact.social.facebook, show: resolved.hasFacebook },
    { key: "tiktok", label: "TikTok", url: contact.social.tiktok, show: resolved.hasTiktok },
  ].filter((item) => item.show);

  return (
    <Modal open={open} onClose={onClose} label="Contact Elshadai Cake Creations">
      <div className="p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow text-cocoa-soft">Get in touch</p>
            <h2 className="display-sm mt-3 text-espresso">{business.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-cocoa-soft transition-colors hover:text-espresso"
          >
            <span className="sr-only">Close</span>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>

        {rows.length > 0 ? (
          <ul className="mt-9 space-y-4">{rows}</ul>
        ) : (
          <p className="voice measure mt-8 text-cocoa">
            Contact details have not been added to the website yet. They will
            appear here once they are provided.
          </p>
        )}

        {socials.length > 0 && (
          <div className="mt-8">
            <p className="text-[0.625rem] uppercase tracking-[0.2em] text-cocoa-soft">
              Follow
            </p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {socials.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex border border-espresso/25 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-espresso transition-colors hover:bg-espresso hover:text-ivory"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-9 border-t border-espresso/10 pt-6 text-sm text-cocoa-soft">
          Cakes are discussed and arranged directly with{" "}
          {business.name}. This website does not take orders online.
        </p>
      </div>
    </Modal>
  );
}
