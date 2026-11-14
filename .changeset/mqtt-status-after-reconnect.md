---
"@charcuterie/server": minor
---

`createMqttService` sets `<base>/status` back after a reconnect. The broker replaced the
retained status with the last will, `{ online: false }`, when the connection dropped, and
nothing published it again, so Home Assistant showed the app offline until it restarted. On
every reconnect the service now republishes the last retained status the app published, or
`{ online: true }`. A status published while the client was disconnected is kept and
published on the reconnect. The new `reconnectPeriodMs` option sets the wait between
attempts (default 5000).
