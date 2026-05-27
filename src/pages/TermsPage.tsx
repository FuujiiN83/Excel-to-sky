import { LegalLayout } from './LegalLayout'

interface TermsPageProps {
  onNav: (route: string) => void
}

const CONTACT_EMAIL = 'franosma83@gmail.com'
const HOLDER_NAME = 'Francisco Osma Redondo'
const LAST_UPDATED = '2026-05-27'

export function TermsPage({ onNav }: TermsPageProps): JSX.Element {
  return (
    <LegalLayout title="Términos de uso" onNav={onNav}>
      <p>
        <em>Última actualización: {LAST_UPDATED}.</em>
      </p>
      <p>
        Estos Términos regulan el acceso y uso de Excel to Sky (en adelante,
        “la aplicación” o “el servicio”). Al acceder o utilizar el servicio,
        aceptas íntegramente estos Términos. Si no estás de acuerdo con
        alguno de ellos, no utilices la aplicación.
      </p>

      <h2 style={h2}>1. Identificación del titular</h2>
      <p>
        El titular del servicio es <strong>{HOLDER_NAME}</strong>, en su condición
        de responsable del proyecto Excel to Sky. La vía oficial de contacto
        para todas las cuestiones relativas a estos Términos es el correo{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 style={h2}>2. Definiciones</h2>
      <ul>
        <li><strong>“Aplicación” o “servicio”:</strong> la plataforma web Excel to Sky y todos sus componentes (frontend, backend, dashboards alojados).</li>
        <li><strong>“Usuario”:</strong> persona física que accede a la aplicación, sube un archivo o visita un dashboard compartido.</li>
        <li><strong>“Contenido del usuario”:</strong> archivos Excel/CSV/ODS subidos a la aplicación y dashboards generados a partir de ellos.</li>
        <li><strong>“Dashboard compartido”:</strong> snapshot de un dashboard accesible mediante un enlace público generado por el usuario.</li>
        <li><strong>“deleteToken”:</strong> identificador aleatorio que se entrega al usuario al crear un dashboard compartido y que permite su eliminación sin necesidad de cuenta.</li>
      </ul>

      <h2 style={h2}>3. Aceptación de los Términos</h2>
      <p>
        El acceso a la aplicación, el uso de sus funcionalidades (subir un
        archivo, generar un dashboard, compartir un enlace) y la simple
        navegación implican la aceptación expresa de los presentes Términos
        y de la{' '}
        <a onClick={() => onNav('privacy')} style={inlineLink}>Política de Privacidad</a>.
        Si en algún momento dejas de estar de acuerdo, debes dejar de utilizar
        el servicio.
      </p>

      <h2 style={h2}>4. Edad mínima</h2>
      <p>
        Para utilizar Excel to Sky es necesario tener cumplidos{' '}
        <strong>14 años</strong>, de acuerdo con el artículo 7 de la LOPDGDD.
        Si tienes menos de 14 años, no debes utilizar el servicio. El
        registro o uso del servicio por menores de 14 años requiere el
        consentimiento previo de los padres o tutores legales; en caso de
        detectarse, el contenido y los dashboards generados serán eliminados.
      </p>

      <h2 style={h2}>5. Uso permitido</h2>
      <p>
        El usuario se compromete a utilizar la aplicación de buena fe, con
        fines lícitos y conforme a estos Términos. Queda <strong>expresamente
        prohibido</strong> subir o compartir contenido que contenga:
      </p>
      <ul>
        <li>Datos personales sensibles (datos de salud, biométricos, opiniones políticas, orientación sexual, religión, etc.) sin la base legal correspondiente.</li>
        <li>Datos identificativos de terceros sin su consentimiento explícito (DNI, NIE, número de la seguridad social, datos bancarios, etc.).</li>
        <li>Datos amparados por secreto profesional, secreto bancario o cláusulas contractuales de confidencialidad.</li>
        <li>Material protegido por derechos de autor sin la autorización correspondiente.</li>
        <li>Contenido ilegal, ofensivo, difamatorio, discriminatorio, violento o que infrinja derechos de terceros.</li>
        <li>Software malicioso, intentos de inyección de código o vectores de ataque.</li>
      </ul>
      <p>
        El usuario es el <strong>único responsable</strong> del contenido que
        sube y de las consecuencias de su difusión. Excel to Sky no revisa
        proactivamente el contenido y no responde por su licitud.
      </p>

      <h2 style={h2}>6. Cuentas y sin registro</h2>
      <p>
        Excel to Sky no requiere registro. El servicio se ofrece sin
        autenticación de usuario y sin almacenar credenciales. La
        funcionalidad de borrado de un dashboard compartido se basa en la
        posesión del deleteToken correspondiente, almacenado localmente
        en el navegador del usuario en el momento de la creación.
      </p>

      <h2 style={h2}>7. Servicios de terceros</h2>
      <p>
        Para prestar el servicio utilizamos los siguientes proveedores:
      </p>
      <ul>
        <li><strong>Supabase Inc.</strong> — base de datos y funciones serverless para alojar los dashboards compartidos, en la región europea (Frankfurt, UE).</li>
        <li><strong>Google LLC (AdSense, planificado).</strong> — futura integración publicitaria, sujeta a consentimiento explícito mediante CMP. Hasta su activación efectiva, no se carga ningún recurso de Google.</li>
      </ul>
      <p>
        El uso del servicio implica la aceptación de los términos de servicio
        y políticas de privacidad de estos proveedores cuando interactúes
        con sus componentes.
      </p>

      <h2 style={h2}>8. Limitación de responsabilidad</h2>
      <p>
        La aplicación se ofrece <strong>“tal cual” (as-is)</strong>, sin
        garantías explícitas ni implícitas de continuidad, disponibilidad,
        exactitud de las estadísticas, ausencia de errores ni adecuación
        a un propósito particular. En la máxima medida permitida por la
        legislación aplicable, el titular de Excel to Sky no será
        responsable de daños directos, indirectos, incidentales,
        consecuenciales o lucro cesante derivados del uso o imposibilidad
        de uso del servicio, incluyendo (sin limitación) pérdida de datos,
        pérdida de oportunidad de negocio o daño reputacional.
      </p>
      <p>
        En ningún caso esta limitación afectará a los derechos del usuario
        en su condición de consumidor reconocidos por la legislación
        imperativa española y europea.
      </p>

      <h2 style={h2}>9. Indemnidad</h2>
      <p>
        El usuario se compromete a mantener indemne al titular del servicio
        frente a cualquier reclamación, sanción o responsabilidad de
        terceros derivada del incumplimiento por su parte de los presentes
        Términos, en particular por la naturaleza del contenido subido
        (datos personales de terceros sin consentimiento, contenido ilícito
        o que infrinja derechos de propiedad intelectual).
      </p>

      <h2 style={h2}>10. Propiedad intelectual</h2>
      <p>
        El contenido subido por el usuario sigue siendo de su exclusiva
        propiedad. Excel to Sky no reclama ningún derecho de propiedad
        intelectual sobre dicho contenido y únicamente lo procesa para
        prestar el servicio solicitado (generar y, en su caso, alojar el
        dashboard). El código, marca, diseño, identidad visual y elementos
        gráficos de la aplicación pertenecen al titular o a sus respectivos
        titulares y están protegidos por la normativa de propiedad
        intelectual e industrial vigente.
      </p>

      <h2 style={h2}>11. Suspensión y modificación del servicio</h2>
      <p>
        Excel to Sky se reserva el derecho de suspender, modificar o
        descontinuar el servicio, total o parcialmente, en cualquier
        momento y sin previo aviso, especialmente en caso de uso abusivo,
        fraudulento o que comprometa la seguridad de la plataforma o de
        otros usuarios. También nos reservamos el derecho a eliminar
        dashboards que contengan contenido ilícito o que infrinja estos
        Términos.
      </p>

      <h2 style={h2}>12. Publicidad</h2>
      <p>
        El servicio puede sostenerse en el futuro mediante publicidad
        servida por terceros (Google AdSense). En ese caso, los anuncios se
        mostrarán únicamente en zonas no críticas de la interfaz, sujetos
        al consentimiento previo del usuario recogido por el CMP, y nunca
        en la vista pública de un dashboard compartido. El uso de
        bloqueadores de publicidad está permitido y no condiciona el acceso
        a la aplicación.
      </p>

      <h2 style={h2}>13. Modificaciones de los Términos</h2>
      <p>
        Podemos modificar estos Términos para reflejar cambios legales,
        técnicos o de servicio. La fecha de “última actualización” en la
        parte superior siempre indicará la versión vigente. Si los cambios
        son sustanciales, mostraremos un aviso visible en la propia
        aplicación. El uso continuado del servicio tras la entrada en vigor
        de los nuevos Términos implica su aceptación.
      </p>

      <h2 style={h2}>14. Independencia de las cláusulas</h2>
      <p>
        Si alguna disposición de estos Términos es declarada nula o
        inaplicable por un tribunal competente, dicha disposición se
        eliminará o limitará en la mínima medida necesaria, manteniéndose
        el resto de los Términos plenamente vigentes y exigibles.
      </p>

      <h2 style={h2}>15. Acuerdo completo</h2>
      <p>
        Estos Términos, junto con la Política de Privacidad, constituyen
        el acuerdo completo entre el usuario y Excel to Sky en relación
        con el uso del servicio, y reemplazan cualquier acuerdo, propuesta
        o comunicación previa, escrita u oral.
      </p>

      <h2 style={h2}>16. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para
        cualquier controversia derivada del uso del servicio, las partes
        se someten, con renuncia expresa a cualquier otro fuero que
        pudiera corresponderles, a los <strong>Juzgados y Tribunales de
        Madrid (España)</strong>, salvo que la normativa imperativa
        aplicable a consumidores establezca lo contrario, en cuyo caso
        prevalecerá la jurisdicción que dicha normativa indique.
      </p>

      <h2 style={h2}>17. Contacto</h2>
      <p>
        Para cualquier duda, sugerencia o notificación relativa a estos
        Términos, contacta con nosotros en{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
