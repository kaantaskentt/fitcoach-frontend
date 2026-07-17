# Security policy

Security fixes are applied to the latest commit on `main`.

Please report suspected vulnerabilities through GitHub's private vulnerability reporting flow. Do not include credentials, personal data, or an unpatched exploit in a public issue.

Include the affected feature or file, reproduction steps, expected impact, and any proposed mitigation. Reports are acknowledged as soon as practical and coordinated before public disclosure.

FitCoach is a browser client backed by an operator-configured n8n workflow. Treat that workflow as a separate trust boundary and review its authentication, rate limiting, logging, and data retention before production use.
