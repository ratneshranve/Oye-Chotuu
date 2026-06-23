export function isNativeLikeShell() {
  if (typeof window === "undefined") return false

  const protocol = String(window.location?.protocol || "").toLowerCase()
  const userAgent = String(window.navigator?.userAgent || "").toLowerCase()

  return (
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView) ||
    protocol === "file:" ||
    userAgent.includes(" wv") ||
    userAgent.includes("; wv") ||
    userAgent.includes("flutterwebview")
  )
}

export function getCurrentAppPath() {
  if (typeof window === "undefined") return "/"

  const hashPath = String(window.location.hash || "").replace(/^#/, "")
  return hashPath.startsWith("/") ? hashPath : (window.location.pathname || "/")
}

export function replaceAppPath(path) {
  if (typeof window === "undefined") return

  const target = String(path || "/")
  if (isNativeLikeShell()) {
    window.location.replace(`#${target.startsWith("/") ? target : `/${target}`}`)
    return
  }

  window.location.replace(target)
}
