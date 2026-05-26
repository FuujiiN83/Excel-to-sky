import { LegalLayout } from './LegalLayout'

interface TermsPageProps {
  onNav: (route: string) => void
}

export function TermsPage({ onNav }: TermsPageProps): JSX.Element {
  return (
    <LegalLayout title="Términos de uso" onNav={onNav}>
      <p>
        <em>Última actualización: 2026-05-26.</em>
      </p>
      <p>
        Estos Términos regulan el acceso y uso de Excel to Sky (en adelante,
        “la aplicación”). Al utilizar la aplicación, el usuario acepta
        íntegramente estos términos. Si no estás de acuerdo, no utilices el
        servicio.
      </p>

      <h2 style={h2}>1. Aceptación</h2>
      <p>
        El acceso a la aplicación, el uso de sus funcionalidades (subir un
        archivo, generar un dashboard, compartir un enlace) y la simple
        navegación implican la aceptación expresa de los presentes Términos y
        de la <a onClick={() => onNav('privacy')} style={inlineLink}>Política de Privacidad</a>.
      </p>

      <h2 style={h2}>2. Uso permitido</h2>
      <p>
        El usuario se compromete a utilizar la aplicación de buena fe y con
        fines lícitos. Queda expresamente prohibido subir contenido que
        contenga:
      </p>
      <ul>
        <li>Datos personales sensibles (datos de salud, datos biométricos, opiniones políticas, orientación sexual, etc.).</li>
        <li>Datos identificativos de terceros sin su consentimiento explícito (DNI, NIE, número de la seguridad social, etc.).</li>
        <li>Datos amparados por secreto profesional o confidencialidad contractual.</li>
        <li>Material protegido por derechos de autor sin la autorización correspondiente.</li>
        <li>Contenido ilegal, ofensivo, difamatorio o que infrinja derechos de terceros.</li>
      </ul>
      <p>
        El usuario es el único responsable de los datos que sube. Excel to Sky
        no revisa el contenido y no responde por su licitud.
      </p>

      <h2 style={h2}>3. Limitación de responsabilidad</h2>
      <p>
        La aplicación se ofrece <strong>“tal cual” (as-is)</strong>, sin
        garantías explícitas ni implícitas de continuidad, disponibilidad,
        exactitud de las estadísticas, ausencia de errores ni adecuación a un
        propósito particular. En la máxima medida permitida por la ley
        aplicable, Excel to Sky no será responsable de daños directos,
        indirectos, incidentales o consecuentes derivados del uso o
        imposibilidad de uso del servicio, incluyendo (pero no limitado a)
        pérdida de datos, pérdida de oportunidad o lucro cesante.
      </p>

      <h2 style={h2}>4. Propiedad intelectual</h2>
      <p>
        Los datos subidos por el usuario siguen siendo de su exclusiva
        propiedad. Excel to Sky no reclama ningún derecho de propiedad
        intelectual sobre el contenido cargado y únicamente lo procesa para
        prestar el servicio solicitado (generar y, en su caso, alojar el
        dashboard). El código, marca, diseño y elementos gráficos de la
        aplicación pertenecen a Excel to Sky o a sus respectivos titulares.
      </p>

      <h2 style={h2}>5. Suspensión y modificación del servicio</h2>
      <p>
        Excel to Sky se reserva el derecho de suspender, modificar o
        descontinuar el servicio, total o parcialmente, en cualquier momento
        y sin previo aviso, especialmente en caso de uso abusivo, fraudulento
        o que comprometa la seguridad de la plataforma o de otros usuarios.
        También nos reservamos el derecho a eliminar dashboards que
        contengan contenido ilícito o que infrinja estos Términos.
      </p>

      <h2 style={h2}>6. Publicidad</h2>
      <p>
        La aplicación se financia mediante publicidad. El usuario reconoce y
        acepta que algunas áreas de la interfaz mostrarán anuncios servidos
        por terceros (Google AdSense). El uso de bloqueadores de publicidad
        está permitido y no condiciona el acceso a la aplicación.
      </p>

      <h2 style={h2}>7. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para cualquier
        controversia derivada del uso del servicio, las partes se someten,
        con renuncia expresa a cualquier otro fuero que pudiera
        corresponderles, a los Juzgados y Tribunales de Madrid (España),
        salvo que la normativa aplicable a consumidores establezca lo
        contrario.
      </p>

      <h2 style={h2}>8. Contacto</h2>
      <p>
        Para cualquier duda sobre estos Términos, contacta con nosotros en{' '}
        <a href="mailto:contacto@exceltosky.example">contacto@exceltosky.example</a>.
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

const inlineLink = {
  color: '#2E6BFF',
  cursor: 'pointer',
  textDecoration: 'underline',
} as const
