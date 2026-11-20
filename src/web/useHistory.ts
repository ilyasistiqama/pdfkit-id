import { useCallback, useState } from 'react'

type Updater<T> = T | ((current: T) => T)

const LIMIT = 40

const resolve = <T,>(current: T, next: Updater<T>): T =>
  typeof next === 'function' ? (next as (value: T) => T)(current) : next

/**
 * State dengan undo/redo. `replace` dipakai saat menggeser (tiap frame) dan
 * `commit` menyimpan satu langkah history saat interaksi selesai.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState({ past: [] as T[], present: initial, future: [] as T[] })

  const set = useCallback((next: Updater<T>) => {
    setState((current) => {
      const value = resolve(current.present, next)
      if (value === current.present) return current
      return {
        past: [...current.past.slice(-LIMIT), current.present],
        present: value,
        future: [],
      }
    })
  }, [])

  const replace = useCallback((next: Updater<T>) => {
    setState((current) => ({ ...current, present: resolve(current.present, next) }))
  }, [])

  const commit = useCallback((snapshot: T) => {
    setState((current) =>
      snapshot === current.present
        ? current
        : {
            past: [...current.past.slice(-LIMIT), snapshot],
            present: current.present,
            future: [],
          },
    )
  }, [])

  const undo = useCallback(() => {
    setState((current) => {
      if (!current.past.length) return current
      return {
        past: current.past.slice(0, -1),
        present: current.past[current.past.length - 1],
        future: [current.present, ...current.future].slice(0, LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((current) => {
      if (!current.future.length) return current
      return {
        past: [...current.past, current.present].slice(-LIMIT),
        present: current.future[0],
        future: current.future.slice(1),
      }
    })
  }, [])

  const reset = useCallback((next: T) => {
    setState({ past: [], present: next, future: [] })
  }, [])

  return {
    value: state.present,
    set,
    replace,
    commit,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
