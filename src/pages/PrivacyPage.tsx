import { LegalLayout } from './LegalLayout'

interface PrivacyPageProps {
  onNav: (route: string) => void
}

const CONTACT_EMAIL = 'franosma83@gmail.com'
const CONTROLLER_NAME = 'Francisco Osma Redondo'
const LAST_UPDATED = '2026-05-27'

export function PrivacyPage({ onNav }: PrivacyPageProps): JSX.Element {
  return (
    <LegalLayout title="Política de privacidad" onNav={onNav}>
      <p>
        <em>Última actualización: {LAST_UPDATED}.</em>
      </p>
      <p>
        Esta política describe cómo Excel to Sky (en adelante, “la aplicación” o “el servicio”)
        trata los datos personales de sus usuarios, en cumplimiento del Reglamento (UE) 2016/679
        (RGPD), la Ley Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos
        Digitales (LOPDGDD) y la Ley 34/2002 de Servicios de la Sociedad de la Información
        (LSSI-CE).
      </p>

      <h2 style={h2}>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento es <strong>{CONTROLLER_NAME}</strong>, titular del proyecto
        Excel to Sky. El servicio se ofrece como una herramienta gratuita en fase beta, sin
        domicilio físico fiscal publicado. La vía oficial de contacto para todas las cuestiones
        relativas a esta política y al ejercicio de derechos es el correo{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 style={h2}>2. Datos que tratamos</h2>
      <p>Distinguimos tres categorías de información:</p>
      <ul>
        <li>
          <strong>Datos contenidos en los archivos Excel o CSV que subes.</strong> Se procesan
          exclusivamente en tu navegador, dentro de un Web Worker, sin enviarse al servidor.
          Permanecen en el almacenamiento local del navegador (IndexedDB) hasta que tú los borres o
          limpies la caché. Si decides compartir un dashboard pulsando “Compartir”, una copia se
          transmite a nuestra infraestructura en la nube (Supabase, región UE) para servir el enlace
          público.
        </li>
        <li>
          <strong>Identificador de borrado (deleteToken).</strong> Cuando creas un dashboard
          compartido, generamos un token aleatorio que se guarda únicamente en tu navegador. Es lo
          que te permite eliminar el dashboard sin necesidad de cuenta. No lo almacenamos en formato
          legible: en el servidor sólo guardamos un hash.
        </li>
        <li>
          <strong>Datos técnicos generados durante la navegación.</strong> Dirección IP, agente de
          usuario y metadatos básicos de la petición. Los registramos transitoriamente para prevenir
          abuso (rate limiting), diagnosticar incidencias y cumplir obligaciones legales. No los
          enriquecemos, no los vendemos y no los usamos para construir perfiles.
        </li>
      </ul>

      <h2 style={h2}>3. Finalidades del tratamiento</h2>
      <ul>
        <li>
          Prestar el servicio (parseo local, generación y alojamiento de dashboards compartidos).
        </li>
        <li>
          Prevenir el uso abusivo o fraudulento (límites de peticiones, detección de patrones de
          scraping).
        </li>
        <li>Cumplir con obligaciones legales aplicables.</li>
        <li>
          En el futuro y previa activación expresa, mostrar publicidad financiada por terceros (ver
          sección 4).
        </li>
      </ul>

      <h2 style={h2}>4. Cookies y publicidad</h2>
      <p>
        <strong>
          En el momento de redactar esta política, Excel to Sky no utiliza cookies propias ni de
          terceros.
        </strong>{' '}
        No usamos analytics, no usamos píxeles de seguimiento y no compartimos datos con redes
        publicitarias.
      </p>
      <p>
        Está previsto integrar publicidad servida por Google AdSense en una futura versión del
        servicio para sostener los costes de infraestructura. Cuando esa integración esté activa:
      </p>
      <ul>
        <li>
          Mostraremos un banner de consentimiento (CMP, Funding Choices) en la primera visita, en
          cumplimiento del estándar IAB TCF v2.
        </li>
        <li>
          Las cookies publicitarias <strong>sólo se cargarán si aceptas explícitamente</strong>. Si
          rechazas el consentimiento, no se colocarán cookies y la aplicación seguirá funcionando
          con normalidad.
        </li>
        <li>
          Podrás revisar tus preferencias en{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            adssettings.google.com
          </a>{' '}
          y revocar el consentimiento en cualquier momento.
        </li>
        <li>
          Esta política se actualizará en el momento en que la integración publicitaria entre en
          producción y enumeraremos cada cookie con su finalidad y duración.
        </li>
      </ul>

      <h2 style={h2}>5. Base legal del tratamiento</h2>
      <p>
        El tratamiento de los datos contenidos en los archivos subidos se realiza íntegramente en tu
        navegador, por lo que no hay tratamiento por nuestra parte en el sentido del RGPD. Cuando
        decides compartir un dashboard, la base legal es el{' '}
        <strong>consentimiento explícito</strong> (art. 6.1.a RGPD). Para los datos técnicos de
        navegación y prevención de abuso, la base legal es el <strong>interés legítimo</strong>{' '}
        (art. 6.1.f RGPD). En el futuro, la base legal de la publicidad personalizada será el{' '}
        <strong>consentimiento</strong> recogido por el CMP.
      </p>

      <h2 style={h2}>6. Plazos de conservación</h2>
      <ul>
        <li>
          <strong>Dashboards compartidos:</strong> 90 días desde la última visita. Cada visita
          reinicia el contador. Transcurrido el plazo sin visitas, el dashboard se elimina de forma
          automática e irreversible.
        </li>
        <li>
          <strong>Datos almacenados localmente en tu navegador:</strong> permanecen hasta que tú los
          borres o limpies el almacenamiento.
        </li>
        <li>
          <strong>Logs técnicos de rate limiting:</strong> máximo 30 días.
        </li>
      </ul>

      <h2 style={h2}>7. Destinatarios y transferencias internacionales</h2>
      <p>
        Los dashboards compartidos se almacenan en Supabase Inc., en su región europea (UE), lo que
        no implica transferencia internacional. Cuando la integración de Google AdSense esté activa,
        podrá implicar transferencias a Estados Unidos al amparo del Marco de Privacidad de Datos
        UE-EEUU (Data Privacy Framework) y las cláusulas contractuales tipo aprobadas por la
        Comisión Europea. Hasta entonces, ningún dato sale del Espacio Económico Europeo.
      </p>

      <h2 style={h2}>8. Medidas de seguridad</h2>
      <p>Aplicamos las medidas técnicas y organizativas apropiadas para proteger los datos:</p>
      <ul>
        <li>Transmisión cifrada en tránsito mediante HTTPS/TLS.</li>
        <li>Almacenamiento gestionado por Supabase, con cifrado en reposo a nivel de disco.</li>
        <li>
          Los enlaces públicos llevan un identificador aleatorio de 12 caracteres difícil de
          adivinar.
        </li>
        <li>Limitación de tasa por IP para prevenir abuso (rate limiting).</li>
        <li>El deleteToken se almacena únicamente como hash en el servidor.</li>
      </ul>

      <h2 style={h2}>9. Menores de edad</h2>
      <p>
        Excel to Sky no está dirigido a personas menores de <strong>14 años</strong>. En España, el
        artículo 7 de la LOPDGDD permite el consentimiento del tratamiento de datos personales a
        partir de esa edad. Si tienes menos de 14 años, no utilices el servicio. Si detectamos que
        un dashboard ha sido creado por un menor de 14 años sin el consentimiento de sus padres o
        tutores, procederemos a eliminarlo.
      </p>

      <h2 style={h2}>10. Derechos del usuario</h2>
      <p>Como interesado, tienes derecho a:</p>
      <ul>
        <li>
          <strong>Acceder</strong> a los datos personales que tratamos sobre ti.
        </li>
        <li>
          <strong>Rectificar</strong> datos inexactos.
        </li>
        <li>
          <strong>Suprimir</strong> tus datos (“derecho al olvido”).
        </li>
        <li>
          <strong>Oponerte</strong> al tratamiento y solicitar su limitación.
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en un formato estructurado de uso
          habitual.
        </li>
        <li>
          <strong>No ser objeto de decisiones automatizadas</strong> con efectos jurídicos. Excel to
          Sky no toma decisiones automatizadas que produzcan tales efectos.
        </li>
        <li>
          <strong>Retirar el consentimiento</strong> en cualquier momento, sin que ello afecte a la
          licitud del tratamiento previo.
        </li>
      </ul>
      <p>
        La forma más rápida de ejercer el derecho de supresión sobre un dashboard concreto es
        utilizar el botón “Eliminar” asociado al deleteToken que se guardó en tu navegador al
        crearlo. Para cualquier otra solicitud, escribe a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adjuntando una descripción del
        dashboard y, si es posible, el enlace público correspondiente. Responderemos en un plazo
        máximo de un mes, prorrogable otros dos meses en casos complejos.
      </p>
      <p>
        Si consideras que tus derechos no han sido debidamente atendidos, tienes derecho a presentar
        una reclamación ante la{' '}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          Agencia Española de Protección de Datos (AEPD)
        </a>
        .
      </p>

      <h2 style={h2}>11. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios legales, técnicos o de servicio (en
        particular, la activación de la integración publicitaria mencionada en la sección 4). La
        fecha de “última actualización” en la parte superior siempre indicará la versión vigente.
        Los cambios sustanciales se comunicarán mediante un aviso visible en la propia aplicación.
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
