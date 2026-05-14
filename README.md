# Klistreverkstedet

Dette er en enkel statisk nettside for Klistreverkstedet.

## Slik legger du inn nye produkter

1. Legg bildet i `assets/images/klistremerker/`.
2. Åpne `assets/data/produkter.json`.
3. Kopier en produktblokk i `products`.
4. Endre `id`, `name`, `price`, `image` og `description`.
5. Last opp endringene til GitHub Pages.

## Slik legger du inn fornøyde kunder

1. Åpne `assets/data/klistreverksted-media.json`.
2. Legg inn nye elementer i `media`.
3. Bruk `src`, `alt`, `title` og `caption`.
4. Last opp endringene til GitHub Pages.

## Slik fungerer bestillingen

- Kundene legger produkter i handlekurven på forsiden.
- Når de trykker send, går handlekurven til Web3Forms.
- Du har allerede lagt inn `access_key` i siden.
- Du trenger bare å ha Web3Forms satt opp på e-posten din i Web3Forms-dashbordet.

## Viktig

- Forsiden viser produkter som bilder.
- `produkter.json` er produktfilen (pris, bilde, navn, tekst).
- `klistreverksted-media.json` brukes for visning av fornøyde kunder i `products.html`.
- Tilbake-knappen til Lænsmann Studio er knyttet til `assets/images/image.png`.
