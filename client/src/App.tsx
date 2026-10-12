// Route switch: the public homepage, and the admin panel at the /admin
// route (hash form: #/admin). Nothing on the public page links here — the
// panel is reached only by typing the address.

import { useEffect, useState } from "react";
import { Site } from "./Site";
import { AdminApp } from "./Admin";

function currentRoute(): "site" | "admin" {
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  return hash === "admin" ? "admin" : "site";
}

export function App() {
  const [route, setRoute] = useState<"site" | "admin">(() => currentRoute());

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    if (route === "admin") {
      document.title = "Admin — NextGen Laptops";
      window.scrollTo({ top: 0 });
    }
  }, [route]);

  return route === "admin" ? <AdminApp /> : <Site />;
}
