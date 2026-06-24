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

export function isPublicUserStorefrontPath(path = getCurrentAppPath()) {
  const normalizedPath = String(path || "/").split("?")[0].replace(/\/+$/, "") || "/"

  const protectedPrefixes = [
    "/cart",
    "/profile",
    "/food/user/orders",
    "/food/user/bookings",
    "/food/user/notifications",
    "/food/user/wallet",
    "/food/user/complaints",
    "/food/user/profile/payments",
    "/food/user/profile/favorites",
    "/food/user/profile/report-safety-emergency",
    "/food/user/profile/accessibility",
    "/food/user/profile/logout",
    "/food/user/profile/refer-earn",
    "/quick/orders",
    "/quick/wallet",
    "/quick/returns",
    "/quick/checkout",
    "/quick/profile",
  ]

  if (protectedPrefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return false
  }

  return (
    normalizedPath === "/" ||
    normalizedPath === "/food" ||
    normalizedPath === "/food/user" ||
    normalizedPath.startsWith("/food/user/") ||
    normalizedPath === "/quick" ||
    normalizedPath.startsWith("/quick/") ||
    normalizedPath === "/dudhwala" ||
    normalizedPath.startsWith("/dudhwala/")
  )
}
