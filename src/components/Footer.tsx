import { useT } from '../lib/i18n/useT'

interface FooterProps {
  onNav: (route: string) => void
}

const CONTACT_EMAIL = 'franosma83@gmail.com'
const GITHUB_URL = 'https://github.com/FuujiiN83/Excel-to-sky'

export function Footer({ onNav }: FooterProps): JSX.Element {
  const t = useT()
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--bg) 70%, transparent)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          padding: '40px 64px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 40,
          fontSize: 12,
          color: 'var(--muted)',
          maxWidth: 1440,
          marginInline: 'auto',
        }}
      >
        <div>
          <div
            className="font-display"
            style={{
              fontSize: 14,
              color: 'var(--ink)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            EXCEL<span style={{ color: 'var(--sky)' }}>—</span>SKY
          </div>
          <div style={{ marginTop: 12, fontSize: 11 }}>v0.5 · beta</div>
        </div>

        <FooterCol title={t('footer.col.product')}>
          <FooterLink onClick={() => onNav('upload')}>{t('footer.link.app')}</FooterLink>
          <FooterLink onClick={() => onNav('faq')}>{t('footer.link.faq')}</FooterLink>
          <FooterLink onClick={() => onNav('settings')}>{t('footer.link.settings')}</FooterLink>
        </FooterCol>

        <FooterCol title={t('footer.col.legal')}>
          <FooterLink onClick={() => onNav('privacy')}>{t('footer.link.privacy')}</FooterLink>
          <FooterLink onClick={() => onNav('terms')}>{t('footer.link.terms')}</FooterLink>
        </FooterCol>

        <FooterCol title={t('footer.col.contact')}>
          <FooterAnchor href={`mailto:${CONTACT_EMAIL}`}>{t('footer.link.email')}</FooterAnchor>
          <FooterAnchor href={GITHUB_URL} external>
            {t('footer.link.github')}
          </FooterAnchor>
          <FooterLink onClick={() => onNav('report')}>{t('footer.link.bug')}</FooterLink>
        </FooterCol>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 64px',
          fontSize: 11,
          color: 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          maxWidth: 1440,
          marginInline: 'auto',
        }}
      >
        <div>© {new Date().getFullYear()} Excel to Sky</div>
        <div>{t('footer.madeIn')}</div>
      </div>
    </footer>
  )
}

interface FooterColProps {
  title: string
  children: React.ReactNode
}

function FooterCol({ title, children }: FooterColProps): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

interface FooterLinkProps {
  onClick: () => void
  children: React.ReactNode
}

function FooterLink({ onClick, children }: FooterLinkProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--ink-2)',
        fontSize: 12,
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

interface FooterAnchorProps {
  href: string
  children: React.ReactNode
  external?: boolean
}

function FooterAnchor({ href, children, external = false }: FooterAnchorProps): JSX.Element {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{
        color: 'var(--ink-2)',
        fontSize: 12,
        textDecoration: 'none',
      }}
    >
      {children}
    </a>
  )
}
