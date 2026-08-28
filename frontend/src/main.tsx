import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import App from "./App.tsx";

const theme = createTheme({
  primaryColor: "indigo",
  fontFamily: "DM Sans, sans-serif",
  headings: { fontFamily: "Plus Jakarta Sans, DM Sans, sans-serif" },
  defaultRadius: "md",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-left" />
      <App />
    </MantineProvider>
  </StrictMode>,
);
