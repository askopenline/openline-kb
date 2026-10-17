# Security and Sensitive Reports

This guide covers Openline's company-specific use of this repository. Any preserved upstream security policy continues to apply to the relevant upstream project.

## Report privately

Do not post credentials, activation codes, customer data, private screenshots, exploit payloads against a live system, or database exports in public issues. Use the company's established private contact channel; [ask@openline.com](mailto:ask@openline.com) can be used to request the appropriate Openline contact without sending a secret.

Describe the affected project or surface, the observed behavior, its likely impact, and safe reproduction steps. Share sensitive evidence only after an appropriate private channel is established.

## Scope and handling

- Keep testing within systems and accounts you are authorized to assess.
- Preserve relevant evidence without collecting unnecessary personal information.
- Do not use a production account or data store as a disposable development environment.
- Keep provider credentials in the approved runtime secret mechanism rather than source code.
- Revoke or rotate an exposed credential through its provider; deleting a line from Git does not remove it from history.
- Follow upstream disclosure guidance for a vulnerability in an upstream component.

## Release safety

Check the intended account, environment, destination, and rollback path before changing access, infrastructure, or publication state. Repository visibility, code licensing, and deployment authentication are separate controls.

This document does not create a public bug-bounty program or promise a response-time SLA. The [project README](../README.md) describes the current company-maintained scope.
