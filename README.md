# COLORcheck

Aplikacja PWA do porównania barw L\*a\*b\* (ze spektrofotometru) z zapisanymi wzorami.
Liczy ΔL, Δa, Δb, ΔE76 i ΔE2000. Wzory i pomiary można wpisać ręcznie lub odczytać ze zdjęcia (OCR w przeglądarce).

## Uruchomienie
Otwórz `index.html` przez HTTPS (np. GitHub Pages). Aplikację można zainstalować na ekranie głównym telefonu.

## Testy (opcjonalnie, Node.js)
cd testy, npm i jsdom, potem: node test_color.mjs, node test_page.mjs, node test_seed.mjs, node parse_test.mjs
