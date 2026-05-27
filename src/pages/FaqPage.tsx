import { LegalLayout } from './LegalLayout'

interface FaqPageProps {
  onNav: (route: string) => void
}

const CONTACT_EMAIL = 'franosma83@gmail.com'

const QA: Array<{ q: string; a: string }> = [
  {
    q: '¿Qué tipos de archivo puedo subir?',
    a: 'Excel to Sky acepta hojas de cálculo en formato .xlsx (Excel moderno), .xls (Excel clásico), .csv (separado por comas) y .tsv (separado por tabuladores). Procesamos la primera hoja de cada libro y leemos la fila inicial como cabecera de columnas. Si tu hoja contiene fórmulas, leemos el valor calculado tal y como Excel lo guarda. Los archivos cifrados con contraseña no son compatibles: ábrelos primero en Excel, guárdalos sin contraseña, y vuelve a subirlos.',
  },
  {
    q: '¿Tengo que registrarme?',
    a: 'No. Excel to Sky no requiere ninguna cuenta para subir un archivo, generar un dashboard, navegarlo ni compartirlo. La idea es eliminar fricciones: arrastras el Excel, obtienes el dashboard. Si en el futuro añadimos funcionalidades opcionales que requieran identificación (por ejemplo, panel de gestión de tus dashboards) lo dejaremos como un “extra” y nunca como un requisito para las funciones básicas.',
  },
  {
    q: '¿Mis datos son privados?',
    a: 'Por defecto, todo el procesado ocurre en tu navegador: detectamos tipos de columna, calculamos estadísticas y dibujamos los gráficos sin enviar la hoja a ningún servidor. Tu Excel queda guardado únicamente en el almacenamiento local del navegador (IndexedDB). Sólo cuando pulsas “Compartir” y aceptas explícitamente, copiamos un snapshot de los datos a nuestra base de datos en la nube (Supabase, región Unión Europea) para generar el enlace público.',
  },
  {
    q: '¿Quién puede ver mi dashboard compartido?',
    a: 'Cualquier persona que tenga el enlace. El enlace contiene un identificador aleatorio de 12 caracteres difícil de adivinar, pero no está protegido por contraseña ni por autenticación. Trata el enlace como un “secreto compartido”: envíalo sólo a quien deba verlo. Si necesitas dejar de compartir un dashboard, puedes borrarlo desde la pantalla del propio dashboard (botón “Eliminar”) y dejará de estar accesible.',
  },
  {
    q: '¿Cuánto tiempo se guardan los dashboards?',
    a: 'Conservamos los dashboards compartidos durante 90 días desde la última visita. Cada vez que alguien abre el enlace, el reloj se reinicia: si el dashboard recibe tráfico habitualmente, no expira. Si nadie lo visita durante 90 días seguidos, se borra automáticamente del servidor y el enlace deja de funcionar. Esta política de retención nos permite mantener el servicio gratuito y respetuoso con los datos.',
  },
  {
    q: '¿Puedo borrar un dashboard?',
    a: 'Sí. Al crear un dashboard recibes un “deleteToken” que se guarda en el almacenamiento local de tu navegador. Mientras conserves ese token (es decir, mientras no borres los datos del navegador) podrás eliminar el dashboard inmediatamente desde la propia interfaz. Si pierdes el token porque cambiaste de navegador o vaciaste la caché, escríbenos a contacto y verificaremos manualmente la eliminación.',
  },
  {
    q: '¿Funciona offline?',
    a: 'En gran medida sí. Una vez has cargado la aplicación al menos una vez, el procesado de Excel y la navegación por los dashboards locales funcionan sin conexión, porque todo ocurre en tu navegador. Lo que no funciona offline es lo que necesita Internet por definición: compartir un nuevo dashboard, abrir un enlace público de otra persona, y la publicidad si en algún momento la activamos.',
  },
  {
    q: '¿Funciona en móvil?',
    a: 'Sí. La interfaz se adapta a pantallas pequeñas y es totalmente táctil. Recomendamos un navegador moderno (Chrome, Safari, Firefox o Edge en su versión más reciente). Para archivos muy grandes (más de varios MB) recomendamos hacer la subida desde un ordenador, ya que los navegadores móviles tienen límites de memoria más estrictos y el parseo puede ralentizarse.',
  },
  {
    q: '¿Qué pasa si subo un archivo muy grande?',
    a: 'El tamaño máximo aceptado es 10 MB para garantizar que el navegador pueda procesarlo sin bloquearse. Si tu archivo supera ese límite, conviene exportar la hoja a .csv (suele pesar la cuarta parte que el .xlsx equivalente) o filtrar el rango de filas en Excel antes de subirlo. Si necesitas analizar archivos significativamente mayores, escríbenos: estamos pensando en una versión “heavy” que parsee por chunks.',
  },
  {
    q: '¿Puedo exportar el dashboard o embeberlo en mi web?',
    a: 'En la versión actual sólo se ofrece el enlace público compartible. Estamos trabajando en exportación a PDF y embed mediante iframe como parte del sub-proyecto #7 (Sharing avanzado). Mientras tanto, una captura de pantalla de buena resolución suele ser suficiente para informes internos y presentaciones.',
  },
  {
    q: '¿Por qué algunas columnas se detectan con un tipo incorrecto?',
    a: 'El detector de tipos analiza una muestra de las primeras filas para inferir si una columna es número, fecha, categoría, geo o texto. Si la columna tiene valores mezclados (por ejemplo, “12”, “catorce”, “N/A”), la heurística no siempre acierta. En esos casos, la solución más rápida es limpiar la columna en Excel antes de subirla (uniformar formatos, dejar las celdas vacías como vacías en lugar de “N/A”) y volver a subirla. En próximas versiones permitiremos forzar el tipo manualmente.',
  },
  {
    q: '¿Y si mi archivo contiene datos personales sensibles?',
    a: 'No subas datos personales sensibles (salud, biometría, orientación, ideología, etc.) ni datos identificativos de terceros sin su consentimiento explícito. Aunque el procesado es local, el momento de pulsar “Compartir” copia los datos a la nube y se vuelven accesibles a cualquiera con el enlace. Si necesitas analizar datos sensibles, manténlos en local: navegando el dashboard sin compartir, la información nunca sale de tu navegador.',
  },
  {
    q: '¿Cómo modifico un dashboard tras compartirlo?',
    a: 'Los dashboards compartidos son snapshots inmutables del momento en que pulsaste “Compartir”. Si necesitas actualizar los datos, lo más sencillo es: (1) borrar el dashboard antiguo con tu deleteToken, (2) subir la nueva versión del Excel, (3) compartir de nuevo. El nuevo enlace será distinto, así que recuerda enviarlo a quien corresponda.',
  },
  {
    q: '¿Por qué hay anuncios?',
    a: 'Por ahora Excel to Sky no muestra ningún anuncio. El servicio es gratuito y sin registro, y para sostener los costes de infraestructura está previsto integrar publicidad servida por Google AdSense en una futura versión. Cuando esa integración esté activa, mostraremos un banner de consentimiento (CMP, Funding Choices) y las cookies publicitarias sólo se cargarán si aceptas explícitamente. Si en el futuro lanzamos un plan premium sin anuncios, lo anunciaremos en esta misma página.',
  },
  {
    q: '¿Puedo usar bloqueadores de anuncios?',
    a: 'Puedes navegar con tu bloqueador de anuncios activado sin problemas: la aplicación seguirá funcionando con normalidad y no bloqueamos al usuario por usar adblock. Si en el futuro decides apoyar el proyecto, considéranos en la lista blanca de tu bloqueador (whitelist) para que carguen los anuncios y nos ayudes a mantener el servicio. Es totalmente voluntario.',
  },
  {
    q: '¿Cómo contactar?',
    a: `Para cualquier consulta, sugerencia, problema técnico o solicitud relacionada con tus datos, escríbenos a ${CONTACT_EMAIL}. Respondemos en español o inglés en un plazo de 1 a 3 días laborables. Si tu mensaje es urgente (por ejemplo, solicitas el borrado de un dashboard que contiene datos sensibles publicados por error), indícalo en el asunto con la etiqueta [URGENTE] y daremos prioridad a la petición.`,
  },
]

export function FaqPage({ onNav }: FaqPageProps): JSX.Element {
  return (
    <LegalLayout title="Preguntas frecuentes" onNav={onNav}>
      <p>
        Aquí respondemos a las dudas más habituales sobre Excel to Sky: cómo
        funciona, qué pasa con tus datos, política de retención y cómo
        contactarnos. Si tu pregunta no aparece, escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {QA.map((item) => (
          <section key={item.q}>
            <h2
              className="font-display"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: '0 0 8px',
                letterSpacing: '-0.01em',
              }}
            >
              {item.q}
            </h2>
            <p style={{ margin: 0 }}>{item.a}</p>
          </section>
        ))}
      </div>
      <div style={{ marginTop: 40, padding: 20, borderRadius: 0, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <strong>¿Listo para empezar?</strong>{' '}
        <button
          onClick={() => onNav('upload')}
          style={{
            background: '#2E6BFF',
            color: '#fff',
            border: 'none',
            borderRadius: 0,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          Abrir la app
        </button>
      </div>
    </LegalLayout>
  )
}
