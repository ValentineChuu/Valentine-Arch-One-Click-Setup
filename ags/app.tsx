import app from "ags/gtk4/app"
import TopBar from "./widgets/topBar/topBar"
import Settings from "./widgets/setting/setting"
import Notifications from "./widgets/notifications/notification"
import Launcher from "./widgets/launcher/launcher"
import { configCSS } from "./utils/config";
import BigMedia from "./widgets/topBar/modules/media/bigMedia"

app.start({
  requestHandler(request, res) {
    if (request.includes("toggle-launcher")) {
      app.toggle_window("launcher")
      res("ok")
    } else {
      res("unknown command")
    }
  },
  main() {
    app.apply_css(configCSS());
    TopBar()
    BigMedia()
    Settings()
    Notifications()
    Launcher()
  },
})
