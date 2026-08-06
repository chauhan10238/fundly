FUNDLY TICKER SEARCH SUBMIT FIX

Changed files:
- components/dios/ticker-search.tsx
- app/analyse/page.tsx

Fixes:
- Clicking Search now opens the entered ticker instead of only rerunning autocomplete.
- Enter key uses the same reliable submit path.
- Exact provider matches are preferred; a valid ticker can open directly if autocomplete is unavailable.
- The input now follows the ticker in the URL after navigation.
- Search results and stale text are cleared after selection.

Test:
1. Open /analyse?ticker=GLD.
2. Type SHSP.
3. Click Search.
4. URL must change to /analyse?ticker=SHSP and the analysis heading/chart must refresh.
5. Repeat with KO and press Enter instead of clicking Search.
