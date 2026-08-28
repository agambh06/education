import { Router } from "express";
export const notificationsRouter = Router();
notificationsRouter.get("/", (_request, response) =>
  response.json([
    {
      id: "n1",
      type: "ASSIGNMENT",
      title: "משימה חדשה",
      body: "דף תרגול שברים זמין כעת.",
      readAt: null,
      createdAt: new Date().toISOString(),
    },
  ]),
);
