# File Starter

File Starter provides three core capabilities for developers:
- [Data import](./import)
- [Data export](./export)
- [Document export (Word/PDF)](./document)
- Document signing

This document focuses on developer usage and API-level examples.

## Code Structure

- `excel/export/strategy`: export strategy selection and concrete export implementations
- `excel/export/support`: shared export support components such as data fetch, template resolve, writer, upload, and custom export hooks
- `excel/imports`: import pipeline, handler factory, failure collection, persistence, and custom import hook
- `excel/style`: shared Excel style handlers
- `pdf/`: PDF document generators, Noto font provider, and PDF signing helpers (Word, PDF, signing)
- `word/`: Word document generator


## Dependency
```xml
<dependency>
  <groupId>io.softa</groupId>
  <artifactId>file-starter</artifactId>
  <version>${softa.version}</version>
</dependency>
```

## Requirements
- OSS storage (Minio or other supported providers) for template files and generated files.
- Pulsar is required if you use async import.
- Noto fonts are required for PDF generation (RICH_TEXT templates). Run `sh deploy/install-font.sh` to install.
- Database contains file metadata tables and file-starter tables:
  - Import: ImportTemplate, ImportTemplateField, ImportHistory,
  - Export: ExportTemplate, ExportTemplateField, ExportHistory,
  - Document: DocumentTemplate,
  - Signing: SigningRequest, SigningDocument.


## Configuration
### MQ topics (async import)
```yml
mq:
  topics:
    async-import:
      topic: dev_demo_async_import
      sub: dev_demo_async_import_sub
```

### OSS Configuration
```yml
oss:
  type: minio                            # minio | aliyun. A MinIO client also talks to AWS S3.
  endpoint: http://minio:9000            # the address THIS PROCESS connects to
  presign-endpoint: http://localhost:9000 # the address the BROWSER resolves; blank falls back to endpoint
  access-key: minioadmin
  secret-key: minioadmin
  bucket-name: dev-demo
  region:                                # blank falls back to us-east-1; REQUIRED when pointing at AWS S3
  sub-dir:                               # optional prefix inside the bucket
  url-expire-seconds:                    # lifetime of the storage link signed when a file address is opened; blank falls back to 300
```

The bucket is never created for you — the client uploads straight to it, so a missing bucket surfaces as a `NoSuchBucket` failure on the first upload. Create it as a deployment prerequisite.

