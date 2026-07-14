# `server/src/controllers/NotificationController.ts`
**Purpose:** Per-user notification inbox: list, mark one/all as read, delete.
**Language / Size:** TypeScript / 1593 bytes
## Exports
Named exports: `getMyNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`.
## Imports (Internal / External)
- Internal: `../models/Notification` (`Notification`).
- External: `express`.
## Handlers / Functions
- **getMyNotifications(req,res,next)** — Reads `req.user!.id`. `Notification.find({userId}).sort({createdAt:-1}).limit(50)`. `200` array.
- **markAsRead(req,res,next)** — Reads `req.params.id`, `req.user!.id`. `Notification.findOneAndUpdate({_id, userId}, {read:true}, {new:true})`. `404` if null; else `200`.
- **markAllAsRead(req,res,next)** — Reads `req.user!.id`. `Notification.updateMany({userId, read:false}, {read:true})`. `200 {message:'All notifications marked as read'}`.
- **deleteNotification(req,res,next)** — Reads `req.params.id`, `req.user!.id`. `Notification.findOneAndDelete({_id, userId})`. `404` if null; else `200 {message:'Notification deleted successfully'}`.
## Important logic & design patterns
- Direct Mongoose model access (no service layer). Every query scoped by `userId` (ownership enforced in the query itself), so users can only touch their own notifications.
- Inbox capped at 50 most recent.
## Relationships
- Routed by `notificationRoutes.ts` (mounted `/api/notifications`; each route applies `requireAuth`+`requireActive` individually). Real-time SSE subscribe/nav/branding/sounds endpoints live in the route file, not this controller.
- Reads `Notification` model directly.
