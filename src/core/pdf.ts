import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export const PASSWORD_CANCELLED = 'password-dibatalkan'

export type PdfSession = {
  doc: PDFDocumentProxy
  /** lepaskan worker & memori dokumen */
  destroy: () => Promise<void>
}

/** pdf.js "memindahkan" buffer, jadi selalu kirim salinan. */
export async function loadPdf(
  bytes: Uint8Array,
  askPassword?: (retry: boolean) => Promise<string | null>,
): Promise<PdfSession> {
  const task = getDocument({ data: bytes.slice() })
  if (askPassword) {
    task.onPassword = (updatePassword: (password: string | Error) => void, reason: number) => {
      void askPassword(reason === PasswordResponses.INCORRECT_PASSWORD).then((value) => {
        updatePassword(value ?? new Error(PASSWORD_CANCELLED))
      })
    }
  }
  try {
    const doc = await task.promise
    return { doc, destroy: () => task.destroy() }
  } catch (error) {
    await task.destroy()
    throw error
  }
}