`url-expire-seconds` sets only the lifetime of the storage link signed when a file address is opened, not how long `FileInfo.url` lasts (see [File addresses and keys](#file-addresses-and-keys)). It used to be ignored, always 300 seconds.

#### `endpoint` vs `presign-endpoint`

A pre-signed URL (the storage link a file address redirects to when it is opened) is fetched by the **browser**, so it must carry a host the browser can resolve — which is not always the address the server connects over. A server reaching MinIO at the docker-network hostname `http://minio:9000`, or Aliyun OSS at an ECS-internal `oss-<region>-internal.aliyuncs.com`, would hand the client a URL pointing at that private address; the download then fails in the browser with nothing in the server log.

The host is part of the SigV4 canonical request (`X-Amz-SignedHeaders=host`), so the URL **cannot be rewritten after signing** without invalidating the signature — it has to be signed against the public address from the start. That is what `presign-endpoint` is for: `endpoint` is used to connect, `presign-endpoint` to sign. Leave it blank whenever `endpoint` is already publicly reachable (AWS S3, a public Aliyun endpoint), which is the common case.

### Storage Policy
- General path: `modelName/uuid/fileName`
- Multi-tenancy path: `tenantId/modelName/uuid/fileName`

### File keys

The keys in `FileInfo.url` are signed with this secret (see [File addresses and keys](#file-addresses-and-keys)):

```yml
file:
  open-key-secret: ${FILE_OPEN_KEY_SECRET:}   # REQUIRED; a random string of at least 32 bytes; the same on every instance
```

- Startup fails when it is blank. Generate one with `openssl rand -base64 48`.
- Every instance must use the same value, the old and new containers of a rolling deploy included; otherwise one rejects the keys another signed.
- Changing it invalidates every key already handed out; a page refresh gets new ones.

The application has to open `/file/open/**` in `permission.authenticated-bypass-patterns`: the permission interceptor cannot derive a model from that path, for the same reason as `/file/uploadFileTo*`. What this opens is the endpoint, not the data: the open endpoint checks the key itself. `/openapi/**` is public already and needs nothing.

## File addresses and keys

`FileInfo.url` (returned when File / MultiFile fields are read, when a file is uploaded and when one is generated) is not a pre-signed storage link but a same-origin relative address carrying a key, made at the moment the data is returned to the front end. It takes one of two forms, depending on whether the request has a logged-in user:

| Request | `FileInfo.url` | Who can open it | Valid for |
|---|---|---|---|
| With a logged-in user | `<context-path>/file/open/<key>` | Only the account it was issued to, with that account's session | 30–31 days |
| Without one: a public page under `/openapi/**`, a scheduled job, a flow nobody triggered | `<context-path>/openapi/file/<key>` | Anyone holding it: it is bound to no one | 1 hour |

- **The key**: `<fileId>.<exp>.<signature>`, e.g. `1987654321098765432.1797206400.G4CHYJkdKbgZABYFb9A1mw`. The signature is HMAC-SHA256 truncated to 128 bits, base64url-encoded. The account is not written into the key: checking it recomputes the signature with the current session's account, so only the account it was issued to gets the same result. Nothing is stored on the server, and no Redis is used.
- **Lifetime**: a user key's exp is UTC midnight of the issue day plus 31 days, so a file's address stays the same all day, and each key opens for 30–31 days.
- **The address**: relative, prefixed with `server.servlet.context-path`; the browser opens it as a same-origin request, with the session.
- **Opening**: the endpoint checks the key, then answers 302 to a storage link signed at that moment (valid for `oss.url-expire-seconds`, default 300 seconds), with `Cache-Control: no-store`. The file is displayed inline by default; with `?download=1` added to the address it is downloaded as an attachment, under its file name. The addresses of generated files, exports and import results carry `?download=1` already.
- **Errors**: one line of plain text, not JSON, since the address is opened directly by an img, an iframe or a new tab. 403: the key was issued to another account (or has been changed); 404: a malformed key, or no such file; 410: expired; 401: a `/file/open/` address opened without a usable session (not signed in, or the session has ended). Other endpoints still answer a missing session with HTTP 200 and JSON; a key address gets 401 instead, so a download never saves that JSON as the file.

### When an address stops opening

Keys are handed out only by reads that were authorized already, so opening one does not check the record's permissions again. For a user key already handed out:

| Case | Result |
|---|---|
| The address is passed to someone else | They cannot open it |
| The person leaves, or the account is frozen | It stops opening as soon as their login lapses |
| The account is rebound to another person (Unbind & Re-invite) | The previous person's sessions are all revoked, so the keys they hold stop opening; the person taking over uses the same account and could see these files anyway |
| The account stays but loses its permission on the record; the attachment is removed from the record | It opens for up to 31 more days (before: 5 minutes). Removing an attachment only unlinks it; the file stays in storage |
| A page left open without a refresh | It stops opening after 30 days; a refresh fixes it |
| The signing secret is changed | Every key stops opening; a refresh fixes it |

### Backend code uses fileIds only

Caches, the database, flow variables and emails hold fileIds only; addresses are made when data is returned to the front end. `FileInfo.url` is for the front end that made the request: backend code never reads it, and uses the fileId for what it needs:

| To | Do |
|---|---|
| Read the content: parse, import, merge, copy | `fileService.downloadStream(fileId)` |
| Send it as a mail attachment | Pass the fileId; the content is read by fileId when the mail is sent. In a flow, use the Send Email node's `attachments`, see [Generated files and email attachments](../flow/automation#generated-files-and-email-attachments) |
| Hand it to an external system that fetches by URL (OCR, AI image recognition, third-party e-signature and the like) | Sign a short-lived storage link by fileId at call time, use it and drop it; never store it |
| Let someone open it later (from the body of a mail, an SMS or an inbox notification) | Put no file address there: send the file as an attachment, or link to the record's page, where the recipient signs in, reads the record and gets a key of their own |

Do not store or send out an address signed in the backend either: without a logged-in user (a scheduled job, a flow nobody triggered) it carries an unbound key that anyone holding it can open, for an hour; in a flow a user triggered it carries that user's key, which opens only in their own browser; and it is relative, so it is of no use outside the browser anyway.
