# Portfolio autocomplete wiring fix

The FMP search API and verified holding dialog already existed, but `app/portfolio/page.tsx` still rendered its own older inline Add Holding dialog.

This fix:

- removes the legacy inline dialog from `app/portfolio/page.tsx`
- renders `components/dios/holding-dialog.tsx`
- keeps the existing `/api/search` FMP-backed autocomplete
- requires selecting a verified result before saving
- performs a final quote verification before persisting the holding

Expected result: typing `KO` in Portfolio → Add holding displays `KO — The Coca-Cola Company` and other verified matches.
