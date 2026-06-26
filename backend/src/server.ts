import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { attachRealtime } from "./lib/realtime";
import { prisma } from "./lib/prisma";
import { startAutomationProcessor, stopAutomationProcessor } from "./services/automation.service";
import { startAppointmentReminders, stopAppointmentReminders } from "./services/appointment.service";

const server = createServer(app);
attachRealtime(server);
startAutomationProcessor();
startAppointmentReminders();

server.listen(env.PORT, () => {
  console.log(`ShowPro backend running on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  stopAutomationProcessor();
  stopAppointmentReminders();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
