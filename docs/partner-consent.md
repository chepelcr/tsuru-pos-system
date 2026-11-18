# Partner connection identity and consent

The POS connection flow uses the default Tsuru theme before an organization is selected. Application identity belongs to the permission card; it never changes the POS shell or recolors other partners' pages.

For new permission-first requests, the server exposes the complete immutable scope snapshot first. The verified owner approves that snapshot before selecting or creating an organization. The final connection action reuses the recorded receipt; it does not ask for a second checkbox. Changed permissions invalidate the receipt. Existing grants keep their previously approved permissions.

The official Ditsö logos in `public/partners/ditso` are copied from `chepelcr/ditso-design-system` at `d774f6f034231fb3800811e150ad726ef560513e`, `brand/production/logo/ditso-primary.svg` and `ditso-reverse.svg`. A generic identity is shown for applications without a registered asset. The callback destination is matched against the server-registered HTTPS origin and path.

Validation: connection-flow, theme-route and locale tests; style policy, TypeScript and production build. Only development is targeted by this delivery.
