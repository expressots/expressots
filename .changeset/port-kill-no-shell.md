---
"@expressots/adapter-express": patch
---

The port-conflict recovery in `AppExpress` no longer builds shell command
strings. Port lookup and process termination run through `execFile` argument
arrays (and `process.kill` on POSIX), the port is validated first, and on
Windows only the local-address column of `netstat` is matched.
