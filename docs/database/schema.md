# Database Schema (MongoDB / Mongoose)

Source: `server/src/models/*.ts` (per-model docs under `docs/files/server/models/`),
validated at the API boundary by Zod schemas in `server/src/schemas/*.ts`
(docs under `docs/files/server/schemas/`). Data access via
`server/src/repositories/*.ts` and the service layer.

Notation: `field:Type[req][ref->Model][index]{enum}` = default. `[unique]`/`[TTL]` noted inline.

## Collections

### `activities` — `models/Activity.ts`
- ownerId:ObjectId[req][ref->User][index], productId:ObjectId[req][ref->Product][index]
- type:String[req]{feature,improvement,bug-fix}[index], title:String[req], shortDescription:String[req]
- tier:String{free,pro}, tags:[String], priority:String{low,medium,high,critical}, referenceUrl:String
- versionId:ObjectId[ref->Version], relatedIssueIds:[ObjectId][ref->Issue], displayOrder:Number
- mediaType:String{image,gif,video}, mediaUrl:String, mediaUrls:[String]
- items:[{title[req],description,mediaType{image,gif,video},mediaUrl,mediaUrls}] (subdoc `_id:false`)
- activityDate:Date[req][index], assigneeIds:[ObjectId][ref->User][index], estimatedHours:Number, actualHours:Number
- autoTracked:Boolean=false[index], filePath:String
- importSourceKey:String[index], needsReview:Boolean=false[index], reviewReason:String, importConfidence:String{high,medium,low}
- timestamps createdAt/updatedAt
- **Indexes:** compound `{ownerId,activityDate,type}`; **unique partial** `{productId,importSourceKey}` (idempotent WP import).

### `appconfigs` — `models/AppConfig.ts`
- singleton:String[req][unique]='app', data:Mixed[req]={} (Mongoose `minimize:false`), updatedAt. Single document holding the whole app config (edited by the Settings page).

### `auditlogs` — `models/AuditLog.ts` (default-exported)
- action:String[req]{CREATE,UPDATE,DELETE}
- entityType:String[req]{PRODUCT,ACTIVITY,VERSION,MARKETING,ISSUE,TASK,MILESTONE,FEATURE_REQUEST}
- userId:ObjectId[ref->User][index], userName:String
- entityId:ObjectId[req] (no ref — **polymorphic**), entityName:String[req], details:String
- createdAt only (updatedAt disabled).

### `dailylogs` — `models/DailyLog.ts`
- ownerId:ObjectId[req][ref->User][index], note:String[req], createdAt. Compound idx `{ownerId,createdAt:-1}`. (Backs the streak feature.)

### `featurerequests` — `models/FeatureRequest.ts`
- requesterId:ObjectId[req][ref->User][index], title:String[req], description:String=''
- status:String{pending,planned,in-progress,done,declined}=pending[index], adminNote:String='', timestamps.

### `issues` — `models/Issue.ts`
- ownerId:ObjectId[req][ref->User][index], productId:ObjectId[req][ref->Product][index]
- title:String[req], description:String='', status:String{open,in-progress,resolved,closed}=open
- severity:String{low,medium,high,critical}=medium, reporter:String='', reporterEmail:String=''
- source:String{internal,public}=internal, needsReview:Boolean=false, versionLabel:String='', mediaUrls:[String]
- foundAt:Date, resolvedAt:Date, assigneeIds:[ObjectId][ref->User][index], dueDate:Date, estimatedHours:Number, actualHours:Number, timestamps.

### `jobsessions` — `models/JobSession.ts`
- sessionId:String[req][unique], userId:String[req] (no ref), cancelled:Boolean=false
- createdAt:Date=Date.now **[TTL expires:3600]** (auto-expire after 1h). Backs job cancellation/streaming.

### `notifications` — `models/Notification.ts`
- userId:ObjectId[req][ref->User][index], type:String{system,mention}=system
- title:String[req], message:String[req], link:String, read:Boolean=false, createdAt only.

### `products` — `models/Product.ts`
- ownerId:ObjectId[req][ref->User][index], name:String[req], slug:String[req]
- description:String='', githubUrl:String='', banner:String='', icon:String=''
- wpOrgSlug:String='', wpReadme:String='', repoPath:String=''
- publicChangelogEnabled:Boolean=false, publicIssuesEnabled:Boolean=false, listedInDirectory:Boolean=true
- category:String[req]{plugin,block,theme,standalone}[index], status:String{active,inactive}=active[index], timestamps.
- **Unique compound** `{ownerId,slug}` (slug unique per owner; legacy global `slug_1` dropped by seedAndMigrate).

