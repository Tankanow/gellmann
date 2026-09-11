# Gellmann for Hermes installed

Enable it if you did not install with `--enable`:

```bash
hermes plugins enable gellmann
```

Restart Hermes or the gateway after enabling.

In shared gateways, restrict `/gellmann` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

Commands:

- `/gellmann [work|solo|off]`
- `/gellmann-work [topic]`
- `/gellmann-solo [topic]`
- `/gellmann-review [target]`
- `/gellmann-help`

Bundled skills are available as `gellmann:gellmann`, `gellmann:gellmann-work`, `gellmann:gellmann-solo`, `gellmann:gellmann-review`, and `gellmann:gellmann-help`.
