import Gdk from "gi://Gdk"
import Pango from "gi://Pango"
import { createEffect } from "ags"
import { Gtk } from "ags/gtk4"
import {
  FileResult,
  openFile,
  openInFileManager,
  shouldShowPreviews,
  listDirectory,
  updateActiveThumbnails,
} from "../../../utils/launcher/search_result/file"
import { LazyLoader } from "../../../utils/launcher/lazyload"

// ─── Helpers ───

function getBaseClasses(isPreviewing: boolean): string[] {
  return isPreviewing ? ["launcher-file-preview-item"] : ["launcher-app"]
}

function addRightClickHandler(btn: Gtk.Button, file: FileResult): void {
  const gesture = new Gtk.GestureClick({ button: Gdk.BUTTON_SECONDARY })
  gesture.connect("pressed", () => openInFileManager(file))
  btn.add_controller(gesture)
}

// ─── Props ───

interface FileResultListProps {
  files: any
  onSelect: () => void
  selectedIndex: any
  setSelectedIndex: (i: number) => void
  onBrowseDir: (results: FileResult[]) => void
}

// ─── Component ───

export default function FileResultList({
  files,
  onSelect,
  selectedIndex,
  setSelectedIndex,
  onBrowseDir,
}: FileResultListProps) {
  let listContainer: Gtk.Box | null = null
  let gridContainer: Gtk.FlowBox | null = null
  let listLoader: LazyLoader | null = null
  let gridLoader: LazyLoader | null = null
  let currentWidgetButtons: Gtk.Button[] = []
  let lastHighlighted = -1

  // ─── Click handler ───

  const handleClick = (file: FileResult) => {
    if (file.isDir) {
      setSelectedIndex(0)
      onBrowseDir(listDirectory(file.path))
    } else {
      openFile(file.path)
      onSelect()
    }
  }

  // ─── Item builders ───

  const createListItem = (file: FileResult, idx: number): Gtk.Widget => {
    const btn = new Gtk.Button({ cssClasses: ["launcher-app"] })

    const icon = new Gtk.Image({ iconName: file.iconName, pixelSize: 24 })

    const nameLabel = new Gtk.Label({
      halign: Gtk.Align.START,
      cssClasses: ["launcher-app-name"],
      label: file.name,
      singleLineMode: true,
      ellipsize: Pango.EllipsizeMode.END,
    })

    const pathLabel = new Gtk.Label({
      halign: Gtk.Align.START,
      cssClasses: ["launcher-app-desc"],
      label: file.path,
      singleLineMode: true,
      ellipsize: Pango.EllipsizeMode.START,
    })

    const textBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, hexpand: true })
    textBox.append(nameLabel)
    textBox.append(pathLabel)

    const box = new Gtk.Box({ spacing: 8 })
    box.append(icon)
    box.append(textBox)
    btn.set_child(box)

    btn.connect("clicked", () => handleClick(file))
    addRightClickHandler(btn, file)

    const motion = new Gtk.EventControllerMotion()
    motion.connect("enter", () => setSelectedIndex(idx))
    btn.add_controller(motion)

    currentWidgetButtons[idx] = btn
    return btn
  }

  const createGridItem = (file: FileResult, idx: number): Gtk.Widget => {
    const btn = new Gtk.Button({
      cssClasses: ["launcher-file-preview-item"],
      tooltipText: file.path,
    })

    const box = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 4,
      halign: Gtk.Align.CENTER,
    })

    const thumbnail =
      file.previewable && file.thumbnailPath
        ? new Gtk.Image({ file: file.thumbnailPath, cssClasses: ["launcher-file-thumbnail"], pixelSize: 100 })
        : new Gtk.Image({ iconName: file.iconName, pixelSize: 48, cssClasses: ["launcher-file-icon"] })

    const nameLabel = new Gtk.Label({
      label: file.name,
      cssClasses: ["launcher-file-name"],
      halign: Gtk.Align.CENTER,
      singleLineMode: true,
      ellipsize: Pango.EllipsizeMode.MIDDLE,
      maxWidthChars: 16,
    })

    box.append(thumbnail)
    box.append(nameLabel)
    btn.set_child(box)

    btn.connect("clicked", () => handleClick(file))
    addRightClickHandler(btn, file)

    const motion = new Gtk.EventControllerMotion()
    motion.connect("enter", () => setSelectedIndex(idx))
    btn.add_controller(motion)

    currentWidgetButtons[idx] = btn
    return btn
  }

  // ─── Population and highlight ───

  const populateResults = (list: FileResult[]) => {
    currentWidgetButtons = []
    lastHighlighted = -1
    updateActiveThumbnails(list)

    if (shouldShowPreviews(list) && gridLoader && gridContainer) {
      listLoader?.clear()
      gridLoader.load(list, createGridItem)
    } else if (listLoader && listContainer) {
      gridLoader?.clear()
      listLoader.load(list, createListItem)
    }
  }

  const updateHighlight = (idx: number) => {
    const isPreviewing = shouldShowPreviews(files() as FileResult[])

    if (lastHighlighted >= 0 && lastHighlighted < currentWidgetButtons.length) {
      currentWidgetButtons[lastHighlighted]?.set_css_classes(getBaseClasses(isPreviewing))
    }

    if (idx >= 0 && idx < currentWidgetButtons.length) {
      const btn = currentWidgetButtons[idx]
      btn?.set_css_classes([...getBaseClasses(isPreviewing), "launcher-app-selected"])
    }

    lastHighlighted = idx
  }

  // ─── Effects ───

  createEffect(() => populateResults(files() as FileResult[]))
  createEffect(() => updateHighlight(selectedIndex() as number))

  // ─── Render ───

  return (
    <box cssClasses={["launcher-results"]} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <Gtk.FlowBox
        visible={files((list: FileResult[]) => shouldShowPreviews(list))}
        cssClasses={["launcher-file-grid"]}
        homogeneous
        maxChildrenPerLine={3}
        minChildrenPerLine={3}
        selectionMode={Gtk.SelectionMode.NONE}
        $={(self) => {
          gridContainer = self
          gridLoader = new LazyLoader(self, { batchSize: 15 })
        }}
      />

      <box
        visible={files((list: FileResult[]) => !shouldShowPreviews(list) && list.length > 0)}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={2}
        $={(self) => {
          listContainer = self
          listLoader = new LazyLoader(self, { batchSize: 30 })
        }}
      />

      <label
        visible={files((list: FileResult[]) => list.length === 0)}
        label="No files found"
        cssClasses={["launcher-empty"]}
        halign={Gtk.Align.CENTER}
        marginTop={16}
        marginBottom={16}
      />
    </box>
  )
}