### `productmarketings` — `models/ProductMarketing.ts` (1:1 with Product)
- ownerId:ObjectId[req][ref->User][index], productId:ObjectId[req][ref->Product][**unique**]
- pluginName, trailerVideo, tutorialVideo, wpOrgUrl, docsUrl, heroDescription, thumbnailImage (String='')
- problemList:[String], smarterWayList:[String]
- keyFeatures:[{title,description,list[String],mediaUrl}], allFeatures:[{title,description,list[String]}]
- proFeaturesDesc:String='', demos:[{icon,title,description,category,type,url}]
- topRatingLink:String='', screenshots:[{title,url}], faqs:[{question,answer}], timestamps. All subdocs `_id:false`.

### `users` — `models/User.ts`
- name:String[req][trim], email:String[req][unique][index][lowercase,trim], jobTitle:String=''
- passwordHash:String[req], role:String{admin,user}=user, status:String{pending,active,suspended}=pending
- isRoot:Boolean=false, mustChangePassword:Boolean=false
- passwordResetRequested:Boolean=false, passwordResetRequestedAt:Date, passwordChangedAt:Date
- githubToken:String[**select:false**], githubLogin:String, githubConnectedAt:Date, timestamps.
- **Method** `comparePassword()`; `toJSON` strips passwordHash/githubToken/__v.
- Exports `hashPassword()` + `BCRYPT_ROUNDS` (env `BCRYPT_ROUNDS` clamped 10–15, default 12).

### `versions` — `models/Version.ts`
- ownerId:ObjectId[req][ref->User][index], productId:ObjectId[req][ref->Product][index]
- label:String[req], notes:String='', status:String{released,unreleased}=released, releasedAt:Date
- author:String='', source:String{manual,github}=manual, externalId:String='', externalUrl:String='', timestamps.
- **Unique partial** `{productId,source,externalId}` (idempotent GitHub release sync).

## Zod validation schemas (`server/src/schemas/`)
- **common**: `objectId` (24-hex regex), `idParamSchema` {params.id}.
- **activity** / **activityBulk**: create/update Activity; bulk uses `.strict()` (blocks operator injection); bulk update allow-lists {type,tier,priority,versionId,tags,addTags,removeTags,activityDate,needsReview}.
- **auth**: register(name,email,password≥8), login, emailOnly, changePassword(current,new≥8), updateMe(name?,jobTitle?).
- **changelogGen**: git-range gen; `gitRef` hardened (≤200, no leading `-`, no control chars); `from` required unless rangeType=working.
- **product**: create/update; NOTE `params.id` is unvalidated `z.string()` (unlike others using `objectId`).
- **issue**: create/update + **publicReport** (has `website` honeypot field `max(0)`, `reporterEmail` email-or-empty).
- **marketing**: `.passthrough()` all-optional upsert body.
- **featureRequest**, **version**, **streak**(note trim 3–500), **ai**(task{title,description}), **github**(connect token, sync params).

## Repositories (`server/src/repositories/`)
- **ActivityRepository**: CRUD + paginated `findAll` (limit -1 = all, populates productId/versionId/relatedIssueIds), `findManyByIds`, `bulkUpdate` (allow-lists `$set/$addToSet/$pull`, throws on other operators → NoSQL-injection defense, returns modifiedCount), `bulkDelete`, `reorder`.
- **ProductMarketingRepository**: `findByProductId`, `upsertByProductId` (findOneAndUpdate upsert + setDefaultsOnInsert, forces productId), `deleteByProductId`.
- **ProductRepository**: create, `findAll` (sort createdAt:-1, paginated → {data,totalPages}), findById, update (runValidators), delete. No populate.

## Security-relevant design notes (from source)
- Idempotent import/sync via unique partial indexes (`activities.{productId,importSourceKey}`, `versions.{productId,source,externalId}`).
- Layered NoSQL-injection defense: `activityBulk` `.strict()` + `ActivityRepository.bulkUpdate` operator allow-list.
- `User.githubToken` `select:false` + stripped in `toJSON`; stored encrypted (see `utils/crypto.ts`, `GITHUB_TOKEN_SECRET`).
- Session invalidation on password change via `users.passwordChangedAt` vs JWT `iat` (see `middlewares/auth.ts`).
- `jobsessions` TTL auto-expiry (1h) prevents stale cancellation records accumulating.
- Inconsistency worth flagging: `product.schema` `params.id` is plain `z.string()`, not `objectId`-validated.
