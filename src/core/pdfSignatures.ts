import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'

const byteRange = PDFName.of('ByteRange')
const contents = PDFName.of('Contents')
const fieldValue = PDFName.of('V')

const isSignature = (value: unknown) => value instanceof PDFDict && value.has(byteRange) && value.has(contents)

/** Detect the signature data without validating it or judging its legal status. */
export async function hasDigitalSignature(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })
  return doc.context.enumerateIndirectObjects().some(([, value]) => isSignature(value)) ||
    (doc.catalog.getAcroForm()?.getAllFields().some(([field]) => isSignature(field.dict.lookup(fieldValue))) ?? false)
}
