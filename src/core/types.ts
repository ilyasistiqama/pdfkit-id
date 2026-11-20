import type { SignRect } from './geometry'

export type Signature = {
  id: string
  dataUrl: string
  /** lebar / tinggi */
  aspect: number
}

export type Placement = {
  id: string
  signatureId: string
  /** 0-based */
  pageIndex: number
  rect: SignRect
}

export type Caption = {
  name: string
  role: string
  date: string
}
