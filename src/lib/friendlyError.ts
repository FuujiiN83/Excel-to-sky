import { ParseError } from './parser'

export interface FriendlyError {
  /** Short, human-readable title. */
  title: string
  /** Optional second-line hint with a concrete action the user can try. */
  hint?: string
}

/**
 * Convert any thrown value into a two-line, user-facing message. The aim is to
 * never show a raw stack trace or a "TypeError: undefined is not a function" in
 * the UI — every failure should come back with a recognisable next step.
 */
export function friendlifyError(err: unknown): FriendlyError {
  if (err instanceof ParseError) {
    return friendlifyParse(err)
  }

  if (err instanceof Error) {
    if (/network|fetch|failed to fetch|abort/i.test(err.message)) {
      return {
        title: 'No hemos podido conectar con el servidor.',
        hint: 'Revisa tu conexión y vuelve a intentarlo en unos segundos.',
      }
    }
    if (/quota|exceeded|storage/i.test(err.message)) {
      return {
        title: 'Tu navegador se ha quedado sin espacio local.',
        hint: 'Borra algunos dashboards antiguos desde "Mis dashboards" o limpia el almacenamiento.',
      }
    }
    return { title: err.message }
  }

  return {
    title: 'Algo ha ido mal.',
    hint: 'Recarga la página y vuelve a intentarlo. Si vuelve a pasar, abre la página de Reportar bug.',
  }
}

function friendlifyParse(err: ParseError): FriendlyError {
  switch (err.phase) {
    case 'read':
      return {
        title: 'No hemos podido leer el archivo.',
        hint: 'Asegúrate de que es .xlsx, .xls, .csv u .ods sin contraseña. Los archivos cifrados no se aceptan; guárdalo sin contraseña desde Excel y vuelve a subirlo.',
      }
    case 'sheet':
      return {
        title: 'La hoja del Excel está vacía o ilegible.',
        hint: 'Abre el archivo en Excel, comprueba que la primera hoja tiene contenido, y guárdalo de nuevo antes de subir.',
      }
    case 'header': {
      const where = err.column ? ` (${err.column})` : ''
      return {
        title: `Hay un problema con la primera fila${where}.`,
        hint: 'Asegúrate de que cada columna tiene un nombre único, sin celdas vacías en la cabecera. Esta fila se usa para etiquetar las columnas del dashboard.',
      }
    }
    case 'row':
      return {
        title: err.row
          ? `No hemos podido procesar la fila ${err.row}.`
          : 'No hemos podido procesar una fila del archivo.',
        hint: 'Revisa esa fila en Excel: suele ser una celda con un formato raro o un carácter especial. Bórrala o limpia su contenido y vuelve a subir.',
      }
    case 'type-detect':
      return {
        title: 'Una columna tiene valores inconsistentes.',
        hint: 'Comprueba que cada columna mezcla un solo tipo de dato (todo números, todo fechas, todo texto). Limpia los valores N/A o las celdas con formato distinto.',
      }
    default:
      return {
        title: err.pretty?.() ?? err.message,
      }
  }
}
