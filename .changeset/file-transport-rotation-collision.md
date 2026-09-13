---
"@expressots/core": patch
---

FileTransport no longer loses log lines when two size-based rotations happen
within the same millisecond. Rotated filenames now receive a sequence suffix
when the timestamped name (or its `.gz` form) already exists, instead of
renaming over the earlier rotated file.
