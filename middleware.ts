export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/symptom-check/:path*",
    "/appointments/:path*",
    "/doctor/:path*",
  ],
}
