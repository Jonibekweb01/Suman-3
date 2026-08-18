import { Link } from 'react-router-dom';
import { IconReturn, IconShield, IconTruck } from '../../shared/ui';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'New in', to: '/' },
      { label: 'Women', to: '/women' },
      { label: 'Men', to: '/men' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'My orders', to: '/orders' },
      { label: 'Delivery', to: '/' },
      { label: 'Returns', to: '/' },
      { label: 'Size guide', to: '/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our story', to: '/' },
      { label: 'Sustainability', to: '/' },
      { label: 'Careers', to: '/' },
      { label: 'Contact', to: '/' },
    ],
  },
];

const TRUST = [
  { icon: IconTruck, title: 'Free delivery', copy: "On orders over 500 000 so'm" },
  { icon: IconReturn, title: '14-day returns', copy: 'Unworn, with tags attached' },
  { icon: IconShield, title: 'Secure checkout', copy: 'Encrypted end to end' },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page">
        <div className="grid gap-6 border-b border-line py-10 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon size={22} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="font-display text-3xl tracking-[-0.04em]">suman</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Considered clothing, designed in Tashkent. Premium materials, minimal silhouettes,
              made to be worn well beyond a single season.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Suman. All rights reserved.
          </p>

          <div className="flex items-center gap-2" aria-label="Accepted payment methods">
            {['UZCARD', 'HUMO', 'VISA', 'MASTERCARD'].map((method) => (
              <span
                key={method}
                className="rounded border border-line-strong px-2 py-1 text-[10px] font-medium tracking-wider text-muted"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
