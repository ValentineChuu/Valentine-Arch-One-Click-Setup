# Design
A launcher that lets you select apps along with other features with **modes**.
This is a redesign base on a old and failing launcher system.

Toggled with hyprland controls (ags request toggle-launcher)

## Search bar
Search bar is a simple bar with a search icon, followed by the entry / input box. In file mode, add a sort button to the right that switches between sort modes.

## Modes
Modes are switched by typing / followed by the mode name or abbreviation in the search bar.

Modes are:
apps (default): list out apps to be launched. math equations can also be done in the while in app mode, as long as the query is a math equation, for example 1+1. A listing should have the app icon on the left, then the app name and its description under the name.

file (abbr. f): list out files. can also search dir, clicking on dir opens the dir. can limit search result with path name, by default assume /home unless queried for example /.config. right click open in dir with xdg-open. A listing should have the file type icon on the left, then the file name and path under the name.

emoji (abbr. e): list out a grid with flowbox of emojis, clicking on emoji copies to clipboard (util function already exists, need import). hovering show emoji name in tooltips. right clicking save to a favourite grid above the list grid with a gtk seperator in between the two.

search (abbr. s): search the query in browser with xdg-open, and switch focused workspace to the workspace with the broswer. If query **is not** an url, search with google.com, if query **is** an url, for example, youtube.com, directly go to the url. A listing in history should have the url favicon or magnifying glass icon on the left, then the url or query.

## Features
last launched apps, file, and search should be saved to a json in /.cache/ags, when launcher in respective modes, should list out last 5 history (put it as a const so it is configurable). url favicon needs to be saved along with search history. older history should be removed as needed. All history can just be in the same launcher-history.json, favicon can be in a favicon folder.

File and emoji due to having a large list, needs a lazy load system to control the render. History can be listed with `<for>`.

Listing can be zoomed in and out with control + scroll wheel, icon and name / description needs to expand to fit new listing size. Grid can also be zoomed. Cannot zoom out further than original size. In file mode, zooming out goes into grid mode. In grid mode, files are displayed with their file type icon and name under it, hoevering show path in tooltips. Files that can be previewed, images, gifs, video using thumbnail, should have the preview replace the file type icon.

Search bar should not have arrow keys function. Arrows keys should be used to select from list or grid. In list mode, up and down arrow moves up and down, left and right have no function. In grid mode, up and down moves between rows, left and right moves across columns.

In file mode, a sort button is on the right end of the search bar. Toggles bettwen new to old, old to new, alphabetical, and reverse alphabetical. (could include more sort type)

## File structure
in ./widgets/launcher should be the launcher.tsx file for the window, mode switching, etc
in ./widgets/launcher/module should have the app/emoji/file/math/searchResult.tsx files and searchBar.tsx
in ./utils/launcher should have emoji/file/math/search.ts for handling the differnt modes, queryHistory.ts to handle query history (or maybe each mode's util file have their own function for it), lazyload/sort.ts for their features

## Launcher AGS window structure (in launcher.tsx)
*just a guide line, can be changed to adopt to new structure*
```
<window
  name="launcher"
  visible={false}
  application={app}
  anchor={TOP | BOTTOM | LEFT | RIGHT}
  keymode={Astal.Keymode.ON_DEMAND}
  exclusivity={Astal.Exclusivity.IGNORE}
  $={(self) => {
    self.set_default_size(1, 1)

    const click = new Gtk.GestureClick()
    click.connect("released", () => close())
    self.add_controller(click)
  }}
>
  <box
    halign={Gtk.Align.CENTER}
    valign={Gtk.Align.CENTER}
  >
    <box
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["launcher"]}
      widthRequest={500}
      $={(self) => {
        const click = new Gtk.GestureClick()
        click.connect("released", () => {
          click.set_state(Gtk.EventSequenceState.CLAIMED)
        })
        self.add_controller(click)
      }}
    >
      <SearchBar />
      <Gtk.Separator cssClasses={["launcher-separator"]} />

      <Gtk.ScrolledWindow
        vexpand
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        cssClasses={["launcher-scroll"]}
        heightRequest={400}
      >
        <box orientation={Gtk.Orientation.VERTICAL}>
          <box visible={mode(m => m === "apps")} orientation={Gtk.Orientation.VERTICAL}>
            <AppResult />
          </box>

          <box visible={mode(m => m === "emoji")} orientation={Gtk.Orientation.VERTICAL}>
            <EmojiResult />
          </box>

          <box visible={mode(m => m === "file")} orientation={Gtk.Orientation.VERTICAL}>
            <FileResultList >
          </box>

          <box visible={mode(m => m === "search")} orientation={Gtk.Orientation.VERTICAL}>
            <SearchResult >
          </box>
        </box>
      </Gtk.ScrolledWindow>
    </box>
  </box>
</window>
```