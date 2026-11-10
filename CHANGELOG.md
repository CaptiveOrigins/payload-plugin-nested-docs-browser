# Changelog

## 0.2.0 (2026-11-10)

- **Mask images.** `describe` can mark an image as a one-color icon (`imageMask: true`), such as a silhouette. The browser draws it as a mask in `--ndb-color-image` (default: the theme's primary color, then `currentColor`), so it follows the theme and dark mode. A plain `<img>` would show such an icon in black.
- **Alt text for images.** `describe` can give `imageAlt` ("No photo yet (tortoise)"). With it, an image is announced; without it, it stays decorative, as before. Curated sections take `imageAlt` and `imageMask` too.
- **Unstyled** sites get a mask image as a plain `<img>` with its alt text.
- Breadcrumb entries keep their earlier shape (path, name, everyday name, image, link).

Tested: 26 tests (2 new: a mask image's role, alt text, color and mask; and the unstyled fallback).

## 0.1.0 (2026-11-10)

First release: one level at a time with layouts chosen from counts, Show all everywhere, hide-by-default with a switch, live counts from one aggregation, everyday groups over the tree, and styling hooks.
