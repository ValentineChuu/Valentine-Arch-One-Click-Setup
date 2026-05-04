import GLib from "gi://GLib"
import { Gtk } from "ags/gtk4"

const DEFAULT_BATCH_SIZE = 40

export interface LazyLoaderOptions {
  /** How many items to add per idle batch. Default: 40. */
  batchSize?: number
  /** First batch is synchronous for instant feedback. Default: true. */
  syncFirstBatch?: boolean
}

/**
 * Manages batched widget insertion into a GTK container.
 * Widgets are added in idle batches to prevent UI freezing on large lists.
 *
 * Usage:
 *   const loader = new LazyLoader(container)
 *   loader.load(items, (item, index) => createWidget(item, index))
 */
export class LazyLoader {
  private container: Gtk.FlowBox | Gtk.Box
  private pendingIdleId: number | null = null
  private batchSize: number
  private syncFirstBatch: boolean

  constructor(container: Gtk.FlowBox | Gtk.Box, options?: LazyLoaderOptions) {
    this.container = container
    this.batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
    this.syncFirstBatch = options?.syncFirstBatch ?? true
  }

  /** Remove all children and cancel pending loads. */
  clear(): void {
    if (this.pendingIdleId !== null) {
      GLib.source_remove(this.pendingIdleId)
      this.pendingIdleId = null
    }
    let child = this.container.get_first_child()
    while (child) {
      const next = child.get_next_sibling()
      this.container.remove(child)
      child = next
    }
  }

  /**
   * Load items into the container in batches.
   * @param items The full list of items to load.
   * @param createWidget Factory function that creates a widget for each item.
   * @param onBatchDone Optional callback after each batch with the count loaded so far.
   */
  load<T>(
    items: T[],
    createWidget: (item: T, index: number) => Gtk.Widget,
    onBatchDone?: (loadedCount: number) => void,
  ): void {
    this.clear()

    if (items.length === 0) return

    let loaded = 0

    const addBatch = (sync: boolean): boolean => {
      const end = Math.min(loaded + this.batchSize, items.length)
      for (let i = loaded; i < end; i++) {
        const widget = createWidget(items[i], i)
        if (this.container instanceof Gtk.FlowBox) {
          (this.container as Gtk.FlowBox).append(widget)
        } else {
          (this.container as Gtk.Box).append(widget)
        }
      }
      loaded = end
      if (onBatchDone) onBatchDone(loaded)

      if (loaded < items.length) {
        this.pendingIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          return addBatch(false)
        })
        return false // done with this idle call
      }

      this.pendingIdleId = null
      return false
    }

    // First batch synchronously for instant feedback
    if (this.syncFirstBatch) {
      addBatch(true)
    } else {
      this.pendingIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => addBatch(false))
    }
  }
}