# Revision findings

- `new`: not present in the baseline; inspect first.
- `regressed`: severity or measured violation worsened; inspect first.
- `improved`: still present but quantitatively or semantically better.
- `unchanged`: inherited baseline debt; visible but does not block the revision gate.
- `resolved`: missing from the current report; confirm it was repaired rather than deleted unintentionally.
- `accepted`: matched a reviewed acceptance file entry.

Use `frameproof compare` for already-generated reports. Use `--filmstrip-dir` when both old and new video files are available. Read `docs/REVISION_WORKFLOW.md` for pairing and acceptance details.
