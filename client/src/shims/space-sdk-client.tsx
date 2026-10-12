// Minimal stand-in for "@hatch/space-sdk/client" so the copied client
// components build outside the Muse artifact runtime. esbuild aliases
// the package name to this file (see build.mjs).
//
// Only SafeAreaTopScrim is needed: Site.tsx renders it above the sticky
// header. On the open web the browser/viewport handles safe areas via
// the tailwindcss-safe-area utilities already in use, so this renders a
// zero-height spacer tinted with the header colour.

export function SafeAreaTopScrim({
  backgroundColor,
}: {
  backgroundColor?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "env(safe-area-inset-top, 0px)",
        backgroundColor: backgroundColor ?? "transparent",
      }}
    />
  );
}
