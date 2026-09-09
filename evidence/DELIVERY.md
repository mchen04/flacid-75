# Delivery and remaining work

## Source integration

Michael authorizes refreshing the repository documentation, pushing the reviewed branch, and squash-merging it into `main`.
This instruction supersedes the original goal's merge ban.
The repository starts this integration without a `main` branch; its existing default is the implementation branch.

The integration creates `main` from one squashed commit with the reviewed branch's exact file tree.
The squash commit message records the source revision.
The implementation branch retains its detailed build, test, and documentation history.
`main` becomes the default source branch after the push.
No pull request is needed for this direct integration.

The [stable preview](https://flaccid75-preview.vercel.app) remains the install endpoint.
Git-triggered deployment is disabled; this source merge does not publish a production deployment.
The owner's private installation note outside Git holds the passphrase.

## Known unfinished work

- Physical iPhone home-screen installation, airplane-mode use, and Safari verification remain unfinished.
- Safe areas, rubber-banding, focus zoom, standalone chrome, and suspension/resume need physical checks.
- Physical camera capture and the required real-device task timings remain unmeasured.
- Native competitor installation/use, piece-by-piece comparisons, and strict mascot/home blind wins remain unfinished.
- The deployed photo check takes about 11 seconds; the brief's “few seconds” target is not proven.
- Photo privacy evidence has the limits listed in the [acceptance record](ACCEPTANCE.md#privacy-and-credential-limits).
- The database credential's initial private tool-output exposure requires rotation; no rotation is recorded.

The merge preserves these gaps. It does not mark the original end-to-end goal complete.
