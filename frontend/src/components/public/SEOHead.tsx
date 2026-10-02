import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  jsonLd?: object;
}

export function SEOHead({ title, description, jsonLd }: SEOHeadProps) {
  useEffect(() => {
    // 1. Page Title
    document.title = title;

    // 2. Meta description
    let metaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // 3. OpenGraph title
    let ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;

    // 4. OpenGraph description
    let ogDesc = document.querySelector<HTMLMetaElement>("meta[property='og:description']");
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = description;

    // 5. JSON-LD schema script
    if (jsonLd) {
      let script = document.querySelector<HTMLScriptElement>("script[type='application/ld+json']#seo-jsonld");
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "seo-jsonld";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, jsonLd]);

  return null;
}
