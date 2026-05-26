import { LegalLayout } from './LegalLayout'

interface PrivacyPageProps {
  onNav: (route: string) => void
}

export function PrivacyPage({ onNav }: PrivacyPageProps): JSX.Element {
  return (
    <LegalLayout title="Política de privacidad" onNav={onNav}>
      <p>
        <em>Última actualización: 2026-05-26.</em>
      </p>
      <p>
        Esta política describe cómo Excel to Sky (en adelante, “la
        aplicación”) trata los datos personales de los usuarios, en
        cumplimiento del Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica
        3/2018 de Protección de Datos Personales y Garantía de los Derechos
        Digitales (LOPDGDD).
      </p>

      <h2 style={h2}>1. Responsable del tratamiento</h2>
      <p>
        Responsable: Excel to Sky. Contacto:{' '}
        <a href="mailto:contacto@exceltosky.example">contacto@exceltosky.example</a>.
        Al tratarse de un proyecto en fase beta, no disponemos todavía de
        domicilio físico fiscal publicado; cualquier comunicación oficial
        relacionada con datos personales debe dirigirse al correo indicado.
      </p>

      <h2 style={h2}>2. Datos que tratamos</h2>
      <p>
        Procesamos dos categorías de información:
      </p>
      <ul>
        <li>
          <strong>Datos contenidos en los archivos Excel/CSV que subes.</strong>{' '}
          Por defecto, estos datos se procesan exclusivamente en el navegador
          del usuario (sin enviarse al servidor) y se almacenan en el
          almacenamiento local del navegador mediante IndexedDB. Si el usuario
          decide compartir un dashboard pulsando el botón “Compartir”, una
          copia de los datos se transmite a nuestra infraestructura en la nube
          (Supabase, región Unión Europea) para servir el enlace público.
        </li>
        <li>
          <strong>Datos técnicos generados durante la navegación.</strong>{' '}
          Dirección IP, agente de usuario, identificadores de sesión y cookies
          colocadas por los proveedores publicitarios. Estos datos se utilizan
          para servir publicidad relevante y prevenir abuso.
        </li>
      </ul>

      <h2 style={h2}>3. Cookies y trackers de terceros</h2>
      <p>
        Utilizamos Google AdSense para servir publicidad y un CMP (Funding
        Choices) para recoger el consentimiento del usuario. AdSense puede
        colocar cookies de personalización y medición. Puedes gestionar tus
        preferencias publicitarias en{' '}
        <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">
          adssettings.google.com
        </a>{' '}
        o rechazar el consentimiento desde el banner que mostramos en la
        primera visita.
      </p>

      <h2 style={h2}>4. Base legal del tratamiento</h2>
      <p>
        El tratamiento de los datos contenidos en los Excel se realiza
        íntegramente en el navegador del usuario (no hay tratamiento por
        nuestra parte) salvo que el usuario lo comparta voluntariamente, en
        cuyo caso la base legal es el <strong>consentimiento</strong> explícito
        del usuario (art. 6.1.a RGPD). Para los datos técnicos y publicitarios,
        la base legal es el <strong>interés legítimo</strong> (art. 6.1.f RGPD)
        y, donde aplique, el consentimiento gestionado por el CMP.
      </p>

      <h2 style={h2}>5. Plazos de conservación</h2>
      <p>
        Los dashboards compartidos se conservan durante 90 días desde la
        última visita. Cada vez que un dashboard es visitado, el plazo de
        retención se prorroga otros 90 días. Transcurrido el plazo sin
        visitas, el dashboard se elimina de forma automática e irreversible.
        Los datos almacenados localmente en el navegador del usuario
        permanecen hasta que éste los borre manualmente o limpie el
        almacenamiento del navegador.
      </p>

      <h2 style={h2}>6. Destinatarios y transferencias internacionales</h2>
      <p>
        Los datos compartidos se almacenan en Supabase, en su región europea
        (UE), lo que no implica transferencia internacional. Los servicios de
        Google (AdSense, Funding Choices) pueden implicar la transferencia de
        datos a Estados Unidos al amparo del Marco de Privacidad de Datos
        UE-EEUU (Data Privacy Framework) y las cláusulas contractuales tipo
        aprobadas por la Comisión Europea.
      </p>

      <h2 style={h2}>7. Derechos del usuario</h2>
      <p>
        Como interesado tienes derecho de acceso, rectificación, supresión,
        oposición, limitación del tratamiento y portabilidad de tus datos. La
        forma más rápida de ejercer el derecho de supresión sobre un
        dashboard concreto es utilizar el botón “Eliminar” asociado al
        deleteToken que se guardó en tu navegador al crearlo. Para cualquier
        otra solicitud, escribe a{' '}
        <a href="mailto:contacto@exceltosky.example">contacto@exceltosky.example</a>{' '}
        adjuntando una descripción del dashboard y, si es posible, el enlace.
        Tienes derecho a presentar una reclamación ante la Agencia Española de
        Protección de Datos (www.aepd.es).
      </p>

      <h2 style={h2}>8. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios legales o
        técnicos. La fecha de “última actualización” en la parte superior
        siempre indicará la versión vigente.
      </p>
    </LegalLayout>
  )
}

const h2 = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--ink)',
  marginTop: 32,
  marginBottom: 12,
  letterSpacing: '-0.01em',
} as const